import winston from "winston";

const transports: winston.transport[] = [new winston.transports.Console()];

// Better Stack via @logtail/winston (opt-in via BETTERSTACK_SOURCE_TOKEN)
const bsToken = process.env.BETTERSTACK_SOURCE_TOKEN;
let logtail: any = null;

if (bsToken) {
  const { Logtail } = await import("@logtail/node");
  const { LogtailTransport } = await import("@logtail/winston");
  logtail = new Logtail(bsToken);
  transports.push(new LogtailTransport(logtail));
}

// Dev: human-readable. Production with Better Stack: still human-readable
// locally, logtail transport handles structured shipping.
const format = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format,
  transports,
});

export async function flushLogs() {
  if (logtail) await logtail.flush();
}
