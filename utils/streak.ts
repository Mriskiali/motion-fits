/**
 * Calculates current consecutive day streak and most recent workout date from an array of date strings.
 */
export function calculateStreakFromDates(sessionDateStrings: string[]): {
  streak: number;
  lastWorkoutDate: string | null;
} {
  if (!sessionDateStrings || sessionDateStrings.length === 0) {
    return { streak: 0, lastWorkoutDate: null };
  }

  const uniqueDayStrings = Array.from(
    new Set(
      sessionDateStrings.map((d) => {
        const dt = new Date(d);
        const yr = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, '0');
        const da = String(dt.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${da}`;
      })
    )
  ).sort((a, b) => b.localeCompare(a));

  if (uniqueDayStrings.length === 0) {
    return { streak: 0, lastWorkoutDate: null };
  }

  const mostRecentDateStr = uniqueDayStrings[0];
  const [mY, mM, mD] = mostRecentDateStr.split('-').map(Number);
  const mostRecentDate = new Date(mY, mM - 1, mD);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffFromToday = Math.round(
    (today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffFromToday > 1) {
    return { streak: 0, lastWorkoutDate: mostRecentDateStr };
  }

  let currentStreak = 1;
  let prevDate = mostRecentDate;

  for (let i = 1; i < uniqueDayStrings.length; i++) {
    const [cY, cM, cD] = uniqueDayStrings[i].split('-').map(Number);
    const checkDate = new Date(cY, cM - 1, cD);

    const dayDiff = Math.round(
      (prevDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (dayDiff === 1) {
      currentStreak++;
      prevDate = checkDate;
    } else {
      break;
    }
  }

  return { streak: currentStreak, lastWorkoutDate: mostRecentDateStr };
}
