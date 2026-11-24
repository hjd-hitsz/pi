import { loadPngTranscoder } from "@earendil-works/pi-coding-agent/host-support/utils/image-convert";
import { getCapabilities, setImageTranscoder } from "../../../index.ts";

let pngTranscoderLoad: Promise<boolean> | undefined;
let pngTranscoderRegistered = false;

/**
 * Register the PNG transcoder on Kitty terminals. Notify callers when images can be rendered.
 */
export function ensurePngTranscoder(onRegistered: () => void): void {
	if (pngTranscoderRegistered || getCapabilities().images !== "kitty") return;
	pngTranscoderLoad ??= loadPngTranscoder().then((transcoder) => {
		if (!transcoder) return false;
		setImageTranscoder(transcoder);
		pngTranscoderRegistered = true;
		return true;
	});
	void pngTranscoderLoad.then((registered) => {
		if (registered) onRegistered();
	});
}
