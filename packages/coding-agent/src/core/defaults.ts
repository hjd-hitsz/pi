import type { ThinkingLevel } from "@earendil-works/pi-agent-core";

export const DEFAULT_THINKING_LEVEL: ThinkingLevel = "medium";
export const THINKING_LEVEL_OPTIONS: readonly ThinkingLevel[] = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
];

export function isValidThinkingLevel(level: string): level is ThinkingLevel {
	return THINKING_LEVEL_OPTIONS.includes(level as ThinkingLevel);
}
