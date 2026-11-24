/**
 * Run one prompt through a Pi RPC child process.
 *
 * Build the TUI host first, then run:
 * node examples/rpc-client.ts "Explain this repository"
 */

import { RpcClient } from "@earendil-works/pi-tui/host";

const prompt = process.argv.slice(2).join(" ") || "Explain this repository in one paragraph.";

const client = new RpcClient({
	args: ["--no-session"],
});

const unsubscribe = client.onEvent((event) => {
	if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
		process.stdout.write(event.assistantMessageEvent.delta);
	} else if (event.type === "tool_execution_start") {
		process.stderr.write(`\n[tool: ${event.toolName}]\n`);
	}
});

try {
	await client.start();
	await client.promptAndWait(prompt);
	process.stdout.write("\n");
} finally {
	unsubscribe();
	await client.stop();
}
