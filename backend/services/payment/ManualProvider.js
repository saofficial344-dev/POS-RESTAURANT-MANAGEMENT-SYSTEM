import { randomBytes } from 'crypto';
import { PaymentProvider } from './PaymentProvider.js';

export class ManualProvider extends PaymentProvider {
  async createSubscription({ restaurant, plan, billingCycle }) {
    return {
      provider: 'manual',
      externalSubscriptionId: `manual_sub_${randomBytes(8).toString('hex')}`,
      status: 'active',
    };
  }

  async cancelSubscription({ externalSubscriptionId }) {
    return { cancelled: true, externalSubscriptionId };
  }

  async createInvoice({ restaurant, amount, currency, description }) {
    return {
      provider: 'manual',
      externalInvoiceId: `manual_inv_${randomBytes(8).toString('hex')}`,
      status: 'open',
    };
  }

  async processPayment({ invoice }) {
    return {
      provider: 'manual',
      externalPaymentId: `manual_pay_${randomBytes(8).toString('hex')}`,
      status: 'succeeded',
    };
  }

  async refundPayment({ externalPaymentId, amount }) {
    return { refunded: true, externalPaymentId, amount };
  }
}
