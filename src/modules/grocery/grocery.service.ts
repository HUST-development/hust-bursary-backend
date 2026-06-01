import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CreateGroceryItemDto, UpdateGroceryItemDto } from './schemas/grocery-item.dto';
import { Types } from 'mongoose';
import { UploadService } from '../cloudinary/cloudinary.service';

@Injectable()
export class GroceryService {
  constructor(
    @Inject('GroceryItemRepository') private readonly groceryItemRepo: any,
    @Inject() private readonly uploadService: UploadService,
  ) {}

  async getAllItems(isActive?: boolean, page: number = 1, limit: number = 10, search?: string) {
    const query: any = {};

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const result = await this.groceryItemRepo.findAll(query, { page, limit });

    // If the base repository already handles pagination formatting, normalize it
    if (result && !Array.isArray(result) && result.data !== undefined) {
      const total = result.total || result.data.length;
      return {
        data: result.data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    // If findAll returns just an array, manually fetch the count to ensure pagination is fully accounted for
    let total = Array.isArray(result) ? result.length : 0;
    try {
      if (typeof this.groceryItemRepo.countDocuments === 'function') {
        total = await this.groceryItemRepo.countDocuments(query);
      } else if (typeof this.groceryItemRepo.count === 'function') {
        total = await this.groceryItemRepo.count(query);
      } else if (this.groceryItemRepo.model && typeof this.groceryItemRepo.model.countDocuments === 'function') {
        total = await this.groceryItemRepo.model.countDocuments(query);
      }
    } catch (error) {
      // fallback to array length if count fails
    }

    const data = Array.isArray(result) ? result : [];

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getItemById(id: string) {
    const item = await this.groceryItemRepo.findOne({ _id: new Types.ObjectId(id) });
    if (!item) {
      throw new NotFoundException(`Grocery item with ID ${id} not found`);
    }
    return item;
  }

  async createItem(dto: CreateGroceryItemDto, file?: any) {
    if (file) {
      const image = await this.uploadService.uploadImage(file, dto.name, 'grocery-items');
      dto.imageUrl = image.secure_url;
    }
    return this.groceryItemRepo.create(dto);
  }

  async updateItem(id: string, dto: UpdateGroceryItemDto, file?: any) {
    if (file) {
      const image = await this.uploadService.uploadImage(file, dto?.name || Date.now().toString(), 'grocery-items');
      dto.imageUrl = image.secure_url;
    }
    if (dto.variants) dto.variants = JSON.parse(dto.variants as any);
    const item = await this.groceryItemRepo.update(new Types.ObjectId(id), dto);
    if (!item) {
      throw new NotFoundException(`Grocery item with ID ${id} not found`);
    }
    return item;
  }

  async deleteItem(id: string) {
    const item = await this.groceryItemRepo.update(new Types.ObjectId(id), { isActive: false });
    if (!item) {
      throw new NotFoundException(`Grocery item with ID ${id} not found`);
    }
    return item;
  }

  // async uploadItemImage(file: any, itemId: string) {
  //   // Verify item exists
  //   await this.getItemById(itemId);

  //   // Note: To be replaced with actual Cloudinary upload logic when CloudinaryService is injected
  //   const imageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

  //   return this.groceryItemRepo.update(new Types.ObjectId(itemId), { imageUrl });
  // }
}
