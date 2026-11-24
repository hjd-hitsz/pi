import type { SourceInfo } from "./source-info.ts";

export interface TerminalExtensionHostTypes {
	[hostType: string]: unknown;
}

type HostType<Key extends string, Default = never> = unknown extends TerminalExtensionHostTypes[Key]
	? Default
	: TerminalExtensionHostTypes[Key];

export type Theme = HostType<
	"theme",
	{ readonly name?: string; readonly sourcePath?: string; sourceInfo?: SourceInfo }
>;
export type Component = HostType<"component", { render(width: number): string[]; invalidate(): void }>;
export type TUI = HostType<"tui">;
export type OverlayOptions = HostType<"overlayOptions">;
export type OverlayHandle = HostType<"overlayHandle">;
export type ProgramStatus = HostType<"programStatus", { kind?: string }>;
export type EditorComponent = HostType<"editorComponent">;
export type EditorTheme = HostType<"editorTheme">;
export type AutocompleteProvider = HostType<"autocompleteProvider">;
export type AutocompleteItem = { value: string; label: string; description?: string };
export type Keybinding = HostType<"keybinding", string>;
export type KeyId = HostType<"keyId", string>;
export type AppKeybinding = HostType<"appKeybinding", `app.${string}`>;
export type KeybindingsManager = HostType<"keybindingsManager">;
export type KeybindingsConfig = Record<string, KeyId | KeyId[] | undefined>;

export type ScrollViewScrollbar = "hidden" | "auto" | "always";
export type WheelScrollLines = number | "auto";
export interface TerminalCapabilities {
	images: "kitty" | "iterm2" | null;
	trueColor: boolean;
	hyperlinks: boolean;
}
