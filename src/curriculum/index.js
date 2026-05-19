// Loads the manifest, then every lesson JSON, into an in-memory Map.
// GitHub Pages can't list directories, so the manifest is the source of truth.

let _lessonsPromise = null;
let _wordlistCache = new Map();

function basePath() {
  // We're at src/curriculum/index.js — go up two levels to repo root.
  const here = new URL('.', import.meta.url);
  return new URL('../../', here);
}

export function lessonUrl(filename) {
  return new URL(`src/curriculum/lessons/${filename}`, basePath()).href;
}

export function wordlistUrl(filename) {
  return new URL(`src/curriculum/wordlists/${filename}`, basePath()).href;
}

async function loadLessons() {
  const manifestUrl = new URL('src/curriculum/manifest.json', basePath()).href;
  const manifest = await fetch(manifestUrl).then(r => {
    if (!r.ok) throw new Error('Failed to load lesson manifest');
    return r.json();
  });
  const files = manifest.lessons || [];
  const lessons = await Promise.all(files.map(f =>
    fetch(lessonUrl(f)).then(r => r.json())
  ));
  lessons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const map = new Map();
  for (const l of lessons) map.set(l.id, l);
  return { list: lessons, map };
}

export function getLessons() {
  if (!_lessonsPromise) _lessonsPromise = loadLessons();
  return _lessonsPromise;
}

export async function getLesson(id) {
  const { map } = await getLessons();
  return map.get(id);
}

export async function loadWordlist(name) {
  if (_wordlistCache.has(name)) return _wordlistCache.get(name);
  const data = await fetch(wordlistUrl(name)).then(r => r.json());
  _wordlistCache.set(name, data);
  return data;
}

// Unlock evaluation: a lesson is unlocked iff every prerequisite's best score
// meets that prerequisite's unlockGate (minWpm + minAccuracy).
export function isUnlocked(lesson, progressMap, lessonMap) {
  const prereqs = lesson.prerequisiteLessonIds || [];
  for (const prereqId of prereqs) {
    const p = progressMap.get(prereqId);
    if (!p || !p.passed) return false;
    const prereq = lessonMap.get(prereqId);
    const gate = prereq?.unlockGate || { minWpm: 0, minAccuracy: 0 };
    if (Number(p.best_wpm) < gate.minWpm) return false;
    if (Number(p.best_accuracy) < gate.minAccuracy) return false;
  }
  return true;
}

// Some drills are dynamic: `wordlist:<name>:<count>` -> sample N words.
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function resolveDrillContent(content) {
  if (typeof content !== 'string') return String(content ?? '');
  const m = content.match(/^wordlist:([\w-]+):(\d+)$/);
  if (!m) return content;
  const [, name, nStr] = m;
  const n = parseInt(nStr, 10);
  const data = await loadWordlist(`${name}.json`);
  const words = data.words || [];
  return shuffle(words).slice(0, n).join(' ');
}

// Combine all drills in a lesson into a single prompt string.
// Async because some drills resolve from wordlists.
export async function lessonPrompt(lesson) {
  const parts = await Promise.all((lesson.drills || []).map(d => resolveDrillContent(d.content)));
  return parts.join('\n');
}
