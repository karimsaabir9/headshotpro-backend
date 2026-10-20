import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import { config } from "./config";
import v1Routers from "./routes/v1";

const app = express();

// express middleware
//cors middleware
// TODO: configure CORS

app.use(cors({
origin:config.frontendUrl,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "cookie", "stripe-signature"],
}))

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


// TODO: 404 Route
// TODO: Error Handling

export default app;
