import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function getTargetText(o, l) {
  if (l === 'ko') return o.korean;
  if (l === 'es') return o.spanish;
  if (l === 'fr') return o.french;
  if (l === 'zh') return o.chinese;
  return o.korean || o.spanish || o.french || o.chinese;
}

const mod = await import(pathToFileURL(resolve(ROOT, 'src/data/scenarios.js')).href);
const sections = mod.sections || mod.default;
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'src/data/audioManifest.json'), 'utf-8'));

const missing = [];
function lookup(text, langId) {
  const stripped = text.replace(/[.!?。！？]+$/, '');
  return manifest[`${langId}:${text}`]
    || manifest[`${langId}:${stripped}`]
    || manifest[`${langId}:${stripped}.`]
    || manifest[`${langId}:${stripped}!`]
    || manifest[`${langId}:${stripped}?`];
}
function check(text, langId, source) {
  if (!text) return;
  if (!lookup(text, langId)) missing.push({ text, langId, source });
}

for (const section of sections) {
  const langId = section.languageId || 'ko';
  for (const sc of section.scenarios) {
    if (sc.sessions) {
      for (const sess of sc.sessions) {
        if (sess.exchanges) {
          for (const ex of sess.exchanges) {
            if (ex.speaker === 'other' && ex.expectedResponses?.length) {
              check(ex.expectedResponses[0], langId, `dialog-response:${sess.id}`);
            }
            if (ex.speaker === 'you-initiate') {
              const t = getTargetText(ex, langId) || ex.expectedResponses?.[0];
              check(t, langId, `dialog-initiate:${sess.id}`);
            }
          }
        }
      }
    }
  }
}

const koLines = missing.filter(m => m.langId === 'ko');
const lines = koLines.slice(0, 20).map((m, i) => `${i + 1}. [${m.source}] ${m.text}`).join('\n');
writeFileSync(resolve(ROOT, 'missing-ko-20.txt'), lines, 'utf-8');
console.log(`Total ko missing: ${koLines.length}`);
console.log(`Total all missing: ${missing.length}`);
