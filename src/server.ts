import app from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";

const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(
    `🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`
  );
});
process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});
