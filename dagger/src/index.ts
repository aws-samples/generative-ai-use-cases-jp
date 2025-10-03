#!/usr/bin/env tsx

import { connect } from "@dagger.io/dagger";
import { pipeline } from "./pipeline.js";

async function main() {
  console.log("🚀 Starting Dagger pipeline...");

  await connect(async (client) => {
    await pipeline(client);
  }, { LogOutput: process.stderr });

  console.log("✅ Pipeline completed successfully");
}

main().catch((error) => {
  console.error("❌ Pipeline failed:", error);
  process.exit(1);
});
