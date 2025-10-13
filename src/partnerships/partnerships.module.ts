import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PartnershipsController } from "./partnerships.controller";
import { PartnershipsService } from "./partnerships.service";
import { PartnershipAccountEntity } from "./entities/partnership-account.entity";
import { AuthModule } from "@/auth/auth.module";
import { UsersModule } from "@/users/users.module";

@Module({
  imports: [TypeOrmModule.forFeature([PartnershipAccountEntity]), AuthModule, UsersModule],
  controllers: [PartnershipsController],
  providers: [PartnershipsService],
  exports: [PartnershipsService],
})
export class PartnershipsModule {}
