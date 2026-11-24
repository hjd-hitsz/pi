import type {
	AutocompleteProvider as TerminalAutocompleteProvider,
	Component as TerminalComponent,
	EditorComponent as TerminalEditorComponent,
	EditorTheme as TerminalEditorTheme,
	Keybinding as TerminalKeybinding,
	KeyId as TerminalKeyId,
	OverlayHandle as TerminalOverlayHandle,
	OverlayOptions as TerminalOverlayOptions,
	ProgramStatus as TerminalProgramStatus,
	TUI as TerminalUI,
} from "../../../index.ts";
import type {
	AppKeybinding as TerminalAppKeybinding,
	KeybindingsManager as TerminalKeybindingsManager,
} from "../../core/keybindings.ts";
import type { Theme as TerminalTheme } from "./theme/theme.ts";

declare module "@earendil-works/pi-coding-agent/host-support/core/extension-host-types" {
	interface TerminalExtensionHostTypes {
		theme: TerminalTheme;
		component: TerminalComponent;
		tui: TerminalUI;
		overlayOptions: TerminalOverlayOptions;
		overlayHandle: TerminalOverlayHandle;
		programStatus: TerminalProgramStatus;
		editorComponent: TerminalEditorComponent;
		editorTheme: TerminalEditorTheme;
		autocompleteProvider: TerminalAutocompleteProvider;
		keybinding: TerminalKeybinding;
		keyId: TerminalKeyId;
		appKeybinding: TerminalAppKeybinding;
		keybindingsManager: TerminalKeybindingsManager;
	}
}
