import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { USER_TIER_VALUES, UserTier } from "@/common/enums/user-tier.enum";

export class UpdatePackageCredentialDto {
  @IsOptional()
  @IsIn(USER_TIER_VALUES)
  tier?: UserTier;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
