#!/usr/bin/env python3
"""
Piper TTS HTTP server — wraps the Piper binary behind an OpenTTS-compatible API.

Usage:
  python tts_server.py                           # auto-detect models in ../piper/
  python tts_server.py --piper ../piper/piper/piper.exe --models ../piper/

API:
  GET /api/tts?text=Hello&voice=es_ES-davefx-medium
  GET /api/voices                                 # list available voices

No Python ML dependencies — just subprocess calls to the Piper binary.
"""

import argparse
import glob
import os
import subprocess
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json

# Resolved at startup
PIPER_EXE = None
MODELS = {}  # voice_name -> onnx_path


def discover_models(models_dir):
    """Find all .onnx files in the models directory."""
    models = {}
    for onnx_path in glob.glob(os.path.join(models_dir, "*.onnx")):
        name = os.path.splitext(os.path.basename(onnx_path))[0]
        json_path = onnx_path + ".json"
        if os.path.exists(json_path):
            models[name] = onnx_path
    return models


class PiperHandler(BaseHTTPRequestHandler):
    """HTTP handler for Piper TTS."""

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/voices":
            self._handle_voices()
        elif parsed.path == "/api/tts":
            self._handle_tts(parsed)
        else:
            self.send_error(404, "Not Found")

    def _handle_voices(self):
        voices = [{"id": name, "model": os.path.basename(path)} for name, path in MODELS.items()]
        body = json.dumps(voices, indent=2).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _handle_tts(self, parsed):
        query = parse_qs(parsed.query)
        text = query.get("text", [""])[0]
        voice = query.get("voice", [""])[0]

        if not text:
            self.send_error(400, "Missing 'text' parameter")
            return

        # Resolve model
        if voice and voice in MODELS:
            model_path = MODELS[voice]
        elif MODELS:
            # Default to first available model
            model_path = next(iter(MODELS.values()))
        else:
            self.send_error(500, "No voice models found")
            return

        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                wav_path = tmp.name

            cmd = [PIPER_EXE, "--model", model_path, "--output_file", wav_path]
            result = subprocess.run(
                cmd,
                input=text.encode("utf-8"),
                capture_output=True,
                timeout=30,
            )

            if result.returncode != 0:
                stderr = result.stderr.decode("utf-8", errors="replace")
                print(f"Piper error: {stderr}")
                self.send_error(500, f"Piper failed: {stderr[:200]}")
                return

            with open(wav_path, "rb") as f:
                audio_data = f.read()

            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", len(audio_data))
            self.end_headers()
            self.wfile.write(audio_data)
            print(f"  ✓ [{voice or 'default'}] \"{text[:40]}\" → {len(audio_data)} bytes")

        except subprocess.TimeoutExpired:
            self.send_error(504, "Piper timed out")
        except Exception as e:
            print(f"Error: {e}")
            self.send_error(500, str(e))
        finally:
            if os.path.exists(wav_path):
                os.unlink(wav_path)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Piper TTS HTTP server")
    parser.add_argument("--piper", default=None, help="Path to piper executable")
    parser.add_argument("--models", default=None, help="Directory containing .onnx model files")
    parser.add_argument("--port", type=int, default=5500, help="Port (default: 5500)")
    args = parser.parse_args()

    # Auto-detect piper location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    search_paths = [
        args.piper,
        os.path.join(script_dir, "..", "piper", "piper", "piper.exe"),
        os.path.join(script_dir, "..", "piper", "piper", "piper"),
        os.path.join(script_dir, "piper", "piper.exe"),
        os.path.join(script_dir, "piper", "piper"),
    ]
    for p in search_paths:
        if p and os.path.isfile(p):
            PIPER_EXE = os.path.abspath(p)
            break

    if not PIPER_EXE:
        print("Error: piper executable not found. Use --piper to specify path.")
        exit(1)

    # Auto-detect models directory
    models_dir = args.models or os.path.join(script_dir, "..", "piper")
    MODELS = discover_models(os.path.abspath(models_dir))

    if not MODELS:
        print(f"Warning: No .onnx voice models found in {models_dir}")
        print("Download models from: https://github.com/rhasspy/piper/blob/master/VOICES.md")
    else:
        print(f"Found {len(MODELS)} voice(s): {', '.join(MODELS.keys())}")

    print(f"Piper binary: {PIPER_EXE}")
    server = HTTPServer(("127.0.0.1", args.port), PiperHandler)
    print(f"\n🎙️  Piper TTS server running at http://localhost:{args.port}")
    print(f"   Synthesize:    GET /api/tts?text=...&voice=...")
    print(f"   List voices:   GET /api/voices")
    print(f"   Press Ctrl+C to stop\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n✓ Server stopped")
