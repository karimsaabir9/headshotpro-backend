import { config } from "@/config";
import { CreditPackage, ICreditPackage, IOrder, Order, User } from "@/models";
import {
  PaymentPlatform,
  PaymentResponse,
  PaymentStatus,
} from "@/types/payment-types";
import { AppError, NotFoundError } from "@/util/errors";
import { logger } from "@/util/logger";
import { stripeService } from "./stripe-service";

export class PaymentService {
  // get All Credit Packages

  async getCreditPackages(): Promise<ICreditPackage[]> {
    try {
      const creditPackages = await CreditPackage.find({ isActive: true });
      return creditPackages;
    } catch (error) {
      logger.error("Failed to get credit packages", error);
      throw new AppError("Failed to get credit packages");
    }
  }
  //   get credit package by id
  async getCreditPackageById(id: string): Promise<ICreditPackage> {
    try {
      const creditPackage = await CreditPackage.findById(id);
      if (!creditPackage) {
        throw new NotFoundError("Credit package not found");
      }
      return creditPackage;
    } catch (error) {
      logger.error("Failed to get credit package by id", error);
      throw new AppError("Failed to get credit package by id");
    }
  }

  // process payment for stripe

  async processStripePayment(params: {
    order: IOrder;
    creditPackage: ICreditPackage;
    totalCredits: number;
    successUrl: string;
    cancelUrl: string;
    userEmail?: string;
  }): Promise<PaymentResponse> {
    try {
      const {
        order,
        creditPackage,
        totalCredits,
        successUrl,
        cancelUrl,
        userEmail,
      } = params;

      // create stripe checkout session
      const stripeSession = await stripeService.createCheckoutSession({
        userId: order.user.toString(),
        packageId: order.package.toString(),
        amount: order.amount,
        credits: totalCredits,
        successUrl,
        cancelUrl,
        customerEmail: userEmail,
        metadata: {
          orderId: order._id.toString(),
          packageName: creditPackage.name,
        },
      });

      // update order with stripe session id
      order.stripeSessionId = stripeSession.sessionId;
      order.status = PaymentStatus.PROCESSING;
      await order.save();

      logger.info(
        `Stripe checkout session created successfully for order ${order._id.toString()}`,
      );

      return {
        success: true,
        message: "Payment session created successfully",
        orderId: order._id.toString(),
        sessionId: stripeSession.sessionId,
        redirectUrl: stripeSession.redirectUrl,
        cancelUrl: `${config.frontendUrl}/dashboard/user/credits?status=cancel`,
        amount: order.amount,
        credits: totalCredits,
        status: PaymentStatus.PROCESSING,
      };
    } catch (error: any) {
      const errorMessage =
        error instanceof AppError
          ? error.message
          : error?.message || error?.type || String(error) || "Unknown error";

      logger.error("Error processing Stripe payment", {
        error: errorMessage,
        stack: error.stack,
        orderId: params.order._id,
        stripeError: error?.type || error?.code,
        fullError: error,
      });

      throw new AppError(
        `Failed to process Stripe payment: ${errorMessage}`,
        500,
        "PROCESS_STRIPE_PAYMENT_ERROR",
      );
    }
  }

  //   create order
  async createOrder(params: {
    userId: string;
    packageId: string;
    amount: number;
    credits: number;
    platform: PaymentPlatform;
    phone?: string;
  }): Promise<IOrder> {
    try {
      const { userId, packageId, amount, credits, platform, phone } = params;

      const order = await Order.create({
        user: userId,
        package: packageId,
        amount,
        credits,
        platform,
        phone,
      });
      return order;
    } catch (error) {
      logger.error("Failed to create order", error);
      throw new AppError("Failed to create order");
    }
  }

  async processPayment(params: {
    userId: string;
    packageId: string;
    platform: PaymentPlatform;
    phone?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaymentResponse> {
    try {
      const { userId, packageId, platform, phone, successUrl, cancelUrl } =
        params;
      logger.info(
        `Processing payment for user ${userId} with package ${packageId} on platform ${platform}`,
      );

      // get the credit package
      const creditPackage = await this.getCreditPackageById(packageId);

      // calculate the amount
      const totalCredits = creditPackage.credits + (creditPackage.bonus || 0);

      // Get user Info from the database
      const user = await User.findById(userId).select("email");

      const userEmail = user?.email;

      const order = await this.createOrder({
        userId,
        packageId,
        amount: creditPackage.price,
        credits: totalCredits,
        platform,
        phone,
      });

      //   Process Payment based on the platform

      if (platform === PaymentPlatform.STRIPE) {
        return await this.processStripePayment({
          order,
          creditPackage,
          totalCredits,
          successUrl,
          cancelUrl,
          userEmail,
        });
      } else if (platform === PaymentPlatform.LOCAL) {
        //TODO: Implement the payment processing for the other platforms
        return {
          success: true,
          message: "Payment processed successfully",
          orderId: order._id.toString(),
          sessionId: undefined,
          redirectUrl: undefined,
          amount: order.amount,
          credits: totalCredits,
          status: PaymentStatus.PROCESSING,
        };
      } else if (
        platform === PaymentPlatform.EVC ||
        platform === PaymentPlatform.ZAAD ||
        platform === PaymentPlatform.SAHAL
      ) {
        // TODO: Implement the payment processing for the other platforms
        return {
          success: true,
          message: "Payment processed successfully",
          orderId: order._id.toString(),
          sessionId: undefined,
          redirectUrl: undefined,
          amount: order.amount,
          credits: totalCredits,
          status: PaymentStatus.PROCESSING,
        };
      } else if (platform === PaymentPlatform.EBIR) {
        // TODO: Implement the payment processing for the other platforms
        return {
          success: true,
          message: "Payment processed successfully",
          orderId: order._id.toString(),
          sessionId: undefined,
          redirectUrl: undefined,
          amount: order.amount,
          credits: totalCredits,
          status: PaymentStatus.PROCESSING,
        };
      } else {
        throw new AppError(
          "Unsupported payment platform",
          400,
          "UNSUPPORTED_PAYMENT_PLATFORM",
        );
      }
    } catch (error) {
      logger.error("Failed to process payment", error);
      throw new AppError("Failed to process payment");
    }
  }
}

export const paymentService = new PaymentService();
