import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../packages/tui/dist/", import.meta.url));
const launchers = join(dist, "bundle");

for (const entry of ["cli.js", "rpc-entry.js"]) {
	if (!existsSync(join(dist, "host", entry))) throw new Error(`Build the TUI host before generating ${entry}`);
	mkdirSync(launchers, { recursive: true });
	const launcher = join(launchers, entry);
	writeFileSync(
		launcher,
		`#!/usr/bin/env node\nimport { createRequire, enableCompileCache } from "node:module";\n\nenableCompileCache();\ncreateRequire(import.meta.url)("../host/${entry}");\n`,
	);
	chmodSync(launcher, 0o755);
}