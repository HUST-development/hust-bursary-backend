import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CreateOrderDto, VerifyPaymentDto } from './schemas/grocery-order.dto';
import { PaymentService } from './payment.service';
import { GroceryOrderStatus } from 'src/shared/constants';
import { Types } from 'mongoose';
// import { GroceryOrderStatus } from '../../../shared/constants';

type AdminGroceryOrdersQuery = {
  page?: string | number;
  limit?: string | number;
  days?: string | number;
  status?: string;
  studentId?: string;
  customerEmail?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
};

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly revenueStatuses = [GroceryOrderStatus.PAID, GroceryOrderStatus.READY_FOR_PICKUP, GroceryOrderStatus.COMPLETED];

  constructor(
    @Inject('GroceryOrderRepository') private readonly orderRepo: any,
    @Inject('GroceryCartRepository') private readonly cartRepo: any,
    @Inject('GroceryItemRepository') private readonly itemRepo: any,
    @Inject('OrderHistoryRepository') private readonly historyRepo: any,
    private readonly paymentService: PaymentService,
  ) {}

  async createOrder(dto: CreateOrderDto, reqStudentId?: string) {
    const finalStudentId = reqStudentId || dto.studentId;
    this.logger.log(`Creating order for student: ${finalStudentId || 'GUEST'}`);

    let totalAmount = 0;
    const processingFee = 10;
    const orderItems: any[] = [];
    const validatedItems: any[] = [];

    // PASS 1: Validate all items first so we don't partially deduct stock if a later item fails
    for (const itemDto of dto.items) {
      const groceryItem = await this.itemRepo.findOne({ _id: itemDto.groceryItemId });

      if (!groceryItem || !groceryItem.isActive) {
        throw new BadRequestException(`Item ${itemDto.groceryItemId} is unavailable`);
      }

      const variant = groceryItem.variants?.find((v: any) => v.unit === itemDto.unit);
      if (!variant) {
        throw new BadRequestException(`Unit ${itemDto.unit} is not available for ${groceryItem.name}`);
      }
      if (!variant.isActive) {
        throw new BadRequestException(`Unit ${itemDto.unit} for ${groceryItem.name} is currently unavailable`);
      }
      if (variant.currentQuantity < itemDto.quantity) {
        throw new BadRequestException(`Insufficient stock for ${groceryItem.name} (${itemDto.unit})`);
      }

      validatedItems.push({ groceryItem, variant, itemDto });
    }

    // PASS 2: Calculate totals and Reserve (deduct) inventory
    for (const { groceryItem, variant, itemDto } of validatedItems) {
      // Reserve stock immediately using atomic decrement
      await this.itemRepo.model.updateOne(
        { _id: groceryItem._id, 'variants.unit': itemDto.unit },
        { $inc: { 'variants.$.currentQuantity': -itemDto.quantity } },
      );

      const subtotal = variant.price * itemDto.quantity;
      totalAmount += subtotal;

      orderItems.push({
        groceryItemId: groceryItem._id,
        unit: itemDto.unit,
        quantity: itemDto.quantity,
        unitPrice: variant.price,
        subtotal,
      } as any);
    }

    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const orderCode = this.paymentService.generateOrderCode();

    // Create the order
    const newOrder = await this.orderRepo.create({
      orderId,
      ...(finalStudentId && { studentId: finalStudentId }),
      items: orderItems,
      totalAmount,
      processingFee,
      orderCode,
      status: GroceryOrderStatus.PENDING,
      customerEmail: dto?.customerEmail || '',
    });

    if (finalStudentId) {
      // Clear the user's cart after creating the order
      const cart = await this.cartRepo.findOne({ studentId: finalStudentId });
      if (cart) {
        await this.cartRepo.update(cart._id.toString(), { items: [] });
      }
    }

    // Record history
    await this.historyRepo.create({
      orderId: newOrder._id,
      newStatus: GroceryOrderStatus.PENDING,
      changedBy: finalStudentId || null,
      reason: 'Order Created',
    });

    return newOrder;
  }

  async initiatePayment(orderId: string) {
    const order = await this.orderRepo.findOne({ _id: orderId });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== GroceryOrderStatus.PENDING) {
      throw new BadRequestException('Order is not in a pending state');
    }

    const amountToPay = order.totalAmount + order.processingFee;
    const paymentData = await this.paymentService.initiatePayment(order.orderId, amountToPay);

    await this.orderRepo.update(new Types.ObjectId(orderId), { paymentReference: paymentData.paymentReference });

    return { ...paymentData, orderId: order.orderId };
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    const order = await this.orderRepo.findOneAndPopulate({ orderId: dto.orderId }, [
      { path: 'items.groceryItemId', select: '', as: 'itemDetails' },
    ]);
    if (!order) throw new NotFoundException('Order not found');

    // if (order.status === GroceryOrderStatus.PAID) {
    //   return order; // Already paid
    // }

    const response = await this.paymentService.verifyPayment(dto.paymentReference, order.totalAmount + order.processingFee);

    if (response.success) {
      const updatedOrder = await this.orderRepo.update(new Types.ObjectId(order._id), {
        status: GroceryOrderStatus.PAID,
        paidAt: new Date(response?.date || Date.now()),
        paymentMethod: 'online',
      });

      await this.historyRepo.create({
        orderId: order._id,
        previousStatus: GroceryOrderStatus.PENDING,
        newStatus: GroceryOrderStatus.PAID,
        changedBy: order.studentId || null,
        reason: 'Payment Successful',
      });

      return { ...order.toJSON(), status: GroceryOrderStatus.PAID, paidAt: new Date(response?.date || Date.now()) };
    } else {
      // RESTORE STOCK: Payment failed, give the reserved stock back
      for (const item of order.items) {
        // Atomic increment to restore stock safely
        await this.itemRepo.model.updateOne(
          { _id: item.groceryItemId, 'variants.unit': item.unit },
          { $inc: { 'variants.$.currentQuantity': item.quantity } },
        );
      }

      const updatedOrder = await this.orderRepo.update(new Types.ObjectId(order._id), {
        status: GroceryOrderStatus.CANCELLED,
      });

      await this.historyRepo.create({
        orderId: order._id,
        previousStatus: GroceryOrderStatus.PENDING,
        newStatus: GroceryOrderStatus.CANCELLED,
        changedBy: order.studentId || null,
        reason: 'Payment Failed',
      });

      // throw new BadRequestException('Payment verification failed. Order cancelled.');
      return { ...order.toJSON(), status: GroceryOrderStatus.CANCELLED };
    }
  }

  async getOrder(orderId: string) {
    const order = await this.orderRepo.findOneAndPopulate({ orderId: orderId }, [
      { path: 'items.groceryItemId', select: '', as: 'itemDetails' },
    ]);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getOrderHistory(orderId: string) {
    return this.historyRepo.findAll({ orderId });
  }

  async getAllOrdersForStudent(studentId: string, page: number = 1, limit: number = 10, status?: string) {
    const query: any = { studentId };
    if (status) query.status = status;

    return this.orderRepo.findAll(query, { page, limit, sort: { createdAt: -1 } });
  }

  async getAllOrdersForAdmin(query: AdminGroceryOrdersQuery = {}) {
    const page = this.toPositiveInteger(query.page, 1);
    const limit = Math.min(this.toPositiveInteger(query.limit, 10), 100);
    const filter = this.buildAdminOrdersFilter(query);

    const sort = this.buildAdminOrderSort(query.sortBy, query.sortOrder);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.orderRepo.findAllAndPopulate(
        filter,
        [
          { path: 'studentId', select: 'firstName lastName email matricNumber role' },
          { path: 'items.groceryItemId', select: 'name description imageUrl variants' },
        ],
        sort,
        skip,
        limit,
      ),
      this.orderRepo.count(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async getAdminOrderStats(query: AdminGroceryOrdersQuery = {}) {
    const filter = this.buildAdminOrdersFilter(query);
    const orderTotalExpression = { $add: ['$totalAmount', '$processingFee'] };
    const revenueExpression = {
      $cond: [{ $in: ['$status', this.revenueStatuses] }, orderTotalExpression, 0],
    };

    const [result] = await this.orderRepo.aggregate([
      { $match: filter },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalOrderAmount: { $sum: '$totalAmount' },
                totalProcessingFees: { $sum: '$processingFee' },
                totalOrderValue: { $sum: orderTotalExpression },
                totalRevenue: { $sum: revenueExpression },
                averageOrderValue: { $avg: orderTotalExpression },
                studentOrders: { $sum: { $cond: [{ $ifNull: ['$studentId', false] }, 1, 0] } },
                guestOrders: { $sum: { $cond: [{ $ifNull: ['$studentId', false] }, 0, 1] } },
                uniqueStudentIds: { $addToSet: '$studentId' },
              },
            },
          ],
          itemTotals: [
            { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: null,
                totalItemsOrdered: { $sum: { $ifNull: ['$items.quantity', 0] } },
              },
            },
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalOrderValue: { $sum: orderTotalExpression },
                revenue: { $sum: revenueExpression },
              },
            },
          ],
          byPaymentMethod: [
            {
              $group: {
                _id: { $ifNull: ['$paymentMethod', 'unknown'] },
                count: { $sum: 1 },
                totalOrderValue: { $sum: orderTotalExpression },
                revenue: { $sum: revenueExpression },
              },
            },
          ],
          topItems: [
            { $unwind: '$items' },
            {
              $group: {
                _id: {
                  groceryItemId: '$items.groceryItemId',
                  unit: '$items.unit',
                },
                quantity: { $sum: '$items.quantity' },
                totalAmount: { $sum: '$items.subtotal' },
                orderCount: { $sum: 1 },
              },
            },
            { $sort: { quantity: -1, totalAmount: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'groceryitems',
                localField: '_id.groceryItemId',
                foreignField: '_id',
                as: 'item',
              },
            },
            { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                groceryItemId: '$_id.groceryItemId',
                unit: '$_id.unit',
                name: '$item.name',
                imageUrl: '$item.imageUrl',
                quantity: 1,
                totalAmount: 1,
                orderCount: 1,
              },
            },
          ],
        },
      },
    ]);

    const summary = result?.summary?.[0] || {};
    const itemTotals = result?.itemTotals?.[0] || {};
    const ordersByStatus = this.mapBreakdown(result?.byStatus, 'count', Object.values(GroceryOrderStatus), 0);
    const revenueByStatus = this.mapBreakdown(result?.byStatus, 'revenue', Object.values(GroceryOrderStatus), 0);
    const ordersByPaymentMethod = this.mapBreakdown(result?.byPaymentMethod, 'count');
    const revenueByPaymentMethod = this.mapBreakdown(result?.byPaymentMethod, 'revenue');

    return {
      message: 'Admin grocery order statistics retrieved successfully',
      dateRange: this.getDateRangeFromFilter(filter),
      stats: {
        totalOrders: summary.totalOrders || 0,
        pendingOrders: ordersByStatus[GroceryOrderStatus.PENDING],
        paidOrders: ordersByStatus[GroceryOrderStatus.PAID],
        readyForPickupOrders: ordersByStatus[GroceryOrderStatus.READY_FOR_PICKUP],
        completedOrders: ordersByStatus[GroceryOrderStatus.COMPLETED],
        cancelledOrders: ordersByStatus[GroceryOrderStatus.CANCELLED],
        studentOrders: summary.studentOrders || 0,
        guestOrders: summary.guestOrders || 0,
        uniqueStudents: this.countNonEmptyValues(summary.uniqueStudentIds),
        totalItemsOrdered: itemTotals.totalItemsOrdered || 0,
        totalOrderAmount: summary.totalOrderAmount || 0,
        totalProcessingFees: summary.totalProcessingFees || 0,
        totalOrderValue: summary.totalOrderValue || 0,
        totalRevenue: summary.totalRevenue || 0,
        averageOrderValue: Math.round((summary.averageOrderValue || 0) * 100) / 100,
      },
      ordersByStatus,
      revenueByStatus,
      ordersByPaymentMethod,
      revenueByPaymentMethod,
      topItems: result?.topItems || [],
    };
  }

  async getAdminDailyOrderStats(query: AdminGroceryOrdersQuery = {}) {
    const filter = this.buildAdminOrdersFilter(query);
    const days = Math.min(this.toPositiveInteger(query.days, 30), 365);

    if (!filter.createdAt) {
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);

      filter.createdAt = { $gte: startDate, $lte: endDate };
    } else {
      filter.createdAt.$gte = filter.createdAt.$gte || this.subtractDays(filter.createdAt.$lte || new Date(), days - 1);
      filter.createdAt.$lte = filter.createdAt.$lte || new Date();
    }

    const orderTotalExpression = { $add: ['$totalAmount', '$processingFee'] };
    const revenueExpression = {
      $cond: [{ $in: ['$status', this.revenueStatuses] }, orderTotalExpression, 0],
    };

    const data = await this.orderRepo.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'Africa/Lagos',
            },
          },
          totalOrders: { $sum: 1 },
          totalOrderAmount: { $sum: '$totalAmount' },
          totalProcessingFees: { $sum: '$processingFee' },
          totalOrderValue: { $sum: orderTotalExpression },
          totalRevenue: { $sum: revenueExpression },
          pendingOrders: { $sum: { $cond: [{ $eq: ['$status', GroceryOrderStatus.PENDING] }, 1, 0] } },
          paidOrders: { $sum: { $cond: [{ $eq: ['$status', GroceryOrderStatus.PAID] }, 1, 0] } },
          readyForPickupOrders: { $sum: { $cond: [{ $eq: ['$status', GroceryOrderStatus.READY_FOR_PICKUP] }, 1, 0] } },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', GroceryOrderStatus.COMPLETED] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', GroceryOrderStatus.CANCELLED] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalOrders: 1,
          totalOrderAmount: 1,
          totalProcessingFees: 1,
          totalOrderValue: 1,
          totalRevenue: 1,
          pendingOrders: 1,
          paidOrders: 1,
          readyForPickupOrders: 1,
          completedOrders: 1,
          cancelledOrders: 1,
        },
      },
    ]);

    return {
      message: 'Admin daily grocery order statistics retrieved successfully',
      dateRange: this.getDateRangeFromFilter(filter),
      data: this.fillDailyStatsGaps(filter.createdAt.$gte, filter.createdAt.$lte, data),
    };
  }

  private buildAdminOrdersFilter(query: AdminGroceryOrdersQuery = {}) {
    const filter: any = {};

    if (query.status) {
      const status = query.status.trim();
      if (!Object.values(GroceryOrderStatus).includes(status as GroceryOrderStatus)) {
        throw new BadRequestException(`Invalid status. Allowed values: ${Object.values(GroceryOrderStatus).join(', ')}`);
      }
      filter.status = status;
    }

    if (query.studentId) {
      if (!Types.ObjectId.isValid(query.studentId)) {
        throw new BadRequestException('studentId must be a valid MongoDB ObjectId');
      }
      filter.studentId = new Types.ObjectId(query.studentId);
    }

    if (query.customerEmail) {
      filter.customerEmail = { $regex: this.escapeRegex(query.customerEmail.trim()), $options: 'i' };
    }

    if (query.paymentMethod) {
      filter.paymentMethod = query.paymentMethod.trim();
    }

    const dateFilter = this.buildCreatedAtFilter(query.startDate, query.endDate);
    if (dateFilter) {
      filter.createdAt = dateFilter;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      const regex = { $regex: this.escapeRegex(search), $options: 'i' };
      filter.$or = [{ orderId: regex }, { orderCode: regex }, { customerEmail: regex }, { paymentReference: regex }];

      if (Types.ObjectId.isValid(search)) {
        const objectId = new Types.ObjectId(search);
        filter.$or.push({ _id: objectId }, { studentId: objectId });
      }
    }

    return filter;
  }

  private toPositiveInteger(value: string | number | undefined, fallback: number) {
    const parsed = typeof value === 'number' ? value : parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private buildCreatedAtFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) {
      return null;
    }

    const filter: any = {};

    if (startDate) {
      filter.$gte = this.parseQueryDate(startDate, false);
    }

    if (endDate) {
      filter.$lte = this.parseQueryDate(endDate, true);
    }

    if (filter.$gte && filter.$lte && filter.$gte > filter.$lte) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    return filter;
  }

  private parseQueryDate(value: string, endOfDay: boolean) {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let date: Date;

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0,
      );
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Date filters must be valid dates');
    }

    return date;
  }

  private buildAdminOrderSort(sortBy?: string, sortOrder?: string) {
    const allowedSortFields = ['createdAt', 'updatedAt', 'paidAt', 'completedAt', 'totalAmount', 'status'];
    const selectedSortBy = sortBy || 'createdAt';

    if (!allowedSortFields.includes(selectedSortBy)) {
      throw new BadRequestException(`Invalid sortBy. Allowed values: ${allowedSortFields.join(', ')}`);
    }

    return { [selectedSortBy]: sortOrder === 'asc' ? 1 : -1 };
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private mapBreakdown(items: any[] = [], valueKey: string, defaultKeys: string[] = [], fallback = 0) {
    const mapped = defaultKeys.reduce(
      (acc, key) => {
        acc[key] = fallback;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const item of items) {
      mapped[item._id || 'unknown'] = item[valueKey] || fallback;
    }

    return mapped;
  }

  private countNonEmptyValues(values?: any[]) {
    if (!Array.isArray(values)) {
      return 0;
    }

    return values.filter(Boolean).length;
  }

  private getDateRangeFromFilter(filter: any) {
    return {
      startDate: filter.createdAt?.$gte?.toISOString?.() || null,
      endDate: filter.createdAt?.$lte?.toISOString?.() || null,
    };
  }

  private subtractDays(date: Date, days: number) {
    const value = new Date(date);
    value.setDate(value.getDate() - days);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private fillDailyStatsGaps(startDate: Date, endDate: Date, data: any[]) {
    const keyedData = new Map(data.map((item) => [item.date, item]));
    const filledData: any[] = [];
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= endDate) {
      const date = this.formatDateKey(cursor);
      filledData.push(
        keyedData.get(date) || {
          date,
          totalOrders: 0,
          totalOrderAmount: 0,
          totalProcessingFees: 0,
          totalOrderValue: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          paidOrders: 0,
          readyForPickupOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
        },
      );

      cursor.setDate(cursor.getDate() + 1);
    }

    return filledData;
  }

  private formatDateKey(date: Date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }
}
