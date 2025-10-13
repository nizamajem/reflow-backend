import { Controller, Get, UseGuards } from "@nestjs/common";
import { PortalService } from "./portal.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/common/enums/role.enum";

type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("portal")
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get("state")
  getState(@CurrentUser() user: AuthenticatedUser) {
    return this.portalService.getState(user);
  }
}
