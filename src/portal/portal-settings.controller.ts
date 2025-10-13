import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { PortalSettingsService } from "./portal-settings.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/common/enums/role.enum";
import { UpdatePaymentMethodsDto } from "./dto/update-payment-methods.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("portal/settings")
export class PortalSettingsController {
  constructor(private readonly portalSettingsService: PortalSettingsService) {}

  @Get("payment-methods")
  async findPaymentMethods() {
    return this.portalSettingsService.getPaymentMethods();
  }

  @Patch("payment-methods")
  @Roles(Role.SuperAdmin)
  async updatePaymentMethods(@Body() dto: UpdatePaymentMethodsDto) {
    return this.portalSettingsService.updatePaymentMethods(dto);
  }
}
