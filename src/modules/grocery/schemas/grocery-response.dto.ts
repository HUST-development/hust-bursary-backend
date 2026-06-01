export class GroceryResponseDto<T> {
  message: string;
  data: T;
  timestamp: Date;
}
