import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	findNodePackageDir,
	getPackageDir as getSdkPackageDir,
	isBunBinary,
} from "@earendil-works/pi-coding-agent/host-support/config";
import { normalizePath } from "@earendil-works/pi-coding-agent/host-support/utils/paths";

export * from "@earendil-works/pi-coding-agent/host-support/config";

export const PACKAGE_NAME = "@earendil-works/pi-tui";

export function getPackageDir(): string {
	const override = process.env.PI_PACKAGE_DIR;
	if (override) return normalizePath(override);
	if (isBunBinary) return dirname(process.execPath);
	return findNodePackageDir(dirname(fileURLToPath(import.meta.url)));
}

export function getThemesDir(): string {
	return hostAssetDir("theme", "modes", "interactive", "theme");
}

export function getChangelogPath(): string {
	return join(getSdkPackageDir(), "CHANGELOG.md");
}

export function getTerminalDocumentation(): string {
	const packageDir = getPackageDir();
	const guideDir = isBunBinary
		? packageDir
		: existsSync(join(packageDir, "src", "host"))
			? getSdkPackageDir()
			: join(packageDir, "dist", "host");
	return `Terminal host documentation: ${join(guideDir, "docs")}
- Read cli.md for CLI usage, themes.md for themes, tui.md for TUI components, keybindings.md for shortcuts, and rpc.md for RPC.
- Terminal extension examples: ${join(guideDir, "examples", "extensions")}`;
}

export function getExportTemplateDir(): string {
	return hostAssetDir("export-html", "core", "export-html");
}

export function getBundledInteractiveAssetPath(name: string): string {
	return join(hostAssetDir("assets", "modes", "interactive", "assets"), name);
}

function hostAssetDir(binaryDir: string, ...path: string[]): string {
	const packageDir = getPackageDir();
	if (isBunBinary) return join(packageDir, binaryDir);
	const sourceDir = existsSync(join(packageDir, "src")) ? "src" : "dist";
	return join(packageDir, sourceDir, "host", ...path);
}
