import "dotenv/config";

export const config = {
  employeeId: requiredEnv("EMPLOYEE_ID"),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379/0",
  databaseUrl: process.env.DATABASE_URL || "postgres://localhost:5432/alchemy_development",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL, // undefined = direct Anthropic
  dataDir: process.env.DATA_DIR || "/data",
};

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
  return value;
}
