import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GroceryOrderStatus } from '../../shared/constants';

@Injectable()
export class GroceryCronService {
  private readonly logger = new Logger(GroceryCronService.name);

  constructor(
    @Inject('GroceryOrderRepository') private readonly orderRepo: any,
    @Inject('OrderHistoryRepository') private readonly historyRepo: any,
    @Inject('GroceryItemRepository') private readonly itemRepo: any,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cancelStalePendingOrders() {
    this.logger.log('Running cron job to cancel stale pending grocery orders...');

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const staleOrders = await this.orderRepo.findAll({
      status: GroceryOrderStatus.PENDING,
      createdAt: { $lt: twentyFourHoursAgo },
    });

    if (staleOrders && staleOrders.length > 0) {
      for (const order of staleOrders) {
        // RESTORE STOCK: Give the reserved stock back for timed out orders
        for (const item of order.items) {
          // Atomic increment to restore stock safely
          await this.itemRepo.model.updateOne(
            { _id: item.groceryItemId, 'variants.unit': item.unit },
            { $inc: { 'variants.$.currentQuantity': item.quantity } },
          );
        }

        await this.orderRepo.update(order._id, { status: GroceryOrderStatus.CANCELLED });

        await this.historyRepo.create({
          orderId: order._id,
          previousStatus: GroceryOrderStatus.PENDING,
          newStatus: GroceryOrderStatus.CANCELLED,
          changedBy: 'SYSTEM',
          reason: 'Auto-cancelled due to payment timeout (24h)',
        });
      }
      this.logger.log(`Successfully cancelled ${staleOrders.length} stale orders.`);
    }
  }
}
