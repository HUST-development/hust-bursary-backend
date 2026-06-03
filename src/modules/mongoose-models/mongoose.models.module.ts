import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModelNames } from 'src/shared/constants';
import { UserSchema } from '../user/user.schema';

import { TicketSchema } from '../tickets/ticket.schema';
import { TransactionSchema } from '../transactions/transaction.schema';
import { RedemptionSchema } from '../redemptions/redemption.schema';
import { ReportSchema } from '../reports/report.schema';
import { FoodstuffSchema } from '../foodstuffs/schemas/foodstuff.schema';
import { FoodstuffHistorySchema } from '../foodstuffs/schemas/foodstuff-history.schema';
import { AuthorizedUserSchema } from '../user/authorized-user.schema';
import { CookedFoodNameSchema } from '../foodstuffs/schemas/cooked-food-name.schema';
import { CookedFoodSchema } from '../foodstuffs/schemas/cooked-food.schema';
import { FoodstuffRequisitionSchema } from '../foodstuffs/schemas/foodstuff-requisition.schema';
import { WalletSchema } from '../wallet/wallet.schema';
import { OrderSchema } from '../foodstuffs/schemas/order.schema';
import { StudentSchema } from '../medical/schemas/student.schema';
import { MedicalRecordSchema } from '../medical/schemas/medical-record.schema';
import { MedicalWalletSchema } from '../medical/schemas/medical-wallet.schema';
import { MedicalWalletHistorySchema } from '../medical/schemas/wallet-history.schema';
import { GroceryItemSchema } from '../grocery/schemas/grocery-item.schema';
import { GroceryCartSchema } from '../grocery/schemas/grocery-cart.schema';
import { GroceryOrderSchema } from '../grocery/schemas/grocery-order.schema';
import { OrderHistorySchema } from '../grocery/schemas/order-history.schema';
import { StockHistorySchema } from '../grocery/schemas/stock-history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DatabaseModelNames.USER, schema: UserSchema },
      { name: DatabaseModelNames.AUTHORIZED_USER, schema: AuthorizedUserSchema },
      { name: DatabaseModelNames.TICKET, schema: TicketSchema },
      { name: DatabaseModelNames.TRANSACTION, schema: TransactionSchema },
      { name: DatabaseModelNames.REDEMPTION, schema: RedemptionSchema },
      { name: DatabaseModelNames.REPORT, schema: ReportSchema },
      { name: DatabaseModelNames.FOODSTUFF, schema: FoodstuffSchema },
      { name: DatabaseModelNames.FOODSTUFF_HISTORY, schema: FoodstuffHistorySchema },
      { name: DatabaseModelNames.COOKED_FOOD_NAME, schema: CookedFoodNameSchema },
      { name: DatabaseModelNames.COOKED_FOOD, schema: CookedFoodSchema },
      { name: DatabaseModelNames.FOODSTUFF_REQUISITION, schema: FoodstuffRequisitionSchema },
      { name: DatabaseModelNames.WALLET, schema: WalletSchema },
      { name: DatabaseModelNames.ORDER, schema: OrderSchema },
      { name: DatabaseModelNames.STUDENT, schema: StudentSchema },
      { name: DatabaseModelNames.MEDICAL_RECORD, schema: MedicalRecordSchema },
      { name: DatabaseModelNames.MEDICAL_WALLET, schema: MedicalWalletSchema },
      { name: DatabaseModelNames.MEDICAL_WALLET_HISTORY, schema: MedicalWalletHistorySchema },
      { name: DatabaseModelNames.GROCERY_ITEM, schema: GroceryItemSchema },
      { name: DatabaseModelNames.GROCERY_CART, schema: GroceryCartSchema },
      { name: DatabaseModelNames.GROCERY_ORDER, schema: GroceryOrderSchema },
      { name: DatabaseModelNames.ORDER_HISTORY, schema: OrderHistorySchema },
      { name: DatabaseModelNames.GROCERY_STOCK_HISTORY, schema: StockHistorySchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class MongooseModelsModule {}
