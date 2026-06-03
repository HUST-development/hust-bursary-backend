import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DatabaseModelNames } from 'src/shared/constants';

export type StockHistoryDocument = StockHistory & Document;

export enum StockActionType {
  CREATE = 'CREATE',
  STOCK_IN = 'STOCK_IN',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class StockHistory extends Document {
  @Prop({ type: Types.ObjectId, ref: DatabaseModelNames.GROCERY_ITEM, required: true, index: true })
  itemId: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(StockActionType), index: true })
  actionType: string;

  @Prop({ required: true, type: Number, min: 0 })
  previousStock: number;

  @Prop({ required: true, type: Number })
  quantityAdded: number;

  @Prop({ required: true, type: Number, min: 0 })
  newStock: number;

  @Prop({ type: Types.ObjectId, ref: DatabaseModelNames.USER, required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: String, trim: true })
  note?: string;

  @Prop({ type: Date, index: true })
  createdAt?: Date;
}

export const StockHistorySchema = SchemaFactory.createForClass(StockHistory);
