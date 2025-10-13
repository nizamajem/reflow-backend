import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaymentMethod, PAYMENT_METHOD_VALUES } from "@/common/enums/payment-method.enum";
import { PortalSettingsEntity } from "./entities/portal-settings.entity";

type PaymentMethodMap = Record<PaymentMethod, boolean>;

@Injectable()
export class PortalSettingsService {
  private static readonly DEFAULT_ID = "portal-settings-default";

  constructor(
    @InjectRepository(PortalSettingsEntity)
    private readonly repository: Repository<PortalSettingsEntity>
  ) {}

  private async getEntity(): Promise<PortalSettingsEntity> {
    let entity = await this.repository.findOne({ where: { id: PortalSettingsService.DEFAULT_ID } });
    if (!entity) {
      entity = this.repository.create({
        id: PortalSettingsService.DEFAULT_ID,
        paymentMethods: PortalSettingsEntity.defaultPaymentMethods(),
      });
      entity = await this.repository.save(entity);
    }
    return entity;
  }

  async getPaymentMethods(): Promise<PaymentMethodMap> {
    const entity = await this.getEntity();
    return PortalSettingsEntity.normalizePaymentMethods(entity.paymentMethods);
  }

  async updatePaymentMethods(
    updates: Partial<Record<PaymentMethod, boolean>>
  ): Promise<PaymentMethodMap> {
    const entity = await this.getEntity();
    const nextMethods = PortalSettingsEntity.normalizePaymentMethods({
      ...entity.paymentMethods,
      ...updates,
    });

    const hasEnabled = PAYMENT_METHOD_VALUES.some((method) => nextMethods[method]);
    if (!hasEnabled) {
      throw new BadRequestException("At least one payment method must remain enabled.");
    }

    entity.paymentMethods = nextMethods;
    const saved = await this.repository.save(entity);
    return PortalSettingsEntity.normalizePaymentMethods(saved.paymentMethods);
  }
}
