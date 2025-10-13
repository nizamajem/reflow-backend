import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from "class-validator";
import { USER_TIER_VALUES, UserTier } from "@/common/enums/user-tier.enum";

export class CreatePackageCredentialDto {
  @IsIn(USER_TIER_VALUES)
  tier: UserTier;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
