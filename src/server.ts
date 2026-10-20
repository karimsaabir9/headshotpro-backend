import app from "./app";
import { config } from "./config";

const startServer = async () => {
  try {
    const server = app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port} `);
    });
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.log(`Port ${config.port} is already in use.`);
        process.exit(1);
      } else {
        console.log(`Error starting server on port ${config.port}`, error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.log("Error starting server", error);
    process.exit(1);
  }
};

startServer();
