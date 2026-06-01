import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { GroceryUnitType } from 'grocery.enum';

class OrderItemDto {
  @IsNotEmpty()
  @IsMongoId()
  groceryItemId: string;

  @IsNotEmpty()
  // @IsEnum(GroceryUnitType)
  unit: GroceryUnitType;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class VerifyPaymentDto {
  @IsNotEmpty()
  @IsString()
  paymentReference: string;

  @IsNotEmpty()
  @IsString()
  orderId: string;
}
