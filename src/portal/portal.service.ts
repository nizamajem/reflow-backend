import { Injectable } from "@nestjs/common";
import { PackagesService } from "@/packages/packages.service";
import { OrdersService } from "@/orders/orders.service";
import { PartnershipsService } from "@/partnerships/partnerships.service";
import { Role } from "@/common/enums/role.enum";
import { PackageCredentialResponse, PackageResponse } from "@/packages/packages.service";
import { PortalSettingsService } from "./portal-settings.service";
import { MidtransService } from "@/midtrans/midtrans.service";

type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
};

type CredentialStock = Record<
  string,
  {
    student: number;
    public: number;
  }
>;

@Injectable()
export class PortalService {
  constructor(
    private readonly packagesService: PackagesService,
    private readonly ordersService: OrdersService,
    private readonly partnershipsService: PartnershipsService,
    private readonly portalSettingsService: PortalSettingsService,
    private readonly midtransService: MidtransService
  ) {}

  async getState(user: AuthenticatedUser) {
    const [packages, credentials, generatedAccounts, paymentMethods] = await Promise.all([
      this.packagesService.findAll(),
      this.packagesService.findAllCredentials(),
      this.ordersService.findAllForUser(user),
      this.portalSettingsService.getPaymentMethods(),
    ]);

    const credentialStock = this.calculateCredentialStock(credentials);

    const response: {
      packages: PackageResponse[];
      packageCredentials: PackageCredentialResponse[];
      partnershipAccounts: Awaited<ReturnType<typeof this.partnershipsService.findAll>>;
      generatedAccounts: typeof generatedAccounts;
      credentialStock: CredentialStock;
      paymentMethods: Awaited<ReturnType<typeof this.portalSettingsService.getPaymentMethods>>;
      paymentGateways: {
        midtrans: {
          sandboxClientKey: string | null;
          productionClientKey: string | null;
        };
      };
    } = {
      packages:
        user.role === Role.Partnership
          ? packages.filter((pkg) => pkg.active)
          : packages,
      packageCredentials: [],
      partnershipAccounts: [],
      generatedAccounts,
      credentialStock,
      paymentMethods,
      paymentGateways: {
        midtrans: this.midtransService.getClientKeys(),
      },
    };

    if (user.role === Role.SuperAdmin) {
      response.packageCredentials = credentials;
      response.partnershipAccounts = await this.partnershipsService.findAll();
    }

    return response;
  }

  private calculateCredentialStock(credentials: PackageCredentialResponse[]): CredentialStock {
    return credentials.reduce<CredentialStock>((acc, credential) => {
      if (credential.used) {
        return acc;
      }
      if (!acc[credential.packageId]) {
        acc[credential.packageId] = { student: 0, public: 0 };
      }
      acc[credential.packageId][credential.tier] += 1;
      return acc;
    }, {});
  }
}
