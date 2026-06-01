import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
// import { CartService } from './services/cart.service';
import { AddToCartDto } from './schemas/grocery-cart.dto';
// import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../../shared/constants';
import { CartService } from './cart.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Grocery Cart')
@ApiBearerAuth()
@Controller('api/v1/grocery/cart')
@UseGuards(JwtUserAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class GroceryCartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current cart and totals for student' })
  async getCart(@Req() req: any) {
    const cart = await this.cartService.getCart(req.user.id);
    const totals = await this.cartService.getCartTotal(req.user.id);
    return { cart, totals };
  }

  @Post('items')
  @ApiOperation({ summary: 'Add grocery item to cart' })
  async addToCart(@Req() req: any, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(req.user.id, dto);
  }

  @Delete('items/:groceryItemId')
  @ApiOperation({ summary: 'Remove all variants of grocery item from cart' })
  async removeAllVariantsFromCart(@Req() req: any, @Param('groceryItemId') groceryItemId: string) {
    return this.cartService.removeFromCart(req.user.id, groceryItemId);
  }

  @Delete('items/:groceryItemId/:unit')
  @ApiOperation({ summary: 'Remove a specific variant of grocery item from cart' })
  async removeFromCart(@Req() req: any, @Param('groceryItemId') groceryItemId: string, @Param('unit') unit: string) {
    return this.cartService.removeFromCart(req.user.id, groceryItemId, unit);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  async clearCart(@Req() req: any) {
    return this.cartService.clearCart(req.user.id);
  }
}
