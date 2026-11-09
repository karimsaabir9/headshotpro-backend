import { Router } from "express";
import authRouter from "./auth.routes";
import paymentRoute from "./payment.routs";
import HeadshotRouter from "./headshot.routes";
import AdminUserRouter from "./admin.user.routes";
import AdminOrderRouter from "./admin.order.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/payment", paymentRoute);
router.use("/headshots", HeadshotRouter);
router.use("/admin/users", AdminUserRouter);
router.use("/admin/orders", AdminOrderRouter);

export default router;
