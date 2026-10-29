import { paymentController } from "@/controllers";
import { Router } from "express";

const router = Router();


// public routes

router.get('/packages', paymentController.getCreditPackages);




export default router;