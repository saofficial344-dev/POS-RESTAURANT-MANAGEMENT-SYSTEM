import { ManualProvider } from './ManualProvider.js';
import { StripeProvider  } from './StripeProvider.js';

const REGISTRY = {
  manual: ManualProvider,
  stripe: StripeProvider,
  // Future: paddle, lemon_squeezy, paypal
};

export const getPaymentProvider = (providerName) => {
  const name     = (providerName || process.env.PAYMENT_PROVIDER || 'manual').toLowerCase();
  const Provider = REGISTRY[name];
  if (!Provider) throw new Error(`Unknown payment provider: "${name}"`);
  return new Provider({ secretKey: process.env[`${name.toUpperCase()}_SECRET_KEY`] });
};

export default getPaymentProvider;
