import { Controller, Get, Patch, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VendorOrderService } from './vendor-order.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../../shared/constants';

@ApiTags('Vendor Grocery Orders')
@ApiBearerAuth()
@Controller('api/v1/grocery/vendor/orders')
@UseGuards(JwtUserAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorOrdersController {
  constructor(private readonly vendorOrderService: VendorOrderService) {}

  @Get()
  @ApiOperation({ summary: 'List active orders to prepare (VENDOR)' })
  async getOrdersToPrepare(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.vendorOrderService.getOrdersForVendor(req.user.id, status, page, limit);
  }

  @Get('by-code/:orderCode')
  @ApiOperation({ summary: 'Lookup order by 4-character order code (VENDOR)' })
  async getOrderByCode(@Param('orderCode') orderCode: string) {
    return this.vendorOrderService.getOrderByCode(orderCode);
  }

  @Patch(':orderId/ready')
  @ApiOperation({ summary: 'Mark order as READY_FOR_PICKUP (VENDOR)' })
  async markOrderAsReady(@Req() req: any, @Param('orderId') orderId: string) {
    return this.vendorOrderService.markOrderAsReady(orderId, req.user.id);
  }

  @Patch(':orderId/complete')
  @ApiOperation({ summary: 'Verify code and mark order as COMPLETED (VENDOR)' })
  async markOrderAsCompleted(@Req() req: any, @Param('orderId') orderId: string, @Body('orderCode') orderCode: string) {
    return this.vendorOrderService.markOrderAsCompleted(orderId, req.user.id, orderCode);
  }
}
