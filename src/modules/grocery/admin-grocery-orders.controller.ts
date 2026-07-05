import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/shared/constants';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrderService } from './order.service';

@ApiTags('Admin Grocery Orders')
@ApiBearerAuth()
@Controller('api/v1/grocery/admin/orders')
@UseGuards(JwtUserAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminGroceryOrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all grocery orders for admin (ADMIN)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PAID', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'] })
  @ApiQuery({ name: 'studentId', required: false, description: 'Filter by student/user MongoDB ObjectId' })
  @ApiQuery({ name: 'customerEmail', required: false, description: 'Filter guest/customer email with partial match' })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: ['pos', 'cash', 'bank_transfer', 'online'] })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-07-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-07-05' })
  @ApiQuery({ name: 'search', required: false, description: 'Search orderId, orderCode, customerEmail, paymentReference, or ObjectId' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'paidAt', 'completedAt', 'totalAmount', 'status'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getAllOrders(@Query() query: Record<string, string>) {
    return this.orderService.getAllOrdersForAdmin(query);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get grocery order summary statistics for admin (ADMIN)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PAID', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'] })
  @ApiQuery({ name: 'studentId', required: false, description: 'Filter by student/user MongoDB ObjectId' })
  @ApiQuery({ name: 'customerEmail', required: false, description: 'Filter guest/customer email with partial match' })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: ['pos', 'cash', 'bank_transfer', 'online'] })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-07-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-07-05' })
  @ApiQuery({ name: 'search', required: false, description: 'Search orderId, orderCode, customerEmail, paymentReference, or ObjectId' })
  async getOrderStats(@Query() query: Record<string, string>) {
    return this.orderService.getAdminOrderStats(query);
  }

  @Get('stats/daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get daily grocery order statistics for admin charts (ADMIN)' })
  @ApiQuery({ name: 'days', required: false, example: 30, description: 'Default lookback when no date range is supplied' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PAID', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'] })
  @ApiQuery({ name: 'studentId', required: false, description: 'Filter by student/user MongoDB ObjectId' })
  @ApiQuery({ name: 'customerEmail', required: false, description: 'Filter guest/customer email with partial match' })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: ['pos', 'cash', 'bank_transfer', 'online'] })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-07-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-07-05' })
  @ApiQuery({ name: 'search', required: false, description: 'Search orderId, orderCode, customerEmail, paymentReference, or ObjectId' })
  async getDailyOrderStats(@Query() query: Record<string, string>) {
    return this.orderService.getAdminDailyOrderStats(query);
  }
}
