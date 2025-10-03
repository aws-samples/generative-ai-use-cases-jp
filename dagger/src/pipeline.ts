import type { Client } from "@dagger.io/dagger";
import { createNodeContainer, withSourceCode, withCachedNpmInstall } from "./lib/container.js";
import { runBuild } from "./lib/build.js";
import { runQualityChecks } from "./lib/test.js";

export async function pipeline(client: Client): Promise<void> {
  console.log("🔧 Setting up base container...");
  let container = createNodeContainer({ client });

  console.log("📁 Copying source code...");
  container = withSourceCode(container, client);

  console.log("📦 Installing dependencies...");
  container = withCachedNpmInstall(container, client);

  // CI Stage: Always run quality checks and build
  console.log("🚦 Running CI stage...");

  // Run quality checks and build in parallel
  const qualityPromise = runQualityChecks(container);
  const buildPromise = runBuild(container);

  const [qualityResult, buildResult] = await Promise.all([qualityPromise, buildPromise]);

  console.log("🎉 Pipeline completed!");
}
