import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import { config } from "./config";
import v1Routers from "./routes/v1";
import { errorMiddleware } from "./middleware/error.middleware";
import { errorResponse } from "./util/response";
import ingestClient from "./routes/ingest.route";

const app = express();

// express middleware
//cors middleware
// TODO: configure CORS

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "cookie",
      "stripe-signature",
    ],
  }),
);

// stripe middleware

app.post('/api/v1/payment/webhook/stripe', express.raw({type: 'application/json'}) , async(req, res, next)=> {

  try {
      // TODO : Implement the stripe webhook
      const  { handleStripeWebhook } = await import("./controllers/payment.controller");
      await handleStripeWebhook(req, res);
  } catch (error) {
      next(error);
  }
})

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timeStamp: new Date().toISOString(),
  }); 
});

// TODO: Routes

app.use("/api/v1", v1Routers);
// Inngest serve endpoint — must match the URL the Inngest dev server syncs (/api/inngest)
app.use("/api/inngest", ingestClient);
// TODO: 404 Route
app.use((req, res) => {
  return errorResponse(res, "Route not found", 404, [
    { path: req.originalUrl, message: "Route not found" },
  ]);
});

// TODO: Error Handling
app.use(errorMiddleware);

export default app;
