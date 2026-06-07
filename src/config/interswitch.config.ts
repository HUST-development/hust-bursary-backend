export const interswitchConfig = {
  merchantCode: process.env.INTERSWITCH_MERCHANT_CODE || 'MX179961',
  apiKey: process.env.INTERSWITCH_API_KEY || 'default_api_key',
  baseUrl: process.env.INTERSWITCH_BASE_URL || 'https://webpay.interswitchng.com/collections/api/v1/gettransaction.json?',
  payItemId: process.env.INTERSWITCH_PAY_ITEM_ID || '1010000',
  timeout: 10000,
  maxRetries: 3,
};

// export const interswitchConfig = {
//   merchantCode: process.env.INTERSWITCH_MERCHANT_CODE || 'VNA',
//   apiKey: process.env.INTERSWITCH_API_KEY || 'default_api_key',
//   baseUrl: process.env.INTERSWITCH_BASE_URL || 'https://qa.interswitchng.com/collections/api/v1/gettransaction.json?',
//   payItemId: process.env.INTERSWITCH_PAY_ITEM_ID || '102',
//   timeout: 10000,
//   maxRetries: 3,
// };
