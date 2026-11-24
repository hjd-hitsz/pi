import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

interface PackageJson {
	bin?: { pi: string };
	main: string;
	dependencies: Record<string, string>;
	exports: Record<string, { import: string; types?: string }>;
}

const sdk = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as PackageJson;
const tui = JSON.parse(readFileSync(new URL("../../tui/package.json", import.meta.url), "utf8")) as PackageJson;

describe("package distribution entrypoints", () => {
	test("publishes a headless SDK without any executable or TUI dependency", () => {
		expect(sdk.bin).toBeUndefined();
		expect(sdk.dependencies["@earendil-works/pi-tui"]).toBeUndefined();
		expect(sdk.exports["."].import).toBe("./dist/index.js");
		expect(sdk.exports["./rpc-entry"]).toBeUndefined();
	});

	test("publishes the terminal host and executables with a dependency on the SDK", () => {
		expect(tui.dependencies["@earendil-works/pi-coding-agent"]).toBeDefined();
		expect(tui.bin?.pi).toBe("dist/bundle/cli.js");
		expect(tui.exports["./host"].import).toBe("./dist/host/index.js");
		expect(tui.exports["./rpc-entry"].import).toBe("./dist/bundle/rpc-entry.js");
	});
});
