import { rename, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { fetchGitHubSnapshot, getGitHubSnapshot } from "../src/lib/github";

const login = process.env.GITHUB_LOGIN?.trim() || "zacariec";
const token = process.env.GITHUB_TOKEN?.trim();
const strict = process.env.CI === "true" || process.argv.includes("--strict");

if (!token) {
  if (strict) throw new Error("GITHUB_TOKEN is required for a CI GitHub snapshot refresh");
  const snapshot = getGitHubSnapshot();
  if (
    snapshot?.login.toLowerCase() !== login.toLowerCase() ||
    !Number.isFinite(Date.parse(snapshot.fetchedAt))
  ) {
    throw new Error("No real GitHub snapshot is available for the configured GITHUB_LOGIN");
  }
  console.info(`GitHub: reusing public ${snapshot.login} snapshot from ${snapshot.fetchedAt}`);
} else {
  // Never fall back after a failed refresh: CI must keep the previous deployment.
  const snapshot = await fetchGitHubSnapshot({ login, token });
  const destination = fileURLToPath(new URL("../src/lib/github-snapshot.json", import.meta.url));
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    await Bun.write(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
    await rename(temporary, destination);
  } finally {
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  console.info(
    `GitHub: refreshed public ${snapshot.login} snapshot at ${snapshot.fetchedAt}; ${snapshot.total} contributions, ${snapshot.pushes.length} pushes`,
  );
}
