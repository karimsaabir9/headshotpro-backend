import { Router } from "express";
import { authController } from "@/controllers";
import { registerSchema, verifyEmailSchema } from "@/validators/auth.validator";
import { validate, validateQuery } from "@/middleware/validation.middleware";

const authRouter = Router();

authRouter.post("/register", validate(registerSchema), authController.register);
authRouter.get(
  "/verify-email",
  validateQuery(verifyEmailSchema),
  authController.verifyEmail,
);

export default authRouter;
