import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { USER_TIER_VALUES, UserTier } from "@/common/enums/user-tier.enum";
import { PAYMENT_METHOD_VALUES, PaymentMethod } from "@/common/enums/payment-method.enum";

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsIn(USER_TIER_VALUES)
  tier: UserTier;

  @IsIn(PAYMENT_METHOD_VALUES)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @MinLength(8)
  customerPhone: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;
}
