import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { GroceryOrderStatus } from '../../shared/constants';
import { Types } from 'mongoose';

@Injectable()
export class VendorOrderService {
  private readonly logger = new Logger(VendorOrderService.name);

  constructor(
    @Inject('GroceryOrderRepository') private readonly orderRepo: any,
    @Inject('OrderHistoryRepository') private readonly historyRepo: any,
  ) {}

  async getOrdersForVendor(vendorId: string, status?: string, page: number = 1, limit: number = 10) {
    // If no specific status is requested, fetch both PAID and READY_FOR_PICKUP orders by default
    const query: any = {};
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: [GroceryOrderStatus.PAID, GroceryOrderStatus.READY_FOR_PICKUP, GroceryOrderStatus.PENDING] };
    }

    const skip = (page - 1) * limit;

    return this.orderRepo.findAllAndPopulate(
      query,
      [{ path: 'items.groceryItemId', select: '', as: 'itemDetails' }], // Leaves select empty to return all fields in GroceryItem
      { paidAt: 1 },
      skip,
      limit,
    );
  }

  async getOrderByCode(orderCode: string) {
    const order = await this.orderRepo.findOneAndPopulate({ orderCode }, [{ path: 'items.groceryItemId', select: '' }]);
    if (!order) throw new NotFoundException(`Order with code ${orderCode} not found`);
    return order;
  }

  async markOrderAsReady(orderId: string, vendorId: string) {
    const order = await this.orderRepo.findOne({ _id: new Types.ObjectId(orderId) });
    if (!order) throw new NotFoundException('Order not found');

    // if (order.status !== GroceryOrderStatus.PAID) {
    //   throw new BadRequestException('Only PAID orders can be marked as ready for pickup');
    // }

    const updatedOrder = await this.orderRepo.update(new Types.ObjectId(orderId), { status: GroceryOrderStatus.READY_FOR_PICKUP });

    await this.historyRepo.create({
      orderId: order._id,
      previousStatus: GroceryOrderStatus.PAID,
      newStatus: GroceryOrderStatus.READY_FOR_PICKUP,
      changedBy: vendorId,
      reason: 'Marked ready by vendor',
    });

    return updatedOrder;
  }

  async markOrderAsCompleted(orderId: string, vendorId: string, orderCode: string, paymentMethod: string) {
    const order = await this.orderRepo.findOne({ _id: orderId });
    if (!order) throw new NotFoundException('Order not found');

    // if (order.status !== GroceryOrderStatus.READY_FOR_PICKUP) {
    //   throw new BadRequestException('Order must be READY_FOR_PICKUP before it can be completed');
    // }

    console.log('orderCode', orderCode, order.orderCode);

    if (order.orderCode !== orderCode) {
      throw new BadRequestException('Invalid order code provided');
    }

    const updatedOrder = await this.orderRepo.update(new Types.ObjectId(orderId), {
      status: GroceryOrderStatus.COMPLETED,
      completedAt: new Date(),
      paymentMethod: order.paymentMethod === 'online' ? 'online' : paymentMethod,
    });

    await this.historyRepo.create({
      orderId: order._id,
      previousStatus: GroceryOrderStatus.READY_FOR_PICKUP,
      newStatus: GroceryOrderStatus.COMPLETED,
      changedBy: vendorId,
      reason: 'Order picked up and completed',
    });

    return updatedOrder;
  }
}
