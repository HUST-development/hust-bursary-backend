import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GroceryOrderStatus, GroceryUnitType } from 'grocery.enum';

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'GroceryItem', required: true })
  groceryItemId: string;

  @Prop({ required: true })
  unit: GroceryUnitType;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;
}

@Schema({ timestamps: true })
export class GroceryOrder extends Document {
  @Prop({ required: true, unique: true, index: true })
  orderId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  studentId?: string;

  @Prop({ sparse: true })
  customerEmail?: string;

  @Prop({ type: [OrderItem], required: true })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ unique: true, sparse: true })
  orderCode: string;

  @Prop({ required: true, enum: GroceryOrderStatus, default: GroceryOrderStatus.PENDING, index: true })
  status: GroceryOrderStatus;

  @Prop()
  paymentReference: string;

  @Prop({ required: true, default: 10 })
  processingFee: number;

  @Prop()
  paidAt: Date;

  @Prop()
  completedAt: Date;
}

export const GroceryOrderSchema = SchemaFactory.createForClass(GroceryOrder);
