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
