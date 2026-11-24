import type {
	ToolRendererResolver,
	ToolRenderers,
} from "@earendil-works/pi-coding-agent/host-support/core/extensions/types";
import type { McpToolDetails } from "@earendil-works/pi-coding-agent/host-support/extensions/mcp/tools";
import { Container, Spacer, Text } from "../../../index.ts";
import { formatToolCallWithArgs, getTextOutput, replaceTabs } from "../../core/tools/render-utils.ts";
import { keyHint } from "../../modes/interactive/components/keybinding-hints.ts";
import { VisualLinePreview } from "../../modes/interactive/components/visual-truncate.ts";

const OUTPUT_PREVIEW_LINES = 5;

export const resolveMcpToolRenderers: ToolRendererResolver = (toolName, next) => {
	const match = /^mcp__(.+?)__(.+)$/.exec(toolName);
	return next() ?? (match ? createMcpToolRenderers(`${match[1]}/${match[2]}`) : undefined);
};

export function createMcpToolRenderers(label: string): ToolRenderers {
	return {
		renderCall(args, theme, context) {
			const component = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			component.setText(formatToolCallWithArgs(label, args, theme, context.expanded));
			return component;
		},
		renderResult(result, options, theme, context) {
			const component = (context.lastComponent as Container | undefined) ?? new Container();
			component.clear();
			const output = getTextOutput(result, context.showImages).trim();
			if (!output) return component;
			const color = context.isError ? "error" : "toolOutput";
			const styled = replaceTabs(output)
				.split("\n")
				.map((line) => theme.fg(color, line))
				.join("\n");
			component.addChild(new Spacer(1));
			if (options.expanded) {
				component.addChild(new Text(styled, 0, 0));
			} else {
				// Limit wrapped lines, not logical ones: MCP results are often one long JSON line.
				component.addChild(
					new VisualLinePreview({
						text: styled,
						maxVisualLines: OUTPUT_PREVIEW_LINES,
						keep: "start",
						formatHint: (hidden) =>
							`${theme.fg("muted", `... (${hidden} more lines,`)} ${keyHint("app.tools.expand", "to expand")}${theme.fg("muted", ")")}`,
					}),
				);
				const fullOutputPath = (result.details as McpToolDetails | undefined)?.fullOutputPath;
				if (fullOutputPath) component.addChild(new Text(theme.fg("muted", `Full output: ${fullOutputPath}`), 0, 0));
			}
			return component;
		},
	};
}
