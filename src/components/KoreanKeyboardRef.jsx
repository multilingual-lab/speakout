import { useState, useRef } from 'react';

/* ── Korean Jamo Composition Tables ─────────────────────────────────── */

const INITIAL_MAP = {
  'ㄱ':0,'ㄲ':1,'ㄴ':2,'ㄷ':3,'ㄸ':4,'ㄹ':5,'ㅁ':6,'ㅂ':7,'ㅃ':8,
  'ㅅ':9,'ㅆ':10,'ㅇ':11,'ㅈ':12,'ㅉ':13,'ㅊ':14,'ㅋ':15,'ㅌ':16,'ㅍ':17,'ㅎ':18,
};

const INITIAL_JAMO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split('');

const MEDIAL_MAP = {
  'ㅏ':0,'ㅐ':1,'ㅑ':2,'ㅒ':3,'ㅓ':4,'ㅔ':5,'ㅕ':6,'ㅖ':7,'ㅗ':8,
  'ㅘ':9,'ㅙ':10,'ㅚ':11,'ㅛ':12,'ㅜ':13,'ㅝ':14,'ㅞ':15,'ㅟ':16,
  'ㅠ':17,'ㅡ':18,'ㅢ':19,'ㅣ':20,
};

const FINAL_MAP = {
  'ㄱ':1,'ㄲ':2,'ㄴ':4,'ㄷ':7,'ㄹ':8,'ㅁ':16,'ㅂ':17,
  'ㅅ':19,'ㅆ':20,'ㅇ':21,'ㅈ':22,'ㅊ':23,'ㅋ':24,'ㅌ':25,'ㅍ':26,'ㅎ':27,
};

const FINAL_TO_INITIAL = {};
for (const [jamo, fi] of Object.entries(FINAL_MAP)) {
  FINAL_TO_INITIAL[fi] = jamo;
}

// Compound vowels: medialIndex1,medialIndex2 → combined medialIndex
const COMPOUND_VOWELS = {
  '8,0':9, '8,1':10, '8,20':11,    // ㅗ+ㅏ=ㅘ, ㅗ+ㅐ=ㅙ, ㅗ+ㅣ=ㅚ
  '13,4':14, '13,5':15, '13,20':16, // ㅜ+ㅓ=ㅝ, ㅜ+ㅔ=ㅞ, ㅜ+ㅣ=ㅟ
  '18,20':19,                       // ㅡ+ㅣ=ㅢ
};

// Compound finals: finalIndex,jamo → combined finalIndex
const COMPOUND_FINALS = {
  '1,ㅅ':3, '4,ㅈ':5, '4,ㅎ':6, '8,ㄱ':9, '8,ㅁ':10, '8,ㅂ':11,
  '8,ㅅ':12, '8,ㅌ':13, '8,ㅍ':14, '8,ㅎ':15, '17,ㅅ':18,
};

const COMPOUND_FINAL_SPLIT = {
  3:[1,'ㅅ'], 5:[4,'ㅈ'], 6:[4,'ㅎ'], 9:[8,'ㄱ'], 10:[8,'ㅁ'],
  11:[8,'ㅂ'], 12:[8,'ㅅ'], 13:[8,'ㅌ'], 14:[8,'ㅍ'], 15:[8,'ㅎ'], 18:[17,'ㅅ'],
};

function buildChar(comp) {
  if (comp.medial === -1) return INITIAL_JAMO[comp.initial];
  return String.fromCharCode(0xAC00 + (comp.initial * 21 + comp.medial) * 28 + comp.final);
}

/* ── Keyboard Layout ────────────────────────────────────────────────── */

const NORMAL_ROWS = [
  ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'],
  ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'],
  ['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ'],
];

const SHIFT_ROWS = [
  ['ㅃ','ㅉ','ㄸ','ㄲ','ㅆ','ㅛ','ㅕ','ㅑ','ㅒ','ㅖ'],
  ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'],
  ['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ'],
];

const QWERTY_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

const KEY_W = 52, KEY_H = 52, GAP = 5;
const ROW_OFFSETS = [0, 26, 52];

/* ── Component ──────────────────────────────────────────────────────── */

export default function KoreanKeyboardRef({ value, onChange }) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('kb-ref-open') === '1'; } catch { return false; }
  });
  const [shift, setShift] = useState(false);
  const compRef = useRef(null);     // current composition state
  const lastValueRef = useRef(value); // detect external edits

  // If value changed externally (user typed in textarea), reset composition
  if (value !== lastValueRef.current) {
    compRef.current = null;
    lastValueRef.current = value;
  }

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem('kb-ref-open', next ? '1' : '0'); } catch {}
  };

  const emit = (newValue, newComp) => {
    compRef.current = newComp;
    lastValueRef.current = newValue;
    onChange(newValue);
  };

  const handleKey = (jamo) => {
    const comp = compRef.current;
    const isVowel = MEDIAL_MAP[jamo] !== undefined;

    if (!isVowel) {
      // ── Consonant ──
      const ii = INITIAL_MAP[jamo];
      if (ii === undefined) return;

      if (!comp || comp.medial === -1) {
        // No composition or bare initial → finalize, start new initial
        emit(value + jamo, { initial: ii, medial: -1, final: 0 });
      } else if (comp.final === 0) {
        // Has initial+vowel, no final → add as final if possible
        const fi = FINAL_MAP[jamo];
        if (fi !== undefined) {
          const nc = { ...comp, final: fi };
          emit(value.slice(0, -1) + buildChar(nc), nc);
        } else {
          // ㄸ/ㅃ/ㅉ can't be finals → finalize, new initial
          emit(value + jamo, { initial: ii, medial: -1, final: 0 });
        }
      } else {
        // Already has final → try compound final
        const cf = COMPOUND_FINALS[comp.final + ',' + jamo];
        if (cf !== undefined) {
          const nc = { ...comp, final: cf };
          emit(value.slice(0, -1) + buildChar(nc), nc);
        } else {
          // Can't compound → finalize, new initial
          emit(value + jamo, { initial: ii, medial: -1, final: 0 });
        }
      }
    } else {
      // ── Vowel ──
      const mi = MEDIAL_MAP[jamo];

      if (!comp) {
        // No active composition → standalone vowel
        emit(value + jamo, null);
      } else if (comp.medial === -1) {
        // Bare initial → add vowel
        const nc = { ...comp, medial: mi, final: 0 };
        emit(value.slice(0, -1) + buildChar(nc), nc);
      } else if (comp.final === 0) {
        // Initial+vowel → try compound vowel
        const cv = COMPOUND_VOWELS[comp.medial + ',' + mi];
        if (cv !== undefined) {
          const nc = { ...comp, medial: cv };
          emit(value.slice(0, -1) + buildChar(nc), nc);
        } else {
          // Can't compound → finalize, standalone vowel
          emit(value + jamo, null);
        }
      } else {
        // Has final → split: carry final consonant to next syllable
        const split = COMPOUND_FINAL_SPLIT[comp.final];
        const newFinal = split ? split[0] : 0;
        const carried = split ? split[1] : FINAL_TO_INITIAL[comp.final];
        const prevComp = { ...comp, final: newFinal };
        const newComp = { initial: INITIAL_MAP[carried], medial: mi, final: 0 };
        emit(value.slice(0, -1) + buildChar(prevComp) + buildChar(newComp), newComp);
      }
    }

    if (shift) setShift(false);
  };

  const handleBackspace = () => {
    const comp = compRef.current;
    if (!comp) {
      if (value.length > 0) emit(value.slice(0, -1), null);
    } else if (comp.final > 0) {
      const split = COMPOUND_FINAL_SPLIT[comp.final];
      if (split) {
        const nc = { ...comp, final: split[0] };
        emit(value.slice(0, -1) + buildChar(nc), nc);
      } else {
        const nc = { ...comp, final: 0 };
        emit(value.slice(0, -1) + buildChar(nc), nc);
      }
    } else if (comp.medial !== -1) {
      const nc = { ...comp, medial: -1, final: 0 };
      emit(value.slice(0, -1) + buildChar(nc), nc);
    } else {
      emit(value.slice(0, -1), null);
    }
  };

  const handleSpace = () => emit(value + ' ', null);

  const rows = shift ? SHIFT_ROWS : NORMAL_ROWS;
  const totalW = QWERTY_ROWS[0].length * (KEY_W + GAP);
  const totalH = 3 * (KEY_H + GAP) + 8;

  return (
    <div className="kb-ref-wrapper">
      <button className="kb-ref-toggle" onClick={toggle} type="button">
        ⌨️ {open ? 'Hide' : 'Show'} keyboard
      </button>
      {open && (
        <div className="kb-ref-panel" onMouseDown={(e) => e.preventDefault()}>
          <svg
            className="kb-ref-svg"
            viewBox={`0 0 ${totalW} ${totalH}`}
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Korean keyboard"
          >
            {QWERTY_ROWS.map((row, ri) =>
              row.map((qKey, ci) => {
                const x = ROW_OFFSETS[ri] + ci * (KEY_W + GAP);
                const y = ri * (KEY_H + GAP);
                const krKey = rows[ri]?.[ci] || '';
                const isShifted = shift && ri === 0 && ci < 5;
                return (
                  <g key={`${ri}-${ci}`} className="kb-key" onClick={() => handleKey(krKey)}>
                    <rect
                      x={x} y={y} width={KEY_W} height={KEY_H} rx={6}
                      className={`kb-key-rect ${isShifted ? 'kb-key-shifted' : ''}`}
                    />
                    <text x={x + KEY_W / 2} y={y + 21} className="kb-key-kr">
                      {krKey}
                    </text>
                    <text x={x + KEY_W / 2} y={y + 42} className="kb-key-en">
                      {qKey}
                    </text>
                  </g>
                );
              })
            )}
          </svg>
          <div className="kb-ref-actions">
            <button
              className={`kb-ref-btn ${shift ? 'active' : ''}`}
              onClick={() => setShift((s) => !s)}
              type="button"
            >
              ⇧ Shift
            </button>
            <button className="kb-ref-btn kb-ref-space" onClick={handleSpace} type="button">
              Space
            </button>
            <button className="kb-ref-btn" onClick={handleBackspace} type="button">
              ⌫
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
