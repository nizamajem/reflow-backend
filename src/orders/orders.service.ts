import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { GeneratedAccountEntity } from "./entities/generated-account.entity";
import { PackagesService } from "@/packages/packages.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { PackageCredentialEntity } from "@/packages/entities/package-credential.entity";
import { PaymentMethod } from "@/common/enums/payment-method.enum";
import { UserTier } from "@/common/enums/user-tier.enum";
import { PortalSettingsService } from "@/portal/portal-settings.service";
import { MidtransService } from "@/midtrans/midtrans.service";
import { PackageCredentialResponse } from "@/packages/packages.service";
import { Role } from "@/common/enums/role.enum";

export type GeneratedAccountResponse = {
  id: string;
  packageId: string;
  packageName: string;
  tier: UserTier;
  paymentMethod: PaymentMethod;
  pricePaid: number;
  email: string;
  password: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  credentialId: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  createdByUserEmail?: string;
  createdByUserName?: string;
};

export type PaymentGatewayResponse =
  | {
      provider: "midtrans";
      snapToken: string;
      redirectUrl: string;
      environment: "sandbox" | "production";
      snapScriptUrl: string;
    }
  | undefined;

export type CreateOrderResponse = {
  account: GeneratedAccountResponse;
  credential: PackageCredentialResponse;
  paymentGateway?: PaymentGatewayResponse;
};

type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(GeneratedAccountEntity)
    private readonly accountsRepository: Repository<GeneratedAccountEntity>,
    private readonly packagesService: PackagesService,
    private readonly dataSource: DataSource,
    private readonly portalSettingsService: PortalSettingsService,
    private readonly midtransService: MidtransService
  ) {}

  async findAllForUser(user: AuthenticatedUser): Promise<GeneratedAccountResponse[]> {
    const accounts = await this.accountsRepository.find({
      where: user.role === Role.Partnership ? { createdByUserId: user.id } : undefined,
      relations: ["createdByUser"],
      order: { createdAt: "DESC" },
    });
    return accounts.map((account) => this.mapAccount(account));
  }

  async createOrder(dto: CreateOrderDto, user: AuthenticatedUser): Promise<CreateOrderResponse> {
    const paymentMethods = await this.portalSettingsService.getPaymentMethods();
    if (!paymentMethods[dto.paymentMethod]) {
      throw new BadRequestException("Selected payment method is currently disabled.");
    }

    const midtransEnv = this.midtransService.resolveEnvironment(dto.paymentMethod);
    if (midtransEnv && !this.midtransService.isEnvironmentConfigured(midtransEnv)) {
      throw new BadRequestException(
        `Midtrans ${midtransEnv === "production" ? "production" : "sandbox"} configuration is incomplete.`
      );
    }

    const pkg = await this.packagesService.getPackageEntity(dto.packageId);

    if (!pkg.active) {
      throw new BadRequestException("Package is currently inactive.");
    }

    const credential = await this.packagesService.findAvailableCredential(pkg.id, dto.tier);
    if (!credential) {
      throw new BadRequestException(
        "No credentials are available for the selected package and tier. Please restock and try again."
      );
    }

    const price =
      (pkg.price && typeof pkg.price[dto.tier] === "number" ? pkg.price[dto.tier] : undefined) ??
      pkg.basePrice[dto.tier];

    const result = await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const accountsRepo = manager.getRepository(GeneratedAccountEntity);
      const credentialsRepo = manager.getRepository(PackageCredentialEntity);

      const accountEntity = accountsRepo.create({
        packageId: pkg.id,
        packageName: pkg.name,
        tier: dto.tier,
        paymentMethod: dto.paymentMethod,
        pricePaid: price,
        credentialEmail: credential.email,
        credentialPassword: credential.password,
        customerName: dto.customerName.trim(),
        customerPhone: dto.customerPhone.trim(),
        customerEmail: dto.customerEmail?.trim() || null,
        credentialId: credential.id,
        createdByUserId: user.id,
      });

      const savedAccount = await accountsRepo.save(accountEntity);

      await credentialsRepo.update(
        { id: credential.id },
        {
          used: true,
          usedAt: now,
          assignedAccountId: savedAccount.id,
          updatedAt: now,
        }
      );

      const updatedCredential = await credentialsRepo.findOne({ where: { id: credential.id } });

      return {
        account: savedAccount,
        credential: updatedCredential!,
      };
    });

    this.logger.log(`Generated account ${result.account.id} using credential ${result.credential.id}`);

    const response: CreateOrderResponse = {
      account: this.mapAccount(result.account),
      credential: this.packagesService.mapCredential(result.credential),
    };

    if (midtransEnv) {
      const snapResult = await this.midtransService.createSnapTransaction(midtransEnv, {
        orderId: result.account.id,
        grossAmount: price,
        customer: {
          name: dto.customerName.trim() || "Customer",
          email: dto.customerEmail?.trim() || undefined,
          phone: dto.customerPhone.trim() || undefined,
        },
      });

      response.paymentGateway = {
        provider: "midtrans",
        snapToken: snapResult.token,
        redirectUrl: snapResult.redirectUrl,
        environment: snapResult.environment,
        snapScriptUrl: this.midtransService.getSnapScriptUrl(snapResult.environment),
      };
    }

    return response;
  }

  mapAccount(account: GeneratedAccountEntity): GeneratedAccountResponse {
    return {
      id: account.id,
      packageId: account.packageId,
      packageName: account.packageName,
      tier: account.tier,
      paymentMethod: account.paymentMethod,
      pricePaid: Number(account.pricePaid),
      email: account.credentialEmail,
      password: account.credentialPassword,
      customerName: account.customerName,
      customerPhone: account.customerPhone,
      customerEmail: account.customerEmail ?? undefined,
      credentialId: account.credentialId,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      createdByUserId: account.createdByUserId ?? null,
      createdByUserEmail: account.createdByUser?.email ?? undefined,
      createdByUserName: account.createdByUser?.name ?? undefined,
    };
  }

  async deleteGeneratedAccount(id: string): Promise<void> {
    const account = await this.accountsRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Generated account ${id} not found`);
    }

    await this.dataSource.transaction(async (manager) => {
      const accountsRepo = manager.getRepository(GeneratedAccountEntity);
      const credentialsRepo = manager.getRepository(PackageCredentialEntity);

      if (account.credentialId) {
        const now = new Date();
        await credentialsRepo.update(
          { id: account.credentialId },
          {
            used: false,
            usedAt: null,
            assignedAccountId: null,
            updatedAt: now,
          }
        );
      }

      await accountsRepo.delete(id);
    });

    this.logger.log(`Deleted generated account ${id} and released credential ${account.credentialId}`);
  }
}
