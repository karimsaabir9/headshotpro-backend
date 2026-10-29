import { paymentService } from "@/services/payment";
import { successResponse } from "@/util/response";
import { Request, Response } from "express";

export const getCreditPackages = async (req: Request, res: Response) => {

    // call the service to get the credit packages
    const creditPackages = await paymentService.getCreditPackages();
    // send the response
   return successResponse(res, "Credit packages fetched successfully", creditPackages);
}

