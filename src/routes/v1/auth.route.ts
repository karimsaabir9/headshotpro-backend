import { Router } from "express";
import { register } from "@/controllers";

const router = Router();

router.get("/register", register);
router.get("/logout", (req, res) => {
  res.json({
    massage: "logged out",
  });
});

export default router;
