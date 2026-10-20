import { Router } from "express";
import { register } from "@/controllers";
import { registerSchema } from "@/validators/auth.validator";
import { validate } from "@/middleware/validation.middleware";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.get("/logout", (req, res) => {
  res.json({
    massage: "logged out",
  });
});

export default router;
