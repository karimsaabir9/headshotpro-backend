import { paymentService } from "@/services/payment";
import { NotFoundError } from "@/util/errors";
import { logger } from "@/util/logger";
import { errorResponse, successResponse } from "@/util/response";
import { Request, Response } from "express";

export const getCreditPackages = async (req: Request, res: Response) => {

    // call the service to get the credit packages
    const creditPackages = await paymentService.getCreditPackages();
    // send the response
   return successResponse(res, "Credit packages fetched successfully", creditPackages);
}
export const processPayment = async (req: Request, res: Response) => {

    // paymnet service to process the payment

    const userId = req.user?.userId;
    logger.info(`Processing payment for user ${userId}`);
    if(!userId) {
        throw new NotFoundError("User not found");
    }

    const { packageId, platform, phone, successUrl, cancelUrl } = req.body;

    // pass the parameters to the service

    const paymentResponse = await paymentService.processPayment({ userId, packageId, platform, phone, successUrl, cancelUrl });

    if(!paymentResponse.success) {
        return errorResponse(res, paymentResponse.message);
    }

    return successResponse(res, paymentResponse.message, paymentResponse);
}