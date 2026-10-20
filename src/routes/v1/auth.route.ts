import { Router } from "express";

const router = Router();

router.get("/me", (req, res) => {
  res.json({
    massage: "Hello World",
  });
});
router.get("/logout", (req, res) => {
  res.json({
    massage: "logged ou",
  });
});

export default router;
