import app from "./app";

const startServer = async () => {
  const server = app.listen("8000", () => {
    console.log("Server is running on port 8000");
  });
  server.on("error", (error: NodeJS.ErrnoException) => {
    console.error("Error starting server:", error);
    process.exit(1);
  });
};

startServer();
