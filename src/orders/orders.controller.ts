import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { CreateOrderDto } from "./dto/create-order.dto";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/common/enums/role.enum";
import { CurrentUser } from "@/common/decorators/current-user.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findAllForUser(user);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.createOrder(dto, user);
  }

  @Delete(":id")
  @Roles(Role.SuperAdmin)
  async remove(@Param("id") id: string) {
    await this.ordersService.deleteGeneratedAccount(id);
    return { success: true };
  }
}

type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
};
