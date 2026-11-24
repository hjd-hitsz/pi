import type { InlineExtension } from "@earendil-works/pi-coding-agent/host-support/core/extensions/types";
import codemodeExtension from "@earendil-works/pi-coding-agent/host-support/extensions/codemode/index";
import { CODEMODE_TOOL_NAME } from "@earendil-works/pi-coding-agent/host-support/extensions/codemode/tool";
import { createMcpExtension } from "@earendil-works/pi-coding-agent/host-support/extensions/mcp/index";
import toolSearchExtension from "@earendil-works/pi-coding-agent/host-support/extensions/tool-search/index";
import { codemodeRenderers } from "./codemode/renderer.ts";
import llamaExtension from "./llama/index.ts";
import { createMcpToolRenderers, resolveMcpToolRenderers } from "./mcp/renderer.ts";
import { showMcpManager } from "./mcp/ui.ts";

export const builtInExtensions: InlineExtension[] = [
	{ name: "llama.cpp", factory: llamaExtension, builtin: true },
	// Replaceable: an extension that registers `codemode`, `tool_search`, or `/mcp` (such as a third-party
	// MCP extension) takes over instead of running alongside the built-in one.
	{
		name: "codemode",
		factory: async (pi) => {
			await codemodeExtension(pi);
			pi.registerToolRenderer(
				(toolName, next) => next() ?? (toolName === CODEMODE_TOOL_NAME ? codemodeRenderers : undefined),
			);
		},
		replaceable: true,
		builtin: true,
	},
	{ name: "tool-search", factory: toolSearchExtension, replaceable: true, builtin: true },
	{
		name: "mcp",
		factory: createMcpExtension({
			createToolRenderers: createMcpToolRenderers,
			renderTool: resolveMcpToolRenderers,
			showManager: showMcpManager,
		}),
		replaceable: true,
		builtin: true,
	},
];
