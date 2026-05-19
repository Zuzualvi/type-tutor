// Finger-to-color and key-to-finger maps used by the visual keyboard.

export const FINGERS = {
  LP: { id: 'LP', label: 'L pinky',  color: 'red',     tw: 'bg-red-100 border-red-400',     borderHex: '#f87171' },
  LR: { id: 'LR', label: 'L ring',   color: 'orange',  tw: 'bg-orange-100 border-orange-400', borderHex: '#fb923c' },
  LM: { id: 'LM', label: 'L middle', color: 'amber',   tw: 'bg-amber-100 border-amber-400',   borderHex: '#fbbf24' },
  LI: { id: 'LI', label: 'L index',  color: 'lime',    tw: 'bg-lime-100 border-lime-400',     borderHex: '#a3e635' },
  TH: { id: 'TH', label: 'Thumb',    color: 'slate',   tw: 'bg-slate-100 border-slate-400',   borderHex: '#94a3b8' },
  RI: { id: 'RI', label: 'R index',  color: 'emerald', tw: 'bg-emerald-100 border-emerald-400', borderHex: '#34d399' },
  RM: { id: 'RM', label: 'R middle', color: 'cyan',    tw: 'bg-cyan-100 border-cyan-400',     borderHex: '#22d3ee' },
  RR: { id: 'RR', label: 'R ring',   color: 'blue',    tw: 'bg-blue-100 border-blue-400',     borderHex: '#60a5fa' },
  RP: { id: 'RP', label: 'R pinky',  color: 'violet',  tw: 'bg-violet-100 border-violet-400', borderHex: '#a78bfa' },
};

// Key -> finger. Letters lowercase.
export const KEY_TO_FINGER = (() => {
  const m = {};
  const add = (finger, keys) => { for (const k of keys) m[k] = finger; };
  add('LP', ['`','1','q','a','z','Tab','CapsLock','ShiftLeft']);
  add('LR', ['2','w','s','x']);
  add('LM', ['3','e','d','c']);
  add('LI', ['4','5','r','t','f','g','v','b']);
  add('TH', [' ']);
  add('RI', ['6','7','y','u','h','j','n','m']);
  add('RM', ['8','i','k',',']);
  add('RR', ['9','o','l','.']);
  add('RP', ['0','-','=','p','[',']','\\',';','\'','/','Enter','ShiftRight','Backspace']);
  return m;
})();

// Map a character (possibly shifted) to its base unshifted key.
const SHIFT_MAP = {
  '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
  '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
  '_': '-', '+': '=',
  '{': '[', '}': ']', '|': '\\',
  ':': ';', '"': '\'',
  '<': ',', '>': '.', '?': '/',
  '~': '`',
};

export function baseKeyFor(char) {
  if (char == null) return null;
  if (char === '\n') return 'Enter';
  if (char === '\t') return 'Tab';
  if (char === ' ')  return ' ';
  if (char >= 'A' && char <= 'Z') return char.toLowerCase();
  if (SHIFT_MAP[char]) return SHIFT_MAP[char];
  return char;
}

export function isShifted(char) {
  if (char == null) return false;
  if (char >= 'A' && char <= 'Z') return true;
  return Object.prototype.hasOwnProperty.call(SHIFT_MAP, char);
}

export function fingerFor(char) {
  const base = baseKeyFor(char);
  return KEY_TO_FINGER[base] || null;
}

// For "use the *opposite* shift" rule.
export function shiftSideFor(char) {
  const base = baseKeyFor(char);
  if (!base) return null;
  const finger = KEY_TO_FINGER[base];
  if (!finger) return null;
  // Left-hand keys -> use right Shift; right-hand keys -> use left Shift.
  if (['LP','LR','LM','LI'].includes(finger)) return 'ShiftRight';
  if (['RI','RM','RR','RP'].includes(finger)) return 'ShiftLeft';
  return null;
}
