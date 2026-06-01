import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { GroceryUnitType } from 'grocery.enum';

export class AddToCartDto {
  @IsNotEmpty()
  @IsMongoId()
  groceryItemId: string;

  @IsNotEmpty()
  @IsEnum(GroceryUnitType)
  unit: GroceryUnitType;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}
