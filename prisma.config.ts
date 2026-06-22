import { defineConfig } from "prisma/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { readFileSync } from "fs";
import { resolve } from "path";

// Manually load .env file since Prisma 7 config runs before dotenv
function loadEnv() {
  try {
    const envFile = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
    envFile.split("\n").forEach((line) => {
      const [key, ...vals] = line.split("=");
      if (key && vals.length) {
        process.env[key.trim()] = vals.join("=").trim().replace(/^"|"$/g, "");
      }
    });
  } catch {}
}

loadEnv();

const url = process.env.DATABASE_URL!;

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  datasource: {
    url,
  },
  migrate: {
    adapter: () => new PrismaNeon({ connectionString: url }),
  },
});