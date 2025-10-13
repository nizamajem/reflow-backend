import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PackagesService } from "./packages.service";
import { PackagesController } from "./packages.controller";
import { PackageEntity } from "./entities/package.entity";
import { PackageCredentialEntity } from "./entities/package-credential.entity";
import { AuthModule } from "@/auth/auth.module";

@Module({
  imports: [TypeOrmModule.forFeature([PackageEntity, PackageCredentialEntity]), AuthModule],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
