import { defineConfig } from "prisma/config";
import { readFileSync } from "fs";
import { resolve } from "path";

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

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
