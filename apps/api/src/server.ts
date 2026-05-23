import { serve } from "@hono/node-server";
import { pathToFileURL } from "node:url";
import { createApp } from "./app.js";
import { logger } from "./logger.js";

const port = Number(process.env.PORT ?? 8787);

export { createApp } from "./app.js";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  serve(
    {
      fetch: createApp().fetch,
      port,
    },
    (info) => {
      logger.info({ port: info.port }, "Redline API listening");
    },
  );
}
