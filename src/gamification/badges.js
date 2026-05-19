// Declarative badge rules. Each rule receives a context describing the latest
// completion and returns true if the user earned that badge.
//
// context = {
//   user, profile, lesson, summary, sessionRow, progressMap, badgeSet,
//   firstTimePass, newStreak, newLevel, lifetimeChars,
// }

export const BADGES = [
  { id: 'first-lesson',     title: 'First Lesson',        desc: 'Completed your first lesson.' },
  { id: 'home-row-master',  title: 'Home Row Master',     desc: 'Passed all home-row lessons.' },
  { id: 'letter-complete',  title: 'Letter Complete',     desc: 'Passed every letter-introduction lesson.' },
  { id: 'streak-3',         title: '3-Day Streak',        desc: 'Practiced 3 days in a row.' },
  { id: 'streak-7',         title: '7-Day Streak',        desc: 'Practiced a full week in a row.' },
  { id: 'streak-30',        title: '30-Day Streak',       desc: 'Practiced 30 days in a row.' },
  { id: 'speed-30',         title: 'Cruising — 30 WPM',   desc: 'Hit 30 WPM on a passed lesson.' },
  { id: 'speed-50',         title: 'Fast Hands — 50 WPM', desc: 'Hit 50 WPM on a passed lesson.' },
  { id: 'speed-80',         title: 'Quick Draw — 80 WPM', desc: 'Hit 80 WPM on a passed lesson.' },
  { id: 'speed-100',        title: 'Centurion — 100 WPM', desc: 'Hit 100 WPM on a passed lesson.' },
  { id: 'accuracy-ace',     title: 'Accuracy Ace',        desc: '100% accuracy on a lesson ≥50 chars.' },
  { id: 'code-typist',      title: 'Code Typist',         desc: 'Passed your first code-typing lesson.' },
  { id: 'marathon',         title: 'Marathon',            desc: 'Typed 10,000+ characters lifetime.' },
  { id: 'level-5',          title: 'Level 5',             desc: 'Reached level 5.' },
  { id: 'level-10',         title: 'Level 10',            desc: 'Reached level 10.' },
  { id: 'level-25',         title: 'Level 25',            desc: 'Reached level 25.' },
  { id: 'bookworm',         title: 'Bookworm',            desc: 'Passed your first paragraph lesson.' },
  { id: 'comeback',         title: 'Comeback',            desc: 'Returned after a 7+ day break.' },
];

const HAS = (set, id) => set.has(id);
const PASSED = (progressMap, ids) => ids.every(id => progressMap.get(id)?.passed);

const HOME_ROW_LESSONS  = ['01-home-row', '02-home-row-words'];
const LETTER_LESSONS    = ['01-home-row','03-top-row','04-bottom-row','05-all-letters','06-capitals'];

export function evaluateBadges(ctx) {
  const { lesson, summary, sessionRow, progressMap, badgeSet,
          firstTimePass, newStreak, newLevel, lifetimeChars, daysGap } = ctx;
  const newly = [];
  const pass = sessionRow.passed;

  function award(id) {
    if (!HAS(badgeSet, id)) newly.push(id);
  }

  if (!HAS(badgeSet, 'first-lesson') && firstTimePass) award('first-lesson');

  if (pass && PASSED(progressMap, HOME_ROW_LESSONS)) award('home-row-master');
  if (pass && PASSED(progressMap, LETTER_LESSONS))   award('letter-complete');

  if (newStreak >= 3)  award('streak-3');
  if (newStreak >= 7)  award('streak-7');
  if (newStreak >= 30) award('streak-30');

  if (pass && summary.wpm >= 30)  award('speed-30');
  if (pass && summary.wpm >= 50)  award('speed-50');
  if (pass && summary.wpm >= 80)  award('speed-80');
  if (pass && summary.wpm >= 100) award('speed-100');

  if (pass && summary.accuracy >= 99.999 && summary.charsTyped >= 50) award('accuracy-ace');

  if (pass && (lesson.track === 'code' || /code/.test(lesson.id))) award('code-typist');

  if (lifetimeChars >= 10000) award('marathon');

  if (newLevel >= 5)  award('level-5');
  if (newLevel >= 10) award('level-10');
  if (newLevel >= 25) award('level-25');

  const hasParagraph = (lesson.drills || []).some(d => d.type === 'paragraph');
  if (pass && hasParagraph) award('bookworm');

  if (daysGap >= 7) award('comeback');

  return newly;
}

export function badgeMeta(id) {
  return BADGES.find(b => b.id === id) || { id, title: id, desc: '' };
}
