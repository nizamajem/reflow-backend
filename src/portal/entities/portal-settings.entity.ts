import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { PaymentMethod, PAYMENT_METHOD_VALUES } from "@/common/enums/payment-method.enum";

type PaymentMethodMap = Record<PaymentMethod, boolean>;

const DEFAULT_PAYMENT_METHODS: PaymentMethodMap = {
  cash: true,
  midtrans_sandbox: false,
  midtrans_production: false,
};

@Entity({ name: "portal_settings" })
export class PortalSettingsEntity {
  @PrimaryColumn()
  id: string;

  @Column({ type: "jsonb", name: "payment_methods", default: () => `'${JSON.stringify(DEFAULT_PAYMENT_METHODS)}'` })
  paymentMethods: PaymentMethodMap;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  static defaultPaymentMethods(): PaymentMethodMap {
    return { ...DEFAULT_PAYMENT_METHODS };
  }

  static normalizePaymentMethods(
    methods: Partial<Record<PaymentMethod, boolean>> | null | undefined
  ): PaymentMethodMap {
    const normalized: PaymentMethodMap = { ...DEFAULT_PAYMENT_METHODS };
    if (methods) {
      for (const method of PAYMENT_METHOD_VALUES) {
        if (typeof methods[method] === "boolean") {
          normalized[method] = methods[method] as boolean;
        }
      }
    }
    return normalized;
  }
}
