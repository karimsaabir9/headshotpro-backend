import { Router } from "express";
import { register } from "@/controllers";
import { registerSchema } from "@/validators/auth.validator";
import { validate } from "@/middleware/validation.middleware";

const authRouter = Router();

authRouter.post("/register", validate(registerSchema), register);
authRouter.get("/logout", (req, res) => {
  res.json({
    massage: "logged out",
  });
});

export default authRouter;
