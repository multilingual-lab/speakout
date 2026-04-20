#!/usr/bin/env node
/**
 * generate-audio.mjs — Pre-generate Azure TTS audio for all fixed conversation lines.
 *
 * Extracts every TTS-able line from scenarios.js, calls Azure Speech API,
 * and writes MP3 files with content-hash filenames to public/audio/.
 * Produces src/data/audioManifest.json mapping (text + languageId) → filename.
 *
 * Usage:
 *   AZURE_SPEECH_KEY=xxx AZURE_SPEECH_ENDPOINT=https://eastus.tts.speech.microsoft.com \
 *     node scripts/generate-audio.mjs
 *
 * Options:
 *   --dry-run    List lines without calling Azure API
 *   --force      Re-generate even if MP3 already exists on disk
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const AUDIO_DIR = join(ROOT, 'public', 'audio');
const MANIFEST_PATH = join(ROOT, 'src', 'data', 'audioManifest.json');

// ── Azure config ──────────────────────────────────────────────────────────────
const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_ENDPOINT = process.env.AZURE_SPEECH_ENDPOINT;
const RATE = '0.9';
const OUTPUT_FORMAT = 'audio-16khz-128kbitrate-mono-mp3';

// ── Language → Azure voice mapping (mirrors src/config/languages.js) ─────────
const VOICE_MAP = {
  ko: { voice: 'ko-KR-SunHiNeural', ssmlLang: 'ko-KR' },
  es: { voice: 'es-ES-ElviraNeural', ssmlLang: 'es-ES' },
  fr: { voice: 'fr-FR-CelesteNeural', ssmlLang: 'fr-FR' },
  zh: { voice: 'zh-CN-XiaoxiaoNeural', ssmlLang: 'zh-CN' },
};

// ── CLI flags ─────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashKey(text, langId) {
  return createHash('sha256').update(`${text}|${langId}|${RATE}`).digest('hex').slice(0, 16);
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSsml(text, voice, ssmlLang) {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${ssmlLang}">
  <voice name="${voice}">
    <prosody rate="${RATE}">${escapeXml(text)}</prosody>
  </voice>
</speak>`;
}

async function synthesize(text, voice, ssmlLang) {
  const ssml = buildSsml(text, voice, ssmlLang);
  const res = await fetch(`${AZURE_ENDPOINT}/tts/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': OUTPUT_FORMAT,
    },
    body: ssml,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Azure TTS ${res.status}: ${errBody}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Simple delay to stay under Azure rate limits (20 req/min free tier). */
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Text field resolution per language ────────────────────────────────────────
// Korean sections use `korean`, Spanish sections use `spanish`.

function getTargetText(obj, langId) {
  if (langId === 'ko') return obj.korean;
  if (langId === 'es') return obj.spanish;
  if (langId === 'fr') return obj.french;
  if (langId === 'zh') return obj.chinese;
  return obj.korean || obj.spanish || obj.french || obj.chinese;
}

// ── Extract all TTS lines from scenarios ─────────────────────────────────────

function extractLines(sections) {
  const lines = []; // { text, langId, source }
  const seen = new Set();

  function add(text, langId, source) {
    if (!text) return;
    const key = `${text}|${langId}`;
    if (seen.has(key)) return;
    seen.add(key);
    lines.push({ text, langId, source });
  }

  for (const section of sections) {
    const langId = section.languageId || 'ko';

    for (const scenario of section.scenarios) {
      // Shadow phrases
      if (scenario.shadow) {
        for (const s of scenario.shadow) {
          add(getTargetText(s, langId), langId, `shadow:${scenario.id}`);
        }
      }

      // Dialog exchanges (NPC lines only)
      if (scenario.sessions) {
        for (const session of scenario.sessions) {
          if (session.exchanges) {
            for (const ex of session.exchanges) {
              if (ex.speaker === 'other') {
                add(getTargetText(ex, langId), langId, `exchange:${session.id}`);
              }
            }
          }
        }
      }

      // Monologue model answers
      if (scenario.monologues) {
        for (const m of scenario.monologues) {
          if (m.modelAnswer) {
            add(m.modelAnswer, langId, `monologue:${m.id}`);
          }
        }
      }
    }
  }

  return lines;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Dynamically load scenarios.js (ESM, browser-style export)
  // We need to handle `const sections = [...]` + `export default sections`
  // by reading the file as text and evaluating the array.
  const scenariosPath = join(ROOT, 'src', 'data', 'scenarios.js');
  const scenariosUrl = pathToFileURL(scenariosPath).href;

  // scenarios.js defines `const sections = [...]` and exports at the bottom.
  // We extract sections by importing it (Node can handle ESM).
  // But it may use browser-only patterns — let's try dynamic import first.
  let sections;
  try {
    const mod = await import(scenariosUrl);
    sections = mod.sections || mod.default;
  } catch (err) {
    // Fallback: regex-extract the array (shouldn't happen with ESM)
    throw new Error(`Could not import scenarios.js: ${err.message}`);
  }

  if (!Array.isArray(sections)) {
    throw new Error('scenarios.js did not export an array of sections');
  }

  const lines = extractLines(sections);
  console.log(`Found ${lines.length} TTS-able lines`);

  if (DRY_RUN) {
    for (const l of lines) {
      const hash = hashKey(l.text, l.langId);
      console.log(`  [${l.langId}] ${hash} ${l.source} — ${l.text.slice(0, 60)}`);
    }
    console.log('\n--dry-run: no API calls made.');
    return;
  }

  // Validate Azure credentials
  if (!AZURE_KEY || !AZURE_ENDPOINT) {
    console.error('Error: AZURE_SPEECH_KEY and AZURE_SPEECH_ENDPOINT environment variables are required.');
    console.error('Example:');
    console.error('  $env:AZURE_SPEECH_KEY="your-key"');
    console.error('  $env:AZURE_SPEECH_ENDPOINT="https://eastus.tts.speech.microsoft.com"');
    console.error('  node scripts/generate-audio.mjs');
    process.exit(1);
  }

  mkdirSync(AUDIO_DIR, { recursive: true });

  // Load existing manifest for incremental mode
  let manifest = {};
  if (existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
    } catch {
      manifest = {};
    }
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const line of lines) {
    const voiceCfg = VOICE_MAP[line.langId];
    if (!voiceCfg) {
      console.warn(`  SKIP (no voice mapping): [${line.langId}] ${line.text.slice(0, 50)}`);
      skipped++;
      continue;
    }

    const hash = hashKey(line.text, line.langId);
    const filename = `${hash}.mp3`;
    const filepath = join(AUDIO_DIR, filename);
    const manifestKey = `${line.langId}:${line.text}`;

    // Incremental: skip if already uploaded to CDN (no local file needed)
    // or if local file exists and manifest entry matches
    if (!FORCE && manifest[manifestKey]?.filename === filename) {
      if (manifest[manifestKey]?.uploaded || existsSync(filepath)) {
        skipped++;
        continue;
      }
    }

    try {
      console.log(`  [${line.langId}] Generating ${filename} — ${line.text.slice(0, 50)}...`);
      const mp3 = await synthesize(line.text, voiceCfg.voice, voiceCfg.ssmlLang);
      writeFileSync(filepath, mp3);
      manifest[manifestKey] = {
        filename,
        voice: voiceCfg.voice,
        rate: RATE,
        uploaded: false,
      };
      generated++;

      // Rate-limit: ~3 seconds between requests for free tier (20/min)
      await delay(3200);
    } catch (err) {
      console.error(`  FAIL [${line.langId}] ${line.text.slice(0, 50)}: ${err.message}`);
      failed++;
    }
  }

  // Write manifest
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`Audio dir: ${AUDIO_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
