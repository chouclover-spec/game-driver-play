export const LEVELS = Object.freeze([
  { name: '村路', theme: 'village', length: 460, cruise: 6, maxSpeed: 9, initialCars: 2, spawnDelay: 8, types: ['car', 'tricycle'], briefing: '坑洼多，人车混行。先松油门，再找空隙绕开；行人过路时停一停。', tip: '不赶时间。坑可以慢慢绕，行人要先让。' },
  { name: '城市主干道', theme: 'city', length: 620, cruise: 8, maxSpeed: 13, initialCars: 7, spawnDelay: 3.4, types: ['car', 'car', 'taxi', 'sweeper'], briefing: '车多、红灯多。观察刹车灯，保持车距，不必每次都抢到最快的车道。', tip: '绿灯亮了，队伍也需要一点起步时间。' },
  { name: '高速', theme: 'highway', length: 900, cruise: 17, maxSpeed: 25, initialCars: 5, spawnDelay: 4.8, types: ['car', 'car', 'suv'], briefing: '没有红绿灯，快慢车速度差更大。提前收油，确认前后空隙再超车。', tip: '看到慢车就开始判断，不等贴近了才刹车。' },
]);
export function normalizeProgress(value) {
  const unlocked = Number.isInteger(value?.unlocked) ? Math.max(0, Math.min(LEVELS.length - 1, value.unlocked)) : 0;
  const records = LEVELS.map((_, i) => {
    const r = value?.records?.[i];
    return r && Number.isFinite(r.score) && r.score >= 0 && Number.isFinite(r.time) && r.time > 0 && Number.isInteger(r.stars) && r.stars >= 1 && r.stars <= 3 ? { score: Math.floor(r.score), time: r.time, stars: r.stars } : null;
  });
  // Only successful records can unlock a later level.
  let reachable = 0;
  while (reachable < LEVELS.length - 1 && records[reachable]) reachable++;
  return { unlocked: Math.min(unlocked, reachable), records };
}
export function recordLevel(progress, index, result) {
  const next = normalizeProgress(progress);
  if (!Number.isInteger(index) || index < 0 || index > next.unlocked || index >= LEVELS.length) return next;
  const valid = normalizeProgress({ records: [result] }).records[0];
  if (!valid) return next;
  if (!next.records[index] || valid.score > next.records[index].score) next.records[index] = valid;
  next.unlocked = Math.min(LEVELS.length - 1, Math.max(next.unlocked, index + 1));
  return next;
}
