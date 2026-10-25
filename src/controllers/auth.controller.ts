import { authService } from "@/services";
import { ValidationError } from "@/util/errors";
import { createdResponse, successResponse } from "@/util/response";
import type { Request, Response } from "express";

export const register = async (req: Request, res: Response) => {
  // service call
  const { user } = await authService.registerUser(req.body);
  return createdResponse(res, "User registered successfully", {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
    },
  });
};

// Verify emnail

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    throw new ValidationError("Verification token is required");
  }

  // verifiction service
  await authService.verifyEmail(token);

  return successResponse(res, "Email verfied successfully");
};