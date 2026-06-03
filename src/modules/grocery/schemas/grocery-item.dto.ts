import { Type, Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsArray, ValidateNested, IsBoolean, ArrayMinSize } from 'class-validator';
import { GroceryUnitType } from 'grocery.enum';
// import { GroceryUnitType } from '../enums/grocery.enum';

export class GroceryItemVariantDto {
  @IsNotEmpty()
  // @IsEnum(GroceryUnitType)
  unit: GroceryUnitType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return value;
  })
  @IsNumber()
  @Min(0)
  quantityAdded?: number;
}

export class CreateGroceryItemDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  // @IsNotEmpty()
  @IsString()
  @IsOptional()
  description: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        // Attempt to parse the string as JSON.
        return JSON.parse(value);
      } catch (e) {
        // If parsing fails, return the original value to let the IsArray validator catch it.
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroceryItemVariantDto)
  @ArrayMinSize(1)
  variants: GroceryItemVariantDto[];

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateGroceryItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroceryItemVariantDto)
  variants?: GroceryItemVariantDto[];

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true' || value === '1' || value === 'TRUE';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  note?: string;

  // Internal use only - not from frontend
  doneBy?: string;
}
