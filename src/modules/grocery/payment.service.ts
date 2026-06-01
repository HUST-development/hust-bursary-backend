import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { interswitchConfig } from '../../config/interswitch.config';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  async initiatePayment(orderId: string, amount: number) {
    this.logger.log(`Initiating Interswitch payment for Order: ${orderId}, Amount: ₦${amount}`);

    const paymentReference = `ISW-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // For Interswitch WebPAY, we usually provide the parameters needed by the frontend
    // to initialize the checkout form.
    const paymentLink = `${interswitchConfig.baseUrl}/collections/w/pay`;

    return {
      paymentReference,
      paymentLink,
      merchantCode: interswitchConfig.merchantCode,
      payItemId: interswitchConfig.payItemId,
      amount: amount * 100, // Converted to kobo
    };
  }

  async verifyPayment(
    paymentReference: string,
    amount: number,
  ): Promise<{
    success: boolean;
    date: string;
  }> {
    this.logger.log(`Verifying Interswitch payment for reference: ${paymentReference}`);

    try {
      const url = `${interswitchConfig.baseUrl}/collections/api/v1/gettransaction.json?merchantcode=${interswitchConfig.merchantCode}&transactionreference=${paymentReference}&amount=${amount * 100}`;
      const authHeader = 'Bearer ' + Buffer.from(`${interswitchConfig.merchantCode}:${interswitchConfig.apiKey}`).toString('base64');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          // Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log(response);

      if (!response.ok) {
        this.logger.error(`Interswitch verification failed with status: ${response.status}`);
        return {
          success: false,
          date: '',
        };
      }

      // Check if response body is empty
      const contentLength = response.headers.get('content-length');
      if (contentLength === '0' || !response.body) {
        this.logger.error('Interswitch returned empty response body');
        return {
          success: false,
          date: '',
        };
      }

      const data = await response.json();
      console.log(data);
      this.logger.debug(`Interswitch verification response: ${JSON.stringify(data)}`);

      return {
        success: data.ResponseCode === '00' || data.ResponseCode === 'SUCCESS' || data.ResponseCode === '20031',
        date: data.TransactionDate,
      };
    } catch (error) {
      this.logger.error(`Error verifying payment: ${error.message}`);
      throw new InternalServerErrorException('Payment verification service unavailable');
    }
  }

  generateOrderCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'ORD-';
    for (let i = 0; i < 4; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }
}
