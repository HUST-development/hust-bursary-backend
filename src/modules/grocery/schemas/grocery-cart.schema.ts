import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GroceryUnitType } from 'grocery.enum';

@Schema({ _id: false })
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: 'GroceryItem', required: true })
  groceryItemId: string;

  @Prop({ required: true, enum: GroceryUnitType })
  unit: GroceryUnitType;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ default: Date.now })
  addedAt: Date;
}

@Schema({ timestamps: true })
export class GroceryCart extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  studentId: string;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];
}

export const GroceryCartSchema = SchemaFactory.createForClass(GroceryCart);
