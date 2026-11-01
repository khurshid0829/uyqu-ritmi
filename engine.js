// Pure sleep calculations. No DOM, no storage; "now" is always passed in.
// Clock times are minutes of the local day (0..1439). Timestamps are ms.
(function (root) {
  'use strict';

  var DAY = 1440;
  var MIN = 60000;
  var JOIN_GAP = 120;

  function mod(m) { return ((m % DAY) + DAY) % DAY; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function fmt(m) {
    m = mod(Math.round(m));
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }

  function fmtDur(min) {
    if (min == null || isNaN(min)) return '—';
    var sign = min < 0 ? '−' : '';
    min = Math.abs(Math.round(min));
    var h = Math.floor(min / 60), m = min % 60;
    if (h === 0) return sign + m + ' daq';
    if (m === 0) return sign + h + ' soat';
    return sign + h + ' s ' + pad(m) + ' d';
  }

  function parseClock(str) {
    var p = String(str).split(':');
    return mod(parseInt(p[0], 10) * 60 + parseInt(p[1], 10));
  }

  function minOfDay(ts) {
    var d = new Date(ts);
    return d.getHours() * 60 + d.getMinutes();
  }

  function dateKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function keyToDate(key, hour) {
    var p = key.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], hour || 0, 0, 0, 0);
  }

  function addDays(key, n) {
    var d = keyToDate(key, 12);
    d.setDate(d.getDate() + n);
    return dateKey(d.getTime());
  }

  function weekday(key) { return keyToDate(key, 12).getDay(); }

  // Signed shortest distance a - b on the clock, in -720..720.
  function clockDiff(a, b) { return mod(a - b + 720) - 720; }

  // Minutes since 20:00: keeps a night (evening to noon) on one axis.
  function nightOff(m) { return mod(m - 1200); }
  function fromNightOff(off) { return mod(off + 1200); }

  function bedtimeOptions(s) {
    return [6, 5, 4].map(function (c) {
      return { cycles: c, bed: mod(s.wake - c * s.cycleLen - s.latency), sleep: c * s.cycleLen };
    });
  }

  function tonightPlan(s) {
    var bed = mod(s.wake - s.cycles * s.cycleLen - s.latency);
    return { bed: bed, windDown: mod(bed - 30), screensOff: mod(bed - 60), alarmFrom: mod(s.wake - 30), wake: s.wake };
  }

  // Sleep pieces of an entry; an uninterrupted night has no `parts`.
  function pieces(e) {
    return e.parts && e.parts.length ? e.parts : [{ bed: e.bed, wake: e.wake }];
  }

  // Row times -> pieces on one wake day. Only the first piece may start the evening before.
  // Returns null if a time is missing, { error: 'order' } if pieces overlap or run backwards.
  function buildParts(date, rows) {
    if (!date || !rows.length || rows.some(function (r) { return !r.bed || !r.wake; })) return null;
    var base = keyToDate(date, 0).getTime(), parts = [], error = null;
    rows.forEach(function (r, i) {
      var bedMin = parseClock(r.bed), wakeMin = parseClock(r.wake);
      var bed = base + bedMin * MIN, wake = base + wakeMin * MIN;
      if (i === 0 && bedMin > wakeMin) bed -= DAY * MIN;
      if (wake <= bed || (i > 0 && bed < parts[i - 1].wake)) error = 'order';
      parts.push({ bed: bed, wake: wake });
    });
    return error ? { error: error } : { parts: parts };
  }

  // Bed and wake of the main sleep: pieces less than JOIN_GAP apart count as one night,
  // so going back to sleep moves the wake time but a later nap does not.
  function composeEntry(parts) {
    var list = parts.slice().sort(function (a, b) { return a.bed - b.bed; }), end = list[0].wake;
    for (var i = 1; i < list.length && (list[i].bed - end) / MIN <= JOIN_GAP; i++) end = list[i].wake;
    var out = { bed: list[0].bed, wake: end };
    if (list.length > 1) out.parts = list;
    return out;
  }

  function partsOverlap(parts) {
    var list = parts.slice().sort(function (a, b) { return a.bed - b.bed; });
    return list.some(function (p, i) { return i > 0 && p.bed < list[i - 1].wake; });
  }

  // Estimated sleep = time in bed minus the time it takes to fall asleep, for each piece.
  function sleepMin(e, s) {
    return pieces(e).reduce(function (sum, p) { return sum + Math.max(0, (p.wake - p.bed) / MIN - s.latency); }, 0);
  }

  // Minutes awake between the pieces of the main sleep.
  function awakeMin(e) {
    var inside = pieces(e).filter(function (p) { return p.wake <= e.wake; });
    return inside.reduce(function (left, p) { return left - (p.wake - p.bed) / MIN; }, (e.wake - e.bed) / MIN);
  }

  function cycleEstimate(e, s) {
    var c = sleepMin(e, s) / s.cycleLen;
    var near = Math.max(1, Math.round(c));
    return { cycles: near, offset: Math.round(Math.abs(c - near) * s.cycleLen) };
  }

  function byWakeKey(entries) {
    var map = {};
    entries.forEach(function (e) {
      var k = dateKey(e.wake);
      if (!map[k] || map[k].wake < e.wake) map[k] = e;
    });
    return map;
  }

  function inLastDays(entries, nowTs, days) {
    var today = dateKey(nowTs), from = addDays(today, -(days - 1));
    return entries.filter(function (e) {
      var k = dateKey(e.wake);
      return k >= from && k <= today;
    }).sort(function (a, b) { return a.wake - b.wake; });
  }

  function avg(xs) {
    if (!xs.length) return null;
    return xs.reduce(function (a, b) { return a + b; }, 0) / xs.length;
  }

  // Sleep Regularity Index (Phillips et al. 2017): chance of being in the same
  // state (asleep/awake) 24 h apart, scaled to -100..100. Uses consecutive
  // recorded nights only, sampled every 5 min. Each window runs noon to noon,
  // so an afternoon nap falls in the window after its own entry's night.
  function sri(entries) {
    var map = byWakeKey(entries), agree = 0, total = 0;
    var asleep = function (e, t) { return !!e && pieces(e).some(function (p) { return t >= p.bed && t < p.wake; }); };
    Object.keys(map).forEach(function (k) {
      var a = map[k], b = map[addDays(k, 1)], before = map[addDays(k, -1)];
      if (!b) return;
      var start = keyToDate(addDays(k, -1), 12).getTime();
      for (var t = 0; t < DAY; t += 5) {
        var ta = start + t * MIN, tb = ta + DAY * MIN;
        var sa = asleep(a, ta) || asleep(before, ta);
        var sb = asleep(b, tb) || asleep(a, tb);
        if (sa === sb) agree++;
        total++;
      }
    });
    if (!total) return null;
    return Math.max(0, Math.round(200 * agree / total - 100));
  }

  function midSleepOff(e) {
    return nightOff(minOfDay(e.bed)) + (e.wake - e.bed) / MIN / 2;
  }

  // Social jetlag (Roenneberg): mid-sleep on free days minus work days.
  function socialJetlag(list, freeDays) {
    var free = [], work = [];
    list.forEach(function (e) {
      var wd = weekday(dateKey(e.wake));
      (freeDays.indexOf(wd) >= 0 ? free : work).push(midSleepOff(e));
    });
    if (!free.length || !work.length) return null;
    return Math.round(avg(free) - avg(work));
  }

  function sleepDebt(entries, s, nowTs) {
    var list = inLastDays(entries, nowTs, 7);
    var debt = 0;
    list.forEach(function (e) { debt += Math.max(0, s.targetSleep - sleepMin(e, s)); });
    return { minutes: Math.round(debt), nights: list.length };
  }

  // One status per day, oldest first: 'ok' (woke within tol of target),
  // 'miss', or 'none' (no record).
  function consistency(entries, s, nowTs, days, tol) {
    var map = byWakeKey(entries), today = dateKey(nowTs), out = [];
    for (var i = days - 1; i >= 0; i--) {
      var k = addDays(today, -i), e = map[k], status = 'none', diff = null;
      if (e) {
        diff = clockDiff(minOfDay(e.wake), s.wake);
        status = Math.abs(diff) <= tol ? 'ok' : 'miss';
      }
      out.push({ key: k, weekday: weekday(k), status: status, diff: diff });
    }
    return out;
  }

  function stats(entries, s, nowTs, days) {
    var list = inLastDays(entries, nowTs, days);
    var map = byWakeKey(list), today = dateKey(nowTs), chart = [];
    for (var i = days - 1; i >= 0; i--) {
      var k = addDays(today, -i), e = map[k];
      chart.push({
        key: k,
        weekday: weekday(k),
        free: s.freeDays.indexOf(weekday(k)) >= 0,
        bedOff: e ? nightOff(minOfDay(e.bed)) : null,
        wakeOff: e ? Math.min(nightOff(minOfDay(e.bed)) + (e.wake - e.bed) / MIN, 2 * DAY) : null,
        segs: e ? pieces(e).map(function (p) {
          var from = nightOff(minOfDay(p.bed));
          return { from: from, to: Math.min(from + (p.wake - p.bed) / MIN, 2 * DAY) };
        }) : null
      });
    }
    var beds = list.map(function (e) { return nightOff(minOfDay(e.bed)); });
    var wakes = list.map(function (e) { return nightOff(minOfDay(e.wake)); });
    return {
      nights: list.length,
      avgSleep: avg(list.map(function (e) { return sleepMin(e, s); })),
      avgBed: beds.length ? fromNightOff(avg(beds)) : null,
      avgWake: wakes.length ? fromNightOff(avg(wakes)) : null,
      sri: sri(list),
      jetlag: socialJetlag(list, s.freeDays),
      chart: chart
    };
  }

  // Move bedtime earlier by `step` minutes every `every` days until target.
  function gradualPlan(avgBed, targetBed, step, every) {
    if (avgBed == null) return null;
    var gap = nightOff(avgBed) - nightOff(targetBed);
    if (gap <= 10) return { onTrack: true, steps: [] };
    var steps = [], off = nightOff(avgBed), target = nightOff(targetBed), day = 1;
    off = Math.floor(off / 5) * 5 - step;
    while (off > target && steps.length < 5) {
      steps.push({ from: day, to: day + every - 1, bed: fromNightOff(off) });
      off -= step;
      day += every;
    }
    steps.push({ from: day, to: null, bed: targetBed });
    return { onTrack: false, gap: gap, steps: steps };
  }

  // Compares morning mood on days with and without each factor.
  function moodInsights(list, keys) {
    var out = [];
    keys.forEach(function (k) {
      var yes = [], no = [];
      list.forEach(function (e) {
        if (e.mood == null) return;
        (e.factors && e.factors[k] ? yes : no).push(e.mood);
      });
      if (yes.length >= 3 && no.length >= 3) {
        var d = avg(yes) - avg(no);
        if (Math.abs(d) >= 0.5) out.push({ key: k, diff: Math.round(d * 10) / 10, n: yes.length + no.length });
      }
    });
    return out.sort(function (a, b) { return Math.abs(b.diff) - Math.abs(a.diff); });
  }

  // Average sleep on mornings rated 4-5: a personal estimate of need.
  function freshSleep(list, s) {
    var good = list.filter(function (e) { return e.mood >= 4; });
    if (good.length < 3) return null;
    return Math.round(avg(good.map(function (e) { return sleepMin(e, s); })));
  }

  var api = {
    DAY: DAY, mod: mod, fmt: fmt, fmtDur: fmtDur, parseClock: parseClock, minOfDay: minOfDay,
    dateKey: dateKey, keyToDate: keyToDate, addDays: addDays, weekday: weekday, clockDiff: clockDiff,
    nightOff: nightOff, fromNightOff: fromNightOff, bedtimeOptions: bedtimeOptions, tonightPlan: tonightPlan,
    pieces: pieces, buildParts: buildParts, composeEntry: composeEntry, partsOverlap: partsOverlap, awakeMin: awakeMin,
    sleepMin: sleepMin, cycleEstimate: cycleEstimate, inLastDays: inLastDays, sri: sri,
    socialJetlag: socialJetlag, sleepDebt: sleepDebt, consistency: consistency, stats: stats,
    gradualPlan: gradualPlan, moodInsights: moodInsights, freshSleep: freshSleep
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Engine = api;
})(this);
