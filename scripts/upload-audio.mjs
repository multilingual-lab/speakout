#!/usr/bin/env node
/**
 * upload-audio.mjs — Upload new audio files to Cloudflare R2.
 *
 * Reads audioManifest.json and uploads files where `uploaded` is not true.
 * After each successful upload, marks the entry as `uploaded: true` in the
 * manifest (which is committed to git, so status travels across machines).
 *
 * Usage:
 *   node scripts/upload-audio.mjs
 *
 * Options:
 *   --dry-run    Show what would be uploaded without uploading
 *   --force      Re-upload all files (ignore uploaded status)
 *
 * Environment:
 *   CLOUDFLARE_API_TOKEN  — set in .env or environment (used by wrangler)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const AUDIO_DIR = join(ROOT, 'public', 'audio');
const MANIFEST_PATH = join(ROOT, 'src', 'data', 'audioManifest.json');
const R2_BUCKET = 'speakout';
const R2_PREFIX = 'audio';

// Load .env for CLOUDFLARE_API_TOKEN
config({ path: join(ROOT, '.env') });

// ── CLI flags ─────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// ── Load manifest ─────────────────────────────────────────────────────────────

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error('Error: audioManifest.json not found. Run `npm run generate-audio` first.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
}

function saveManifest(manifest) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.CLOUDFLARE_API_TOKEN && !DRY_RUN) {
    console.error('Error: CLOUDFLARE_API_TOKEN is required.');
    console.error('Set it in .env or as an environment variable.');
    process.exit(1);
  }

  const manifest = loadManifest();
  const entries = Object.entries(manifest);

  // Determine which files need uploading
  const toUpload = []; // { key, filename, localPath }
  let alreadyUploaded = 0;

  for (const [key, entry] of entries) {
    if (!FORCE && entry.uploaded) {
      alreadyUploaded++;
      continue;
    }
    const localPath = join(AUDIO_DIR, entry.filename);
    if (!existsSync(localPath)) {
      console.warn(`  ⚠ ${entry.filename} (${key}) — local file missing, skipping`);
      continue;
    }
    toUpload.push({ key, filename: entry.filename, localPath });
  }

  console.log(`Manifest: ${entries.length} entries, Already uploaded: ${alreadyUploaded}, New: ${toUpload.length}`);

  if (toUpload.length === 0) {
    console.log('Nothing to upload — all files are up to date.');
    return;
  }

  if (DRY_RUN) {
    for (const { filename } of toUpload) {
      console.log(`  [new] ${filename}`);
    }
    console.log(`\n--dry-run: ${toUpload.length} file(s) would be uploaded.`);
    return;
  }

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < toUpload.length; i++) {
    const { key, filename, localPath } = toUpload[i];
    const r2Key = `${R2_PREFIX}/${filename}`;

    process.stdout.write(`[${i + 1}/${toUpload.length}] ${filename} ... `);

    try {
      execSync(
        `npx wrangler r2 object put "${R2_BUCKET}/${r2Key}" ` +
          `--file "${localPath}" ` +
          `--content-type "audio/mpeg" ` +
          `--cache-control "public, max-age=31536000, immutable" ` +
          `--remote`,
        { stdio: 'pipe', env: { ...process.env } }
      );
      manifest[key].uploaded = true;
      succeeded++;
      console.log('OK');
    } catch (err) {
      failed++;
      console.log('FAILED');
      console.error(`  Error: ${err.message.split('\n')[0]}`);
    }
  }

  // Save manifest with updated uploaded status
  saveManifest(manifest);
  console.log(`\nDone! Uploaded: ${succeeded}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
