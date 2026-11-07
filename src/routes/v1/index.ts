import { Router } from "express";
import router from "./auth.routes";
import paymentRoute from "./payment.routs";
import HeadshotRouter from "./headshot.routes";
import AdminUserRouter from "./admin.user.routes";

router.use("/auth", router);
router.use("/payment", paymentRoute)
router.use('/headshots', HeadshotRouter);
router.use('/admin/users', AdminUserRouter);


export default router;