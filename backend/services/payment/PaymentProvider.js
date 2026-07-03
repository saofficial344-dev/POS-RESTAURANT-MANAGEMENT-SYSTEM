export class PaymentProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async createSubscription({ restaurant, plan, billingCycle }) {
    throw new Error(`${this.constructor.name}: createSubscription not implemented`);
  }

  async cancelSubscription({ externalSubscriptionId }) {
    throw new Error(`${this.constructor.name}: cancelSubscription not implemented`);
  }

  async createInvoice({ restaurant, amount, currency, description }) {
    throw new Error(`${this.constructor.name}: createInvoice not implemented`);
  }

  async processPayment({ invoice, paymentMethodId }) {
    throw new Error(`${this.constructor.name}: processPayment not implemented`);
  }

  async refundPayment({ externalPaymentId, amount }) {
    throw new Error(`${this.constructor.name}: refundPayment not implemented`);
  }
}
