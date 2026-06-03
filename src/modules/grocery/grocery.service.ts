import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CreateGroceryItemDto, UpdateGroceryItemDto } from './schemas/grocery-item.dto';
import { Types } from 'mongoose';
import { UploadService } from '../cloudinary/cloudinary.service';
import { Repositories } from 'src/shared/enums';
import { StockActionType } from './schemas/stock-history.schema';

@Injectable()
export class GroceryService {
  constructor(
    @Inject('GroceryItemRepository') private readonly groceryItemRepo: any,
    @Inject(Repositories.GroceryStockHistoryRepository) private readonly stockHistoryRepo: any,
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

  async createItem(dto: CreateGroceryItemDto, file?: any, userId?: string) {
    if (file) {
      const image = await this.uploadService.uploadImage(file, dto.name, 'grocery-items');
      dto.imageUrl = image.secure_url;
    }

    if (dto.variants) {
      dto.variants = typeof dto.variants === 'string' ? JSON.parse(dto.variants) : dto.variants;
    }

    const createdItem = await this.groceryItemRepo.create(dto);

    // Create initial stock history record for each variant with currentQuantity
    if (createdItem && createdItem.variants && createdItem.variants.length > 0) {
      for (const variant of createdItem.variants) {
        const initialQuantity = variant.currentQuantity || 0;
        if (initialQuantity > 0) {
          await this.stockHistoryRepo.create({
            itemId: createdItem._id,
            actionType: StockActionType.CREATE,
            previousStock: 0,
            quantityAdded: initialQuantity,
            newStock: initialQuantity,
            createdBy: userId ? new Types.ObjectId(userId) : null,
            note: dto.note || `Initial stock for variant: ${variant.unit}`,
          });
        }
      }
    }

    return createdItem;
  }

  async updateItem(id: string, dto: UpdateGroceryItemDto, file?: any) {
    // Verify item exists
    const existingItem = await this.getItemById(id);
    const itemId = new Types.ObjectId(id);

    // Handle file upload if provided
    if (file) {
      const image = await this.uploadService.uploadImage(file, dto?.name || Date.now().toString(), 'grocery-items');
      dto.imageUrl = image.secure_url;
    }

    // Parse variants if provided as string
    if (dto.variants) {
      dto.variants = typeof dto.variants === 'string' ? JSON.parse(dto.variants) : dto.variants;
    }

    // Separate stock-related updates from metadata updates
    const { note, doneBy, ...metadataUpdate } = dto;

    // Build the complete update payload
    const updatePayload: any = {};
    if (metadataUpdate.name !== undefined) updatePayload.name = metadataUpdate.name;
    if (metadataUpdate.description !== undefined) updatePayload.description = metadataUpdate.description;
    if (metadataUpdate.imageUrl !== undefined) updatePayload.imageUrl = metadataUpdate.imageUrl;
    if (metadataUpdate.isActive !== undefined) updatePayload.isActive = metadataUpdate.isActive;

    // Track stock updates for history records
    const stockUpdates: Array<{
      variantIndex: number;
      unit: string;
      previousQuantity: number;
      quantityAdded: number;
      newQuantity: number;
    }> = [];

    // Handle variants (metadata + per-variant stock updates)
    if (metadataUpdate.variants !== undefined) {
      const updatedVariants = metadataUpdate.variants.map((newVariant, index) => {
        const existingVariant = existingItem.variants?.[index];
        const existingQuantity = existingVariant?.currentQuantity || 0;

        // Extract quantityAdded if provided
        const { quantityAdded, ...variantData } = newVariant as any;

        // Apply stock addition if quantityAdded is provided
        let finalQuantity = existingQuantity;
        if (quantityAdded !== undefined && quantityAdded > 0) {
          finalQuantity = existingQuantity + quantityAdded;

          // Track this stock update for history
          stockUpdates.push({
            variantIndex: index,
            unit: newVariant.unit,
            previousQuantity: existingQuantity,
            quantityAdded,
            newQuantity: finalQuantity,
          });
        }

        // Return variant with updated quantity
        return {
          ...variantData,
          currentQuantity: finalQuantity,
        };
      });

      updatePayload.variants = updatedVariants;
    }

    // Perform the update if there are any changes
    if (Object.keys(updatePayload).length > 0) {
      await this.groceryItemRepo.update(itemId, updatePayload);
    }

    // Create stock history records for each variant that was updated
    if (stockUpdates.length > 0) {
      for (const update of stockUpdates) {
        await this.stockHistoryRepo.create({
          itemId: itemId,
          actionType: StockActionType.STOCK_IN,
          previousStock: update.previousQuantity,
          quantityAdded: update.quantityAdded,
          newStock: update.newQuantity,
          createdBy: doneBy ? new Types.ObjectId(doneBy) : null,
          note: note ? `${note} (${update.unit})` : `Stock addition for variant: ${update.unit}`,
        });
      }
    }

    // Fetch and return the updated item
    const updatedItem = await this.groceryItemRepo.findOne({ _id: itemId });
    if (!updatedItem) {
      throw new NotFoundException(`Grocery item with ID ${id} not found`);
    }
    return updatedItem;
  }

  async deleteItem(id: string) {
    const item = await this.groceryItemRepo.update(new Types.ObjectId(id), { isActive: false });
    if (!item) {
      throw new NotFoundException(`Grocery item with ID ${id} not found`);
    }
    return item;
  }

  /**
   * Get stock history for an item
   * @param id - The grocery item ID
   * @param page - Page number for pagination
   * @param limit - Number of records per page
   * @returns Paginated stock history
   */
  async getItemHistory(id: string, page: number = 1, limit: number = 10) {
    // Verify item exists
    await this.getItemById(id);

    const itemId = new Types.ObjectId(id);
    const query = { itemId };

    const result = await this.stockHistoryRepo.findAll(query, { page, limit, sort: { createdAt: -1 } });

    // Handle pagination response
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

    // If findAll returns just an array
    let total = Array.isArray(result) ? result.length : 0;
    try {
      if (typeof this.stockHistoryRepo.countDocuments === 'function') {
        total = await this.stockHistoryRepo.countDocuments(query);
      } else if (typeof this.stockHistoryRepo.count === 'function') {
        total = await this.stockHistoryRepo.count(query);
      } else if (this.stockHistoryRepo.model && typeof this.stockHistoryRepo.model.countDocuments === 'function') {
        total = await this.stockHistoryRepo.model.countDocuments(query);
      }
    } catch (error) {
      // fallback
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
}
