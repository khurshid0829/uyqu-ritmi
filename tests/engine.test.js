const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

const S = { wake: 390, cycles: 5, cycleLen: 90, latency: 15, targetSleep: 450, freeDays: [6, 0] };

// Local-time timestamp helper: day of Oct 2026, hh:mm
const at = (day, h, m) => new Date(2026, 9, day, h, m).getTime();
const night = (wakeDay, bh, bm, wh, wm, extra = {}) => ({
  bed: bh >= 12 ? at(wakeDay - 1, bh, bm) : at(wakeDay, bh, bm),
  wake: at(wakeDay, wh, wm),
  ...extra
});

test('fmt and parseClock round-trip, wrap past midnight', () => {
  assert.equal(E.fmt(390), '06:30');
  assert.equal(E.fmt(-15), '23:45');
  assert.equal(E.fmt(1440 + 5), '00:05');
  assert.equal(E.parseClock('22:45'), 1365);
});

test('fmtDur', () => {
  assert.equal(E.fmtDur(447), '7 s 27 d');
  assert.equal(E.fmtDur(40), '40 daq');
  assert.equal(E.fmtDur(540), '9 soat');
  assert.equal(E.fmtDur(-70), '−1 s 10 d');
  assert.equal(E.fmtDur(null), '—');
});

test('bedtime options count back from wake time with latency', () => {
  const o = E.bedtimeOptions(S);
  assert.deepEqual(o.map((x) => [x.cycles, E.fmt(x.bed)]), [[6, '21:15'], [5, '22:45'], [4, '00:15']]);
  const p = E.tonightPlan(S);
  assert.equal(E.fmt(p.bed), '22:45');
  assert.equal(E.fmt(p.screensOff), '21:45');
  assert.equal(E.fmt(p.alarmFrom), '06:00');
});

test('sleepMin subtracts latency, cycle estimate', () => {
  const e = night(10, 22, 52, 6, 34);
  assert.equal(E.sleepMin(e, S), 447);
  assert.deepEqual(E.cycleEstimate(e, S), { cycles: 5, offset: 3 });
});

test('clockDiff handles midnight', () => {
  assert.equal(E.clockDiff(5, 1435), 10);
  assert.equal(E.clockDiff(1435, 5), -10);
});

test('SRI is 100 for identical nights and lower for irregular ones', () => {
  const same = [night(10, 23, 0, 7, 0), night(11, 23, 0, 7, 0), night(12, 23, 0, 7, 0)];
  assert.equal(E.sri(same), 100);
  const shifted = [night(10, 23, 0, 7, 0), night(11, 2, 0, 10, 0)];
  // 3 h of 24 h mismatched twice -> 1 - 6/24 = 0.75 -> 50
  assert.equal(E.sri(shifted), 50);
  assert.equal(E.sri([night(10, 23, 0, 7, 0)]), null);
});

test('social jetlag: later mid-sleep on weekend', () => {
  // Oct 2026: 23 Fri (5), 24 Sat (6), 25 Sun (0)
  const list = [night(22, 23, 0, 7, 0), night(23, 23, 0, 7, 0), night(24, 0, 0, 8, 0), night(25, 0, 30, 8, 30)];
  assert.equal(E.socialJetlag(list, [6, 0]), 75);
  assert.equal(E.socialJetlag(list.slice(0, 2), [6, 0]), null);
});

test('sleep debt over last 7 days only', () => {
  const now = at(20, 9, 0);
  const list = [night(20, 23, 0, 6, 0), night(19, 22, 0, 6, 0), night(5, 2, 0, 6, 0)];
  // 405 sleep -> 45 short; 465 -> 0; Oct 5 is outside the window
  assert.deepEqual(E.sleepDebt(list, S, now), { minutes: 45, nights: 2 });
});

test('consistency marks days within tolerance', () => {
  const now = at(20, 9, 0);
  const list = [night(20, 23, 0, 6, 50), night(19, 23, 0, 6, 10)];
  const c = E.consistency(list, S, now, 3, 30);
  assert.deepEqual(c.map((d) => d.status), ['none', 'ok', 'ok']);
  const strict = E.consistency(list, S, now, 3, 15);
  assert.deepEqual(strict.map((d) => d.status), ['none', 'miss', 'miss']);
});

test('stats averages across midnight correctly', () => {
  const now = at(20, 9, 0);
  const list = [night(19, 23, 30, 6, 30), night(20, 0, 30, 6, 30)];
  const s = E.stats(list, S, now, 7);
  assert.equal(s.nights, 2);
  assert.equal(E.fmt(s.avgBed), '00:00');
  assert.equal(E.fmt(s.avgWake), '06:30');
  assert.equal(s.chart.length, 7);
  assert.equal(s.chart[6].bedOff, 270);
});

test('gradual plan steps 15 min every 3 days', () => {
  const p = E.gradualPlan(E.parseClock('23:40'), E.parseClock('22:45'), 15, 3);
  assert.equal(p.onTrack, false);
  assert.deepEqual(p.steps.map((x) => E.fmt(x.bed)), ['23:25', '23:10', '22:55', '22:45']);
  assert.equal(p.steps[1].from, 4);
  assert.equal(E.gradualPlan(E.parseClock('22:50'), E.parseClock('22:45'), 15, 3).onTrack, true);
});

test('mood insights need 3+ samples each side', () => {
  const mk = (mood, caf) => ({ ...night(10, 23, 0, 7, 0), mood, factors: { caf } });
  const list = [mk(2, true), mk(3, true), mk(2, true), mk(4, false), mk(5, false), mk(4, false)];
  const r = E.moodInsights(list, ['caf', 'scr']);
  assert.equal(r.length, 1);
  assert.equal(r[0].key, 'caf');
  assert.equal(r[0].diff, -2);
  assert.equal(E.moodInsights(list.slice(0, 4), ['caf']).length, 0);
});

test('fresh sleep averages good mornings', () => {
  const list = [
    { ...night(10, 23, 0, 7, 0), mood: 5 },
    { ...night(11, 23, 0, 7, 0), mood: 4 },
    { ...night(12, 23, 0, 6, 0), mood: 4 },
    { ...night(13, 1, 0, 6, 0), mood: 2 }
  ];
  assert.equal(E.freshSleep(list, S), 445);
});
