#!/usr/bin/env node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installConsumer, packageConsumerDirectoryName, smokeTestNpmConsumer } from "./local-package-install.mjs";
import { produceArtifactSet } from "./package-artifacts.mjs";
import { codingAgentName, smokeTestCodingAgent, smokeTestSdkExtension, smokeTestTui, tuiName } from "./coding-agent-smoke.mjs";

const root = mkdtempSync(join(tmpdir(), "pi-package-install-"));
try {
	const artifactSet = produceArtifactSet({ build: false, outDir: join(root, "artifacts"), repoRoot: process.cwd() });
	const requested = process.argv.slice(2);
	const packages = requested.length ? requested.map((name) => {
		const pkg = artifactSet.packages.find((candidate) => candidate.name === name);
		if (!pkg) throw new Error(`Unknown package: ${name}`);
		return pkg;
	}) : artifactSet.packages;
	for (const pkg of packages) {
		const directory = join(root, "consumers", packageConsumerDirectoryName(pkg.name));
		installConsumer({ artifactSet, directory, packageNames: [pkg.name] });
		smokeTestNpmConsumer({ artifactSet, directory, packageName: pkg.name });
		if (pkg.name === codingAgentName) {
			smokeTestCodingAgent(directory);
			smokeTestSdkExtension(directory);
		}
		if (pkg.name === tuiName) smokeTestTui(directory);
	}
	console.log(`Verified ${packages.length} isolated package consumers.`);
} finally {
	rmSync(root, { force: true, recursive: true });
}
