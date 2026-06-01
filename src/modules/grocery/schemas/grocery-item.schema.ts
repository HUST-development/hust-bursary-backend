import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { GroceryUnitType } from 'grocery.enum';

@Schema({ _id: false })
export class GroceryItemVariant {
  @Prop({ required: true })
  unit: GroceryUnitType;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0, default: 0 })
  currentQuantity: number;

  @Prop({ default: true })
  isActive: boolean;
}

@Schema({ timestamps: true })
export class GroceryItem extends Document {
  @Prop({ required: true, unique: true, sparse: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: [GroceryItemVariant], required: true })
  variants: GroceryItemVariant[];

  @Prop()
  imageUrl: string;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const GroceryItemSchema = SchemaFactory.createForClass(GroceryItem);
