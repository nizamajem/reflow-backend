import { IsBoolean, IsOptional } from "class-validator";

export class UpdatePaymentMethodsDto {
  @IsOptional()
  @IsBoolean()
  cash?: boolean;

  @IsOptional()
  @IsBoolean()
  midtrans_sandbox?: boolean;

  @IsOptional()
  @IsBoolean()
  midtrans_production?: boolean;
}
