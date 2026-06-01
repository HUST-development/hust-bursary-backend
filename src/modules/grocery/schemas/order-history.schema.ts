import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GroceryOrderStatus } from 'grocery.enum';

@Schema({ timestamps: { createdAt: 'changedAt', updatedAt: false } })
export class OrderHistory extends Document {
  @Prop({ type: Types.ObjectId, ref: 'GroceryOrder', required: true })
  orderId: string;

  @Prop({ enum: GroceryOrderStatus })
  previousStatus: GroceryOrderStatus;

  @Prop({ enum: GroceryOrderStatus, required: true })
  newStatus: GroceryOrderStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  changedBy: string;

  @Prop()
  reason: string;
}

export const OrderHistorySchema = SchemaFactory.createForClass(OrderHistory);
