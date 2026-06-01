import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { AddToCartDto } from './schemas/grocery-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @Inject('GroceryCartRepository') private readonly cartRepo: any,
    @Inject('GroceryItemRepository') private readonly itemRepo: any,
  ) {}

  async getCart(studentId: string) {
    let cart = await this.cartRepo.findOne({ studentId });
    if (!cart) {
      cart = await this.cartRepo.create({ studentId, items: [] });
    }
    return cart;
  }

  async addToCart(studentId: string, dto: AddToCartDto) {
    const item = await this.itemRepo.findOne({ _id: dto.groceryItemId });

    if (!item) {
      throw new NotFoundException('Grocery item not found');
    }
    if (!item.isActive) {
      throw new BadRequestException('Grocery item is currently unavailable');
    }

    const variant = item.variants?.find((v: any) => v.unit === dto.unit);
    if (!variant) {
      throw new BadRequestException(`Unit ${dto.unit} is not available for this item`);
    }
    if (!variant.isActive) {
      throw new BadRequestException(`Unit ${dto.unit} for this item is currently unavailable`);
    }
    if (variant.currentQuantity < dto.quantity) {
      throw new BadRequestException('Insufficient stock available');
    }

    let cart = await this.cartRepo.findOne({ studentId });
    if (!cart) {
      cart = await this.cartRepo.create({ studentId, items: [] });
    }

    // Check if item already exists in the cart
    const existingItemIndex = cart.items.findIndex(
      (cartItem: any) => cartItem.groceryItemId.toString() === dto.groceryItemId && cartItem.unit === dto.unit,
    );

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + dto.quantity;
      if (variant.currentQuantity < newQuantity) {
        throw new BadRequestException('Insufficient stock available for the requested total quantity');
      }
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      cart.items.push({
        groceryItemId: dto.groceryItemId,
        unit: dto.unit,
        quantity: dto.quantity,
        addedAt: new Date(),
      });
    }

    // Save updated cart
    return this.cartRepo.update(cart._id.toString(), { items: cart.items });
  }

  async removeFromCart(studentId: string, groceryItemId: string, unit?: string) {
    const cart = await this.cartRepo.findOne({ studentId });
    if (!cart) throw new NotFoundException('Cart not found');

    const initialLength = cart.items.length;
    if (unit) {
      cart.items = cart.items.filter((cartItem: any) => !(cartItem.groceryItemId.toString() === groceryItemId && cartItem.unit === unit));
    } else {
      cart.items = cart.items.filter((cartItem: any) => cartItem.groceryItemId.toString() !== groceryItemId);
    }

    if (cart.items.length === initialLength) throw new NotFoundException('Item not found in cart');

    return this.cartRepo.update(cart._id.toString(), { items: cart.items });
  }

  async clearCart(studentId: string) {
    const cart = await this.cartRepo.findOne({ studentId });
    if (cart) return this.cartRepo.update(cart._id.toString(), { items: [] });
    return null;
  }

  async getCartTotal(studentId: string) {
    const cart = await this.cartRepo.findOne({ studentId });
    let total = 0;
    const processingFee = 10;

    if (!cart || !cart.items.length) return { total, processingFee, grandTotal: processingFee };

    for (const cartItem of cart.items) {
      const item = await this.itemRepo.findOne({ _id: cartItem.groceryItemId });
      if (item) {
        const variant = item.variants?.find((v: any) => v.unit === cartItem.unit);
        if (variant) {
          total += variant.price * cartItem.quantity;
        }
      }
    }

    return { total, processingFee, grandTotal: total + processingFee };
  }
}
