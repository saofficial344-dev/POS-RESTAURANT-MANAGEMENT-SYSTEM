import { PaymentProvider } from './PaymentProvider.js';

// Stub — wire up Stripe SDK when ready:
//   npm install stripe
//   import Stripe from 'stripe';
//   this.client = new Stripe(config.secretKey);

export class StripeProvider extends PaymentProvider {
  constructor(config = {}) {
    super(config);
  }

  async createSubscription() {
    throw new Error('Stripe not configured. Set PAYMENT_PROVIDER=manual or provide STRIPE_SECRET_KEY.');
  }

  async cancelSubscription() {
    throw new Error('Stripe not configured.');
  }

  async createInvoice() {
    throw new Error('Stripe not configured.');
  }

  async processPayment() {
    throw new Error('Stripe not configured.');
  }

  async refundPayment() {
    throw new Error('Stripe not configured.');
  }
}
