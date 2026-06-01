import { Module } from '@nestjs/common';
// TODO: Import MongooseModelsModule, RepositoryModule, CloudinaryModule, AuthModule
import { GroceryItemsController } from './grocery-items.controller';
import { GroceryCartController } from './grocery-cart.controller';
import { GroceryOrdersController } from './grocery-orders.controller';
import { VendorOrdersController } from './vendor-orders.controller';
import { GroceryService } from './grocery.service';
import { CartService } from './cart.service';
import { OrderService } from './order.service';
import { VendorOrderService } from './vendor-order.service';
import { PaymentService } from './payment.service';
import { GroceryCronService } from './grocery-cron.service';
import { MongooseModelsModule } from '../mongoose-models/mongoose.models.module';
import { RepositoryModule } from '../repository/repository.module';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [MongooseModelsModule, RepositoryModule, CloudinaryModule, AuthModule],
  controllers: [GroceryItemsController, GroceryCartController, GroceryOrdersController, VendorOrdersController],
  providers: [GroceryService, CartService, OrderService, VendorOrderService, PaymentService, GroceryCronService],
})
export class GroceryModule {}
