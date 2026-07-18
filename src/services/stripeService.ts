import Stripe from "stripe";
import { env } from "../config/env";

let stripeClient: Stripe | null = null;

export const isStripeConfigured = () => Boolean(env.stripeSecretKey);

export const getStripe = (): Stripe | null => {
  if (!env.stripeSecretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey);
  }

  return stripeClient;
};

const toStripeAmount = (value: number) => Math.round(Number(value) * 100);

type CheckoutOrder = {
  _id: unknown;
  customer?: { email?: string };
  products: Array<{ name: string; price: number; quantity: number }>;
  deliveryPrice?: number;
  deliveryMethod?: string;
};

export const createCheckoutSessionForOrder = async (
  order: CheckoutOrder
): Promise<Stripe.Checkout.Session> => {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }

  const orderId = String(order._id);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.products.map(
    (product) => ({
      quantity: Number(product.quantity),
      price_data: {
        currency: "pln",
        product_data: { name: product.name },
        unit_amount: toStripeAmount(product.price),
      },
    })
  );

  const deliveryPrice = Number(order.deliveryPrice || 0);
  if (deliveryPrice > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "pln",
        product_data: { name: "Dostawa" },
        unit_amount: toStripeAmount(deliveryPrice),
      },
    });
  }

  const returnBase = `${env.frontendBaseUrl}/cart`;

  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: order.customer?.email,
    metadata: { orderId },
    success_url: `${returnBase}?payment=success&orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnBase}?payment=canceled&orderId=${orderId}`,
  });
};

export const retrieveCheckoutSession = async (
  sessionId: string
): Promise<Stripe.Checkout.Session> => {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }

  return stripe.checkout.sessions.retrieve(sessionId);
};
