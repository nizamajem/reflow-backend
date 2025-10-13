import { IsBoolean, IsNumber, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { UserTier } from "@/common/enums/user-tier.enum";

class PriceDto {
  @IsOptional()
  @IsNumber()
  student?: number;

  @IsOptional()
  @IsNumber()
  public?: number;
}

export class UpdatePackageDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => PriceDto)
  price?: PriceDto;
}

