import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CreateOrderDto, VerifyPaymentDto } from './schemas/grocery-order.dto';
import { PaymentService } from './payment.service';
import { GroceryOrderStatus } from 'src/shared/constants';
import { Types } from 'mongoose';
// import { GroceryOrderStatus } from '../../../shared/constants';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

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
}
