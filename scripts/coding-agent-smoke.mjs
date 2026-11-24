import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const codingAgentName = "@earendil-works/pi-coding-agent";
export const tuiName = "@earendil-works/pi-tui";

export function smokeTestCodingAgent(directory, runtime = process.execPath) {
	const packageDir = join(directory, "node_modules", codingAgentName);
	const manifest = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
	assert.equal(manifest.bin, undefined);
	assert.equal(manifest.dependencies?.[tuiName], undefined);
	withSmokeEnvironment(directory, runtime, (run) => {
		const entry = join(directory, "coding-agent-smoke.mjs");
		try {
			writeFileSync(entry, `import assert from "node:assert/strict";
import { createAgentSession, SessionManager, ModelRuntime } from "${codingAgentName}";
assert.equal(typeof createAgentSession, "function");
assert.equal(typeof SessionManager.inMemory, "function");
assert.equal(typeof ModelRuntime.create, "function");
assert.throws(() => import.meta.resolve("${tuiName}"), { code: "ERR_MODULE_NOT_FOUND" });
`);
			run([entry]);
		} finally {
			rmSync(entry, { force: true });
		}
	});
	console.log(`Headless SDK smoke tests passed (${runtime}).`);
}

export function smokeTestTui(directory, runtime = process.execPath) {
	const packageDir = join(directory, "node_modules", tuiName);
	const manifest = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
	withSmokeEnvironment(directory, runtime, (run) => {
		const cli = join(packageDir, manifest.bin.pi);
		assert.equal(run([cli, "--version"]).trim(), manifest.version);
		const rpc = join(packageDir, manifest.exports["./rpc-entry"].import);
		const state = run([rpc, "--offline", "--no-session"], '{"id":"smoke","type":"get_state"}\n');
		assert.ok(state.trim().split("\n").some((line) => {
			const response = JSON.parse(line);
			return response.id === "smoke" && response.type === "response" && response.success === true;
		}));
		const extension = join(directory, "legacy-ui-extension.ts");
		try {
			writeFileSync(extension, `import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
export default function (pi) {
	if (typeof DynamicBorder !== "function" || typeof Text !== "function") throw new Error("Missing UI components");
	pi.registerFlag("legacy-ui-smoke", { type: "boolean", description: "Legacy extension loaded" });
}
`);
			assert.match(run([cli, "--offline", "--no-session", "-e", extension, "--help"]), /--legacy-ui-smoke/);
		} finally {
			rmSync(extension, { force: true });
		}
	});
	console.log(`TUI host smoke tests passed (${runtime}).`);
}

export function smokeTestSdkExtension(directory) {
	withSmokeEnvironment(directory, process.execPath, (run) => {
		const entry = join(directory, "sdk-plugin-smoke.mjs");
		const extension = join(directory, "sdk-plugin.mts");
		try {
			writeFileSync(extension, `import { defineTool, type ExtensionAPI } from "${codingAgentName}";
import { Type } from "typebox";
export default function (pi: ExtensionAPI) {
	pi.on("session_start", () => pi.appendEntry("smoke-started", true));
	pi.registerTool(defineTool({
		name: "smoke_echo", label: "Echo", description: "Echo text", parameters: Type.Object({ text: Type.String() }),
		async execute(_id, args) { return { content: [{ type: "text", text: args.text }], details: null }; },
	}));
}
`);
			const compilerPackageDir = dirname(fileURLToPath(import.meta.resolve("typescript/package.json")));
			run([
				join(compilerPackageDir, "bin", "tsc"),
				"--noEmit", "--pretty", "false", "--strict", "--skipLibCheck",
				"--target", "ES2022", "--module", "NodeNext", extension,
			]);
			writeFileSync(entry, `import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxToolCall, registerFauxProvider } from "@earendil-works/pi-ai/compat";
import { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } from "${codingAgentName}";
const cwd = process.cwd();
const agentDir = process.env.PI_CODING_AGENT_DIR;
const settingsManager = SettingsManager.inMemory();
const resourceLoader = new DefaultResourceLoader({
	cwd, agentDir, settingsManager, noExtensions: true, additionalExtensionPaths: [${JSON.stringify(extension)}],
});
await resourceLoader.reload();
const faux = registerFauxProvider({});
const model = faux.getModel();
const modelRuntime = await ModelRuntime.create();
modelRuntime.registerProvider(model.provider, {
	api: faux.api, apiKey: "faux-key", baseUrl: model.baseUrl, models: [model],
});
faux.setResponses([
	fauxAssistantMessage([fauxToolCall("smoke_echo", { text: "extension-result" })], { stopReason: "toolUse" }),
	fauxAssistantMessage("done"),
]);
const sessionManager = SessionManager.inMemory(cwd);
const { session, extensionsResult } = await createAgentSession({
	cwd, agentDir, model, modelRuntime, settingsManager, resourceLoader, sessionManager, noTools: "builtin",
});
try {
	assert.deepEqual(extensionsResult.errors, []);
	await session.bindExtensions({});
	assert.ok(sessionManager.getBranch().some((entry) => entry.type === "custom" && entry.customType === "smoke-started"));
	await session.prompt("Run the echo tool");
	const result = session.messages.find((message) => message.role === "toolResult" && message.toolName === "smoke_echo");
	assert.equal(result?.content[0]?.text, "extension-result");
} finally { session.dispose(); }
`);
			run([entry]);
		} finally {
			rmSync(extension, { force: true });
			rmSync(entry, { force: true });
		}
	});
	console.log("File extension type-check and tool execution passed with the installed headless SDK.");
}

function withSmokeEnvironment(directory, runtime, execute) {
	const home = mkdtempSync(join(tmpdir(), "pi-coding-agent-smoke-home-"));
	const env = {
		PATH: process.env.PATH,
		HOME: home,
		USERPROFILE: home,
		APPDATA: home,
		LOCALAPPDATA: home,
		XDG_CONFIG_HOME: home,
		XDG_CACHE_HOME: home,
		PI_CODING_AGENT_DIR: join(home, ".pi", "agent"),
		PI_OFFLINE: "1",
		PI_TELEMETRY: "0",
	};
	for (const name of ["SystemRoot", "SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT"]) {
		if (process.env[name]) env[name] = process.env[name];
	}
	try {
		execute((args, input) => execFileSync(runtime, args, {
			cwd: directory,
			encoding: "utf8",
			env,
			input,
			stdio: ["pipe", "pipe", "pipe"],
			timeout: 30_000,
		}));
	} finally {
		rmSync(home, { recursive: true, force: true });
	}
}
