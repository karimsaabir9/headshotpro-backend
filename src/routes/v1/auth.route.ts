import { Router } from "express";
import { authController } from "@/controllers";
import {
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from "@/validators/auth.validator";
import { authenticate, validate, validateQuery } from "@/middleware";

const authRouter = Router();

authRouter.post("/register", validate(registerSchema), authController.register);
authRouter.get(
  "/verify-email",
  validateQuery(verifyEmailSchema),
  authController.verifyEmail,
);

authRouter.post(
  "/resend-verification",
  validate(resendVerificationSchema),
  authController.resendVerificationEmail,
);

authRouter.post("/login", validate(loginSchema), authController.login);

authRouter.get("/me", authenticate, authController.getCurrentUser)
authRouter.post('/refresh-token', authController.refreshToken)
authRouter.post('/logout', authenticate, authController.logout)

export default authRouter;
