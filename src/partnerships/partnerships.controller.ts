import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PartnershipsService } from "./partnerships.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { CreatePartnershipAccountDto } from "./dto/create-partnership-account.dto";
import { UpdatePartnershipAccountDto } from "./dto/update-partnership-account.dto";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/common/enums/role.enum";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("partnerships")
export class PartnershipsController {
  constructor(private readonly partnershipsService: PartnershipsService) {}

  @Get()
  @Roles(Role.SuperAdmin)
  findAll() {
    return this.partnershipsService.findAll();
  }

  @Post()
  @Roles(Role.SuperAdmin)
  create(@Body() dto: CreatePartnershipAccountDto) {
    return this.partnershipsService.create(dto);
  }

  @Patch(":id")
  @Roles(Role.SuperAdmin)
  update(@Param("id") id: string, @Body() dto: UpdatePartnershipAccountDto) {
    return this.partnershipsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.SuperAdmin)
  async remove(@Param("id") id: string) {
    await this.partnershipsService.remove(id);
    return { success: true };
  }
}
