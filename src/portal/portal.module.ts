import { Module } from "@nestjs/common";
import { PortalController } from "./portal.controller";
import { PortalService } from "./portal.service";
import { PackagesModule } from "@/packages/packages.module";
import { OrdersModule } from "@/orders/orders.module";
import { PartnershipsModule } from "@/partnerships/partnerships.module";
import { AuthModule } from "@/auth/auth.module";
import { PortalSettingsController } from "./portal-settings.controller";
import { MidtransModule } from "@/midtrans/midtrans.module";
import { PortalSettingsModule } from "./portal-settings.module";

@Module({
  imports: [
    PackagesModule,
    OrdersModule,
    PartnershipsModule,
    AuthModule,
    MidtransModule,
    PortalSettingsModule,
  ],
  controllers: [PortalController, PortalSettingsController],
  providers: [PortalService],
})
export class PortalModule {}
