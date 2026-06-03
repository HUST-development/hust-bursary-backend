import { Module } from '@nestjs/common';
import { MongooseModelsModule } from '../mongoose-models/mongoose.models.module';
import { Repositories } from 'src/shared/enums';
import { BaseRepository } from './base.repository';
import { getModelToken } from '@nestjs/mongoose';
import { DatabaseModelNames } from 'src/shared/constants';

@Module({
  imports: [MongooseModelsModule],
  providers: [
    // Dynamic repository providers for each database schema & entity
    // e.g
    {
      provide: Repositories.UserRepository,
      useFactory: (userModel) => new BaseRepository(userModel),
      inject: [getModelToken(DatabaseModelNames.USER)],
    },
    {
      provide: Repositories.AuthorizedUserRepository,
      useFactory: (authorizedUserModel) => new BaseRepository(authorizedUserModel),
      inject: [getModelToken(DatabaseModelNames.AUTHORIZED_USER)],
    },
    {
      provide: Repositories.TicketRepository,
      useFactory: (ticketModel) => new BaseRepository(ticketModel),
      inject: [getModelToken(DatabaseModelNames.TICKET)],
    },
    {
      provide: Repositories.TransactionRepository,
      useFactory: (transactionModel) => new BaseRepository(transactionModel),
      inject: [getModelToken(DatabaseModelNames.TRANSACTION)],
    },
    {
      provide: Repositories.RedemptionRepository,
      useFactory: (redemptionModel) => new BaseRepository(redemptionModel),
      inject: [getModelToken(DatabaseModelNames.REDEMPTION)],
    },
    {
      provide: Repositories.ReportRepository,
      useFactory: (reportModel) => new BaseRepository(reportModel),
      inject: [getModelToken(DatabaseModelNames.REPORT)],
    },
    {
      provide: Repositories.FoodstuffRepository,
      useFactory: (foodstuffModel) => new BaseRepository(foodstuffModel),
      inject: [getModelToken(DatabaseModelNames.FOODSTUFF)],
    },
    {
      provide: Repositories.FoodstuffHistoryRepository,
      useFactory: (foodstuffHistoryModel) => new BaseRepository(foodstuffHistoryModel),
      inject: [getModelToken(DatabaseModelNames.FOODSTUFF_HISTORY)],
    },
    {
      provide: Repositories.CookedFoodNameRepository,
      useFactory: (cookedFoodNameModel) => new BaseRepository(cookedFoodNameModel),
      inject: [getModelToken(DatabaseModelNames.COOKED_FOOD_NAME)],
    },
    {
      provide: Repositories.CookedFoodRepository,
      useFactory: (cookedFoodModel) => new BaseRepository(cookedFoodModel),
      inject: [getModelToken(DatabaseModelNames.COOKED_FOOD)],
    },
    {
      provide: Repositories.FoodstuffRequisitionRepository,
      useFactory: (foodstuffRequisitionModel) => new BaseRepository(foodstuffRequisitionModel),
      inject: [getModelToken(DatabaseModelNames.FOODSTUFF_REQUISITION)],
    },
    {
      provide: Repositories.WalletRepository,
      useFactory: (walletModel) => new BaseRepository(walletModel),
      inject: [getModelToken(DatabaseModelNames.WALLET)],
    },
    {
      provide: Repositories.OrderRepository,
      useFactory: (orderModel) => new BaseRepository(orderModel),
      inject: [getModelToken(DatabaseModelNames.ORDER)],
    },
    {
      provide: Repositories.StudentRepository,
      useFactory: (studentModel) => new BaseRepository(studentModel),
      inject: [getModelToken(DatabaseModelNames.STUDENT)],
    },
    {
      provide: Repositories.MedicalRecordRepository,
      useFactory: (medicalRecordModel) => new BaseRepository(medicalRecordModel),
      inject: [getModelToken(DatabaseModelNames.MEDICAL_RECORD)],
    },
    {
      provide: Repositories.MedicalWalletRepository,
      useFactory: (medicalWalletModel) => new BaseRepository(medicalWalletModel),
      inject: [getModelToken(DatabaseModelNames.MEDICAL_WALLET)],
    },
    {
      provide: Repositories.MedicalWalletHistoryRepository,
      useFactory: (medicalWalletHistoryModel) => new BaseRepository(medicalWalletHistoryModel),
      inject: [getModelToken(DatabaseModelNames.MEDICAL_WALLET_HISTORY)],
    },
    {
      provide: Repositories.GroceryCartRepository,
      useFactory: (groceryCartModel) => new BaseRepository(groceryCartModel),
      inject: [getModelToken(DatabaseModelNames.GROCERY_CART)],
    },
    {
      provide: Repositories.GroceryItemRepository,
      useFactory: (groceryItemModel) => new BaseRepository(groceryItemModel),
      inject: [getModelToken(DatabaseModelNames.GROCERY_ITEM)],
    },
    {
      provide: Repositories.GroceryOrderRepository,
      useFactory: (groceryOrderModel) => new BaseRepository(groceryOrderModel),
      inject: [getModelToken(DatabaseModelNames.GROCERY_ORDER)],
    },
    {
      provide: Repositories.OrderHistoryRepository,
      useFactory: (orderHistoryModel) => new BaseRepository(orderHistoryModel),
      inject: [getModelToken(DatabaseModelNames.ORDER_HISTORY)],
    },
    {
      provide: Repositories.GroceryStockHistoryRepository,
      useFactory: (stockHistoryModel) => new BaseRepository(stockHistoryModel),
      inject: [getModelToken(DatabaseModelNames.GROCERY_STOCK_HISTORY)],
    },
    // {
    //   provide: Repositories.VendorOrderRepository,
    //   useFactory: (vendorOrderModel) => new BaseRepository(vendorOrderModel),
    //   inject: [getModelToken(DatabaseModelNames.VENDOR_ORDER)],
    // }
  ],
  exports: [...Object.values(Repositories)],
})
export class RepositoryModule {}
