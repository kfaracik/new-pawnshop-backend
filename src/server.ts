import app from "./app";
import { env } from "./config/env";
import { logInfo } from "./utils/logger";

const PORT = env.port;

app.listen(PORT, () => {
  logInfo("server_started", { port: PORT, nodeEnv: env.nodeEnv });
});
