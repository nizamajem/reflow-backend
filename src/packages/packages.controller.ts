import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { PackagesService } from "./packages.service";
import type { CredentialUploadFile } from "./packages.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { UpdatePackageDto } from "./dto/update-package.dto";
import { CreatePackageCredentialDto } from "./dto/create-package-credential.dto";
import { UpdatePackageCredentialDto } from "./dto/update-package-credential.dto";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/common/enums/role.enum";
import { FileInterceptor } from "@nestjs/platform-express";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("packages")
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  findAll() {
    return this.packagesService.findAll();
  }

  @Patch(":id")
  @Roles(Role.SuperAdmin)
  update(@Param("id") id: string, @Body() dto: UpdatePackageDto) {
    return this.packagesService.updateSettings(id, dto);
  }

  @Get(":id/credentials")
  @Roles(Role.SuperAdmin)
  findCredentials(@Param("id") id: string) {
    return this.packagesService.findCredentialsByPackage(id);
  }

  @Post(":id/credentials")
  @Roles(Role.SuperAdmin)
  createCredential(@Param("id") id: string, @Body() dto: CreatePackageCredentialDto) {
    return this.packagesService.createCredential(id, dto);
  }

  @Post("credentials/import")
  @Roles(Role.SuperAdmin)
  @UseInterceptors(FileInterceptor("file"))
  importCredentials(@UploadedFile() file: CredentialUploadFile | undefined) {
    return this.packagesService.importCredentialsFromCsv(file);
  }

  @Patch("credentials/:credentialId")
  @Roles(Role.SuperAdmin)
  updateCredential(
    @Param("credentialId") credentialId: string,
    @Body() dto: UpdatePackageCredentialDto
  ) {
    return this.packagesService.updateCredential(credentialId, dto);
  }

  @Delete("credentials/:credentialId")
  @Roles(Role.SuperAdmin)
  async removeCredential(@Param("credentialId") credentialId: string) {
    await this.packagesService.deleteCredential(credentialId);
    return { success: true };
  }
}
