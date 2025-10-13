import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PortalSettingsEntity } from "./entities/portal-settings.entity";
import { PortalSettingsService } from "./portal-settings.service";

@Module({
  imports: [TypeOrmModule.forFeature([PortalSettingsEntity])],
  providers: [PortalSettingsService],
  exports: [PortalSettingsService],
})
export class PortalSettingsModule {}
