export const PAYMENT_METHOD_VALUES = ["cash", "midtrans_sandbox", "midtrans_production"] as const;

export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number];
