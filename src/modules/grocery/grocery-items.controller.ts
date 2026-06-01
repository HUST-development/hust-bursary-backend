import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { GroceryService } from './grocery.service';
import { CreateGroceryItemDto, UpdateGroceryItemDto } from './schemas/grocery-item.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../../shared/constants';

@ApiTags('Grocery Items')
@Controller('api/v1/grocery/items')
export class GroceryItemsController {
  constructor(private readonly groceryService: GroceryService) {}

  @Get()
  @ApiOperation({ summary: 'List all active grocery items (Public)' })
  async getAllItems(
    @Query('isActive') isActive?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(limit, 10) || 10);
    let isActiveBool: boolean | undefined;
    if (isActive !== undefined) {
      isActiveBool = isActive === 'true' || isActive === '1';
    }
    return this.groceryService.getAllItems(isActiveBool, pageNumber, limitNumber, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get grocery item details (Public)' })
  async getItemById(@Param('id') id: string) {
    return this.groceryService.getItemById(id);
  }

  @UseGuards(JwtUserAuthGuard, RolesGuard)
  @Roles(UserRole.STORE_MANAGER)
  @Post()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Create a new grocery item (STORE_MANAGER)' })
  async createItem(@Body() dto: CreateGroceryItemDto, @UploadedFile() file: Express.Multer.File) {
    return this.groceryService.createItem(dto, file);
  }

  @UseGuards(JwtUserAuthGuard, RolesGuard)
  @Roles(UserRole.STORE_MANAGER)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Update a grocery item (STORE_MANAGER)' })
  async updateItem(@Param('id') id: string, @Body() dto: any, @UploadedFile() file: Express.Multer.File) {
    return this.groceryService.updateItem(id, dto, file);
  }

  @UseGuards(JwtUserAuthGuard, RolesGuard)
  @Roles(UserRole.STORE_MANAGER)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete a grocery item (STORE_MANAGER)' })
  async deleteItem(@Param('id') id: string) {
    return this.groceryService.deleteItem(id);
  }

  // @UseGuards(JwtUserAuthGuard, RolesGuard)
  // @Roles(UserRole.STORE_MANAGER)
  // @Post(':id/image')
  // @ApiBearerAuth()
  // @UseInterceptors(FileInterceptor('file'))
  // @ApiOperation({ summary: 'Upload image for grocery item (STORE_MANAGER)' })
  // async uploadItemImage(@Param('id') id: string, @UploadedFile() file: any) {
  //   return this.groceryService.uploadItemImage(file, id);
  // }
}
