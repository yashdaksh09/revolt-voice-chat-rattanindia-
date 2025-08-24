# Revolt Voice (Gemini Live, server-to-server)

## Run
1. `npm i`
2. Create `.env` with:
3. `node server.js`
4. Open `http://localhost:3000` and click **Start Talking**.

## Models
- Dev/testing: `gemini-live-2.5-flash-preview` (default) or `gemini-2.0-flash-live-001`
- Final submission: `gemini-2.5-flash-preview-native-audio-dialog`
- Set `GEMINI_MODEL=gemini-2.5-flash-preview-native-audio-dialog` in `.env`.

## Notes
- Input audio: browser WebM/Opus → server transcodes to PCM16@16k mono (as required).
- Output audio: PCM16@24k mono streamed to client for low-latency playback.
- Interruption: When mic starts, playback is stopped (“barge-in”); Gemini Live also handles interruption internally.