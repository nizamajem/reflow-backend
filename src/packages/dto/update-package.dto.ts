import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { Role } from "@/common/enums/role.enum";

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

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
