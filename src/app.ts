import cookieParser from "cookie-parser";
import express from "express";

const app = express();

// express middleware
//cors middleware
// TODO: configure CORS

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
// TODO: 404 Route
// TODO: Error Handling

export default app;
