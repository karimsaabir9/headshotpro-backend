import { config } from "@/config";
import { StripePaymentResponse } from "@/types/payment-types";
import { AppError } from "@/util/errors";
import { logger } from "@/util/logger";
import Stripe from "stripe";

export class StripeService {
  private stripe: Stripe;

  constructor() {
    const stripeSecretKey = config.stripe.secretKey;

    if (!stripeSecretKey) {
      logger.error("Stripe secret key is not configured");
      throw new AppError("Stripe secret key is not configured");
    }

    this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2026-09-30.endive",
    });
  }

  async createCheckoutSession(params: {
    userId: string;
    packageId: string;
    amount: number;
    credits: number;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    metadata?: Record<string, any>;
  }): Promise<StripePaymentResponse> {
    try {
      const {
        userId,
        packageId,
        amount,
        credits,
        successUrl,
        cancelUrl,
        customerEmail,
        metadata,
      } = params;

      // Create session config

      const sessionConfig: any = {
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${credits} Headshott credits`,
                description: `Purchase ${credits} credits for $${amount}`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          packageId,
          credits: credits.toString(),
          ...metadata,
        },
      };

      // Pre-fill customer email if provided

      if (customerEmail) {
        sessionConfig.customer_email = customerEmail;
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create(sessionConfig);

      logger.info(
        `Stripe checkout session created successfully for user ${userId} and package ${packageId}`
      );

      return {
        status: "success",
        sessionId: session.id,
        redirectUrl: session.url || undefined,
      };
    } catch (error) {
      logger.error(`Error creating Stripe checkout session: ${error}`);
      throw new AppError("Failed to create checkout session", 500);
    }
  }

}

export const stripeService = new StripeService();