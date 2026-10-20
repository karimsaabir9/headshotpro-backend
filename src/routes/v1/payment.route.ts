import { Router } from "express";

const router = Router();

router.get("/webhook", (req, res) => {
  res.json({
    massage: "Webhook received",
  });
});

export default router;
