import { CreditPackage, ICreditPackage } from "@/models";
import { AppError, NotFoundError } from "@/util/errors";
import { logger } from "@/util/logger";

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
}

export const paymentService = new PaymentService();
