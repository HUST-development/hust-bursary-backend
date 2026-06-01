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
  @IsBoolean()
  isActive?: boolean;
}
