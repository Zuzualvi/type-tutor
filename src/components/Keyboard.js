import { FINGERS, KEY_TO_FINGER, baseKeyFor, isShifted, shiftSideFor } from '../engine/fingerMap.js';

// Standard QWERTY layout. Each entry is [keyCode, label, widthClass].
// keyCode matches what we use in KEY_TO_FINGER / what baseKeyFor returns.
const ROWS = [
  [['`','`','w-10'],['1','1','w-10'],['2','2','w-10'],['3','3','w-10'],['4','4','w-10'],['5','5','w-10'],
   ['6','6','w-10'],['7','7','w-10'],['8','8','w-10'],['9','9','w-10'],['0','0','w-10'],
   ['-','-','w-10'],['=','=','w-10'],['Backspace','⌫','w-20']],
  [['Tab','Tab','w-16'],['q','q','w-10'],['w','w','w-10'],['e','e','w-10'],['r','r','w-10'],['t','t','w-10'],
   ['y','y','w-10'],['u','u','w-10'],['i','i','w-10'],['o','o','w-10'],['p','p','w-10'],
   ['[','[','w-10'],[']',']','w-10'],['\\','\\','w-14']],
  [['CapsLock','Caps','w-20'],['a','a','w-10'],['s','s','w-10'],['d','d','w-10'],['f','f','w-10'],['g','g','w-10'],
   ['h','h','w-10'],['j','j','w-10'],['k','k','w-10'],['l','l','w-10'],
   [';',';','w-10'],['\'','\'','w-10'],['Enter','⏎','w-20']],
  [['ShiftLeft','Shift','w-24'],['z','z','w-10'],['x','x','w-10'],['c','c','w-10'],['v','v','w-10'],['b','b','w-10'],
   ['n','n','w-10'],['m','m','w-10'],[',',',','w-10'],['.','.','w-10'],['/','/','w-10'],
   ['ShiftRight','Shift','w-24']],
  [[' ','space','w-96']],
];

export default {
  name: 'Keyboard',
  props: {
    nextChar:  { type: [String, null], default: null },
    errorKey:  { type: [String, null], default: null }, // base key currently flashing red
  },
  computed: {
    nextBase()      { return baseKeyFor(this.nextChar); },
    needsShift()    { return isShifted(this.nextChar); },
    shiftToHighlight() { return this.needsShift ? shiftSideFor(this.nextChar) : null; },
    rows() { return ROWS; },
  },
  methods: {
    keyStyle(code) {
      const finger = KEY_TO_FINGER[code];
      const f = finger ? FINGERS[finger] : null;
      const base = 'h-10 px-2 rounded-md border border-b-4 flex items-center justify-center text-xs kbd transition-transform select-none';
      const colorClasses = f ? f.tw : 'bg-slate-50 border-slate-300';
      return `${base} ${colorClasses}`;
    },
    isActive(code) {
      if (this.nextBase && code === this.nextBase) return true;
      if (this.shiftToHighlight && code === this.shiftToHighlight) return true;
      return false;
    },
    isError(code) {
      return this.errorKey && code === this.errorKey;
    },
    label(code, label) {
      if (code === ' ') return '';
      return label;
    },
  },
  template: `
    <div class="bg-slate-100 p-3 rounded-xl shadow-inner inline-block">
      <div v-for="(row, ri) in rows" :key="ri" class="flex gap-1 mb-1 justify-center">
        <div v-for="([code, lbl, w]) in row" :key="code+ri"
             :class="[keyStyle(code), w, isActive(code) ? 'kbd-active' : '', isError(code) ? 'kbd-error' : '']">
          {{ label(code, lbl) }}
        </div>
      </div>
      <!-- Finger legend -->
      <div class="flex flex-wrap gap-2 justify-center mt-3 text-[10px] text-slate-600">
        <div v-for="f in fingerList" :key="f.id" class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm border" :style="{ background: f.borderHex, borderColor: f.borderHex }"></span>
          <span>{{ f.label }}</span>
        </div>
      </div>
    </div>
  `,
  data() {
    return { fingerList: Object.values(FINGERS) };
  },
};
