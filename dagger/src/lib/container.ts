import type { Client, Container } from "@dagger.io/dagger";

export interface BaseContainerOptions {
  client: Client;
  nodeVersion?: string;
  workdir?: string;
}

export function createNodeContainer(options: BaseContainerOptions): Container {
  const { client, nodeVersion = "24", workdir = "/workspace" } = options;

  return client
    .container()
    .from(`node:${nodeVersion}-slim`)
    .withExec(["apt-get", "update"])
    .withExec(["apt-get", "install", "-y", "git"])
    .withWorkdir(workdir)
    .withEnvVariable("CI", "true")
    .withEnvVariable("FORCE_COLOR", "1");
}

export function withSourceCode(container: Container, client: Client, excludePaths: string[] = []): Container {
  const defaultExcludes = [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".dagger",
    "dagger",
    ".github",
    "**/.DS_Store",
    "**/npm-debug.log*",
    "**/yarn-debug.log*",
    "**/yarn-error.log*"
  ];

  const allExcludes = [...defaultExcludes, ...excludePaths];

  return container.withDirectory(
    "/workspace",
    client.host().directory("..", { exclude: allExcludes })
  );
}

export function withCachedNpmInstall(container: Container, client: Client): Container {
  const npmCache = client.cacheVolume("npm-cache");

  return container
    .withMountedCache("/root/.npm", npmCache)
    .withExec(["npm", "ci", "--cache=/root/.npm"]);
}
