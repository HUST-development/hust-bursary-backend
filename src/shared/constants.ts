export enum DatabaseModelNames {
  USER = 'User',
  AUTHORIZED_USER = 'AuthorizedUser',
  TICKET = 'Ticket',
  TRANSACTION = 'Transaction',
  REDEMPTION = 'Redemption',
  REPORT = 'Report',
  FOODSTUFF = 'Foodstuff',
  FOODSTUFF_HISTORY = 'FoodstuffHistory',
  COOKED_FOOD_NAME = 'CookedFoodName',
  COOKED_FOOD = 'CookedFood',
  FOODSTUFF_REQUISITION = 'FoodstuffRequisition',
  WALLET = 'Wallet',
  ORDER = 'Order',
  STUDENT = 'Student',
  MEDICAL_RECORD = 'MedicalRecord',
  MEDICAL_WALLET = 'MedicalWallet',
  MEDICAL_WALLET_HISTORY = 'MedicalWalletHistory',
  GROCERY_ITEM = 'GroceryItem',
  GROCERY_CART = 'GroceryCart',
  GROCERY_ORDER = 'GroceryOrder',
  GROCERY_ORDER_ITEM = 'GroceryOrderItem',
  ORDER_HISTORY = 'OrderHistory',
  GROCERY_STOCK_HISTORY = 'GroceryStockHistory',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
  VENDOR = 'VENDOR',
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
  STORE_MANAGER = 'STORE_MANAGER',
  MEDICAL_MANAGER = 'MEDICAL_MANAGER',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum TicketType {
  MEAL = 'MEAL',
  WATER = 'WATER',
  SNACK = 'SNACK',
  PREMIUM = 'PREMIUM',
  OTHER = 'OTHER',
}

export enum PaymentType {
  CASH = 'CASH',
  POS = 'POS',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET = 'WALLET',
}

export enum TicketStatus {
  ISSUED = 'ISSUED',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
}

export enum TransactionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

export enum OrderStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  FULFILLED = 'FULFILLED',
}

export enum RedemptionStatus {
  REDEEMED = 'REDEEMED',
  FAILED = 'FAILED',
}

export enum ActionType {
  PURCHASE = 'purchase',
  USAGE = 'usage',
  WASTAGE = 'wastage',
  CORRECTION = 'correction',
}

export enum GroceryOrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OrderItemStatus {
  PENDING = 'PENDING',
  PREPARED = 'PREPARED',
  READY = 'READY',
  HANDED_OVER = 'HANDED_OVER',
}

export enum GroceryUnitType {
  PACK = 'PACK',
  ROLL = 'ROLL',
  PIECE = 'PIECE',
  KG = 'KG',
  LITER = 'LITER',
  BOX = 'BOX',
  CARTON = 'CARTON',
}

export const Constants = {
  accessTokenExpiry: '1d',
  refreshTokenExpiry: '7d',
  passwordSaltRounds: 10,
  passwordMinLength: 8,
  lockedAccountTime: 24 * 60 * 60 * 1000,
  stockThresholds: {
    low: 10,
    critical: 0,
  },
};

export const COOKIE_NAME = 'refreshToken';
