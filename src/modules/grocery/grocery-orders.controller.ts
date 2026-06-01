import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto, VerifyPaymentDto } from './schemas/grocery-order.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../../shared/constants';

@ApiTags('Grocery Orders')
@Controller('api/v1/grocery/orders')
export class GroceryOrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from current cart or items directly (Public)' })
  async createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    const studentId = req?.user?.id;
    return this.orderService.createOrder(dto, studentId);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtUserAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'List student orders (STUDENT)' })
  async getMyOrders(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    return this.orderService.getAllOrdersForStudent(req.user.id, page, limit, status);
  }

  @Get(':orderId')
  // @ApiBearerAuth()
  // @UseGuards(JwtUserAuthGuard, RolesGuard)
  // @Roles(UserRole.STUDENT, UserRole.VENDOR)
  @ApiOperation({ summary: 'Get details of a specific order (STUDENT, VENDOR)' })
  async getOrderDetails(@Param('orderId') orderId: string) {
    return this.orderService.getOrder(orderId);
  }

  @Post(':orderId/payment/initiate')
  @ApiOperation({ summary: 'Initiate interswitch payment for an order (Public)' })
  async initiatePayment(@Param('orderId') orderId: string) {
    return this.orderService.initiatePayment(orderId);
  }

  @Post(':orderId/payment/verify')
  @ApiOperation({ summary: 'Verify payment for an order (Public)' })
  async verifyPayment(@Param('orderId') orderId: string, @Body() dto: VerifyPaymentDto) {
    dto.orderId = orderId; // Enforce URL parameter overrides
    return this.orderService.verifyPayment(dto);
  }

  @Get(':orderId/history')
  // @ApiBearerAuth()
  // @UseGuards(JwtUserAuthGuard, RolesGuard)
  // @Roles(UserRole.STUDENT, UserRole.VENDOR)
  @ApiOperation({ summary: 'View order status history (STUDENT, VENDOR)' })
  async getOrderHistory(@Param('orderId') orderId: string) {
    return this.orderService.getOrderHistory(orderId);
  }
}
