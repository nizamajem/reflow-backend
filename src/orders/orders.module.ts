import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { GeneratedAccountEntity } from "./entities/generated-account.entity";
import { PackagesModule } from "@/packages/packages.module";
import { AuthModule } from "@/auth/auth.module";
import { PortalSettingsModule } from "@/portal/portal-settings.module";
import { MidtransModule } from "@/midtrans/midtrans.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([GeneratedAccountEntity]),
    PackagesModule,
    AuthModule,
    PortalSettingsModule,
    MidtransModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
