import { Router } from "express";
import router from "./auth.route";
import paymentRoute from "./payment.route";
import HeadshotRouter from "./headshot.routes";

router.use("/auth", router);
router.use("/payment", paymentRoute)
router.use('/headshots', HeadshotRouter);

export default router;