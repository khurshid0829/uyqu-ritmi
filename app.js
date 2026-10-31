(function () {
  'use strict';

  var E = window.Engine;
  var MIN = 60000;
  var KEY = 'uyqu-ritmi-v1';
  var DEFAULTS = { wake: 390, cycles: 5, cycleLen: 90, latency: 15, targetSleep: 450, freeDays: [6, 0] };

  var FACTORS = [
    ['caf', 'Kofein 14:00 dan keyin'],
    ['scr', 'Yotishdan oldin ekran'],
    ['nap', 'Kunduzgi uyqu 20+ daq'],
    ['light', 'Ertalab yorugʻlik'],
    ['sport', 'Kechki sport'],
    ['food', 'Kech ovqat']
  ];
  var HABITS = [
    ['light', 'Ertalab 10 daqiqa tashqarida', 'Kunduzgi yorugʻlik ichki soatni toʻgʻrilaydi'],
    ['caf', 'Kofein 14:00 gacha', 'Kofein 6 soatdan keyin ham taʼsir qiladi'],
    ['screen', 'Yotishdan 1 soat oldin ekran yoʻq', 'Miya “kun tugadi” signalini oladi'],
    ['room', 'Xona salqin va qorongʻi', 'Taxminan 18–20 °C, sokin']
  ];
  var MOODS = ['Holsiz', 'Charchoq', 'Oʻrtacha', 'Yaxshi', 'Tetik'];
  var WD = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  var WD_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
  var MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

  var ICON = {
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
    repeat: '<path d="M3 12a9 9 0 0 1 15.4-6.4L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.4 6.4L3 16M3 21v-5h5"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"/>',
    back: '<path d="M15 18l-6-6 6-6"/>'
  };

  function icon(name, size, width) {
    return '<svg width="' + (size || 24) + '" height="' + (size || 24) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
      (width || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + '</svg>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- storage ----------

  function valid(e) {
    return e && typeof e.bed === 'number' && typeof e.wake === 'number' && e.wake > e.bed;
  }

  function normalize(d) {
    d = d || {};
    return {
      settings: Object.assign({}, DEFAULTS, d.settings || {}),
      entries: Array.isArray(d.entries) ? d.entries.filter(valid) : [],
      open: d.open && typeof d.open.bed === 'number' ? d.open : null,
      habits: d.habits && typeof d.habits === 'object' ? d.habits : {}
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* fall through to defaults */ }
    return normalize({});
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Saqlab boʻlmadi'); }
  }

  var db = load();
  var ui = { period: 14, draft: null, draftFor: null, lastRoute: null };

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function sorted() { return db.entries.slice().sort(function (a, b) { return b.wake - a.wake; }); }
  function findEntry(id) { return db.entries.filter(function (e) { return e.id === id; })[0] || null; }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }

  function dateLabel(ts) {
    var d = new Date(ts);
    return WD[d.getDay()] + ', ' + d.getDate() + '-' + MONTHS[d.getMonth()];
  }

  function shortDate(key) {
    var d = E.keyToDate(key, 12);
    return d.getDate() + '-' + MONTHS[d.getMonth()] + ', ' + WD_SHORT[d.getDay()];
  }

  function header(eyebrow, title, extra) {
    return '<header class="head"><div><div class="eyebrow">' + eyebrow + '</div><h1>' + title + '</h1></div>' + (extra || '') + '</header>';
  }

  // ---------- views ----------

  function viewToday() {
    var s = db.settings, now = Date.now(), p = E.tonightPlan(s), h = '';
    h += header(dateLabel(now), 'Bugun',
      '<a class="icon-btn" href="#sozlamalar" aria-label="Sozlamalar">' + icon('gear', 22) + '</a>');

    if (db.open) {
      var mins = Math.max(0, Math.round((now - db.open.bed) / MIN));
      h += '<section class="card sleeping">' +
        '<span class="muted small">Yotoqdasiz</span>' +
        '<span class="big num">' + E.fmt(E.minOfDay(db.open.bed)) + ' dan</span>' +
        '<span class="muted small">' + E.fmtDur(mins) + ' oʻtdi · reja boʻyicha turish ' + E.fmt(s.wake) + '</span>' +
        '<button class="btn block" data-act="wakeup">' + icon('sun', 22) + 'Uygʻondim</button>' +
        '<button class="btn ghost" data-act="cancelSleep">Bekor qilish</button>' +
        '</section>';
    } else {
      h += '<button class="btn block" data-act="sleep">' + icon('moon', 22) + 'Yotdim — ' + E.fmt(E.minOfDay(now)) + '</button>';
    }

    var last = sorted()[0];
    if (last && E.dateKey(last.wake) === E.dateKey(now) && last.mood == null) {
      h += '<a class="card soft" href="#kundalik/' + esc(last.id) + '" style="text-decoration:none;color:inherit">' +
        '<div class="row"><div class="grow"><h2>Ertalabki belgi</h2><span class="small muted">Oʻzingizni qanday his qilyapsiz? 10 soniya.</span></div>' +
        icon('chev', 20) + '</div></a>';
    }

    h += '<section class="card" aria-label="Uygʻonish vaqti">' +
      '<div class="row warm small" style="font-weight:600;gap:8px">' + icon('sun', 20) + '<span>Uygʻonish vaqti — har kuni bir xil</span></div>' +
      '<div class="wake-row">' +
      '<button class="round" data-act="wakeShift" data-v="-15" aria-label="15 daqiqa oldinroq">−</button>' +
      '<span class="wake-time num" aria-live="polite">' + E.fmt(s.wake) + '</span>' +
      '<button class="round" data-act="wakeShift" data-v="15" aria-label="15 daqiqa kechroq">+</button>' +
      '</div>' +
      '<span class="small muted center">Budilnikni iPhone “Soat” ilovasida ' + E.fmt(s.wake) + ' ga qoʻying</span>' +
      '</section>';

    var notes = { 6: 'Toʻliq tiklanish', 5: 'Tavsiya · 7–9 soat oraligʻida', 4: 'Kam — faqat istisno holatda' };
    h += '<section class="stack" role="radiogroup" aria-label="Sikllar soni"><h2 class="section-title">Qachon yotish kerak</h2>';
    E.bedtimeOptions(s).forEach(function (o) {
      h += '<button class="opt" role="radio" aria-checked="' + (o.cycles === s.cycles) + '" data-act="cycles" data-v="' + o.cycles + '">' +
        '<span class="radio"></span>' +
        '<span class="grow stack" style="gap:2px"><b style="font-size:16px">' + o.cycles + ' sikl · ' + E.fmtDur(o.sleep) + '</b>' +
        '<span class="small muted">' + notes[o.cycles] + '</span></span>' +
        '<span class="opt-time num">' + E.fmt(o.bed) + '</span></button>';
    });
    h += '<span class="tiny muted" style="margin:0 4px">Uxlab qolish uchun +' + s.latency + ' daqiqa qoʻshilgan. Sikl uzunligi: ' + s.cycleLen + ' daqiqa.</span></section>';

    h += '<section class="card"><h2>Kechki tartib</h2>' +
      planRow('var(--bar-free)', 'Ekran va yorqin chiroq oʻchadi', p.screensOff) +
      planRow('color-mix(in srgb, var(--accent) 60%, var(--bar-free))', 'Tinchlanish: dush, kitob, nafas', p.windDown) +
      planRow('var(--accent)', 'Yotoqqa yotish', p.bed) +
      planRow('var(--warm)', 'Uygʻonish (yengil faza oynasi ' + E.fmt(p.alarmFrom) + ' dan)', p.wake) +
      '</section>';
    return h;
  }

  function planRow(color, label, time) {
    return '<div class="row"><span class="dot" style="background:' + color + '"></span><span class="grow">' + label +
      '</span><b class="num">' + E.fmt(time) + '</b></div>';
  }

  function newDraft() {
    var s = db.settings, now = Date.now();
    return { id: null, date: E.dateKey(now), bed: E.fmt(E.tonightPlan(s).bed), wake: E.fmt(s.wake), mood: null, factors: {}, note: '' };
  }

  function draftFrom(e) {
    return {
      id: e.id, date: E.dateKey(e.wake), bed: E.fmt(E.minOfDay(e.bed)), wake: E.fmt(E.minOfDay(e.wake)),
      mood: e.mood == null ? null : e.mood, factors: Object.assign({}, e.factors || {}), note: e.note || ''
    };
  }

  function viewLog(arg) {
    var key = arg || 'new';
    if (ui.draftFor !== key) {
      var e = arg ? findEntry(arg) : null;
      ui.draft = e ? draftFrom(e) : newDraft();
      ui.draftFor = e ? key : 'new';
    }
    var d = ui.draft, s = db.settings, h = '';
    h += header(d.id ? 'Yozuvni tahrirlash' : 'Kecha → bugun ertalab', 'Kundalik',
      d.id ? '<a class="icon-btn" href="#kundalik" aria-label="Yangi yozuv">' + icon('pencil', 20) + '</a>' : '');

    h += '<section class="card">' +
      '<label class="field"><span>Uygʻongan kun</span><input class="input" type="date" data-field="date" value="' + esc(d.date) + '" max="' + E.dateKey(Date.now()) + '"></label>' +
      '<div class="pair">' +
      '<label class="field"><span>Yotdim</span><input class="input num" type="time" data-field="bed" value="' + esc(d.bed) + '"></label>' +
      '<label class="field"><span>Uygʻondim</span><input class="input num" type="time" data-field="wake" value="' + esc(d.wake) + '"></label>' +
      '</div>' + draftSummary(d, s) + '</section>';

    h += '<section class="card"><h2>Oʻzingizni qanday his qilyapsiz?</h2><div class="moods">';
    MOODS.forEach(function (label, i) {
      var n = i + 1;
      h += '<button class="mood" data-act="mood" data-v="' + n + '" aria-pressed="' + (d.mood === n) + '"><b>' + n + '</b><span>' + label + '</span></button>';
    });
    h += '</div></section>';

    h += '<section class="card"><h2>Kechagi omillar</h2><div class="chips">';
    FACTORS.forEach(function (f) {
      h += '<button class="chip" data-act="factor" data-v="' + f[0] + '" aria-pressed="' + !!d.factors[f[0]] + '">' + f[1] + '</button>';
    });
    h += '</div>' +
      '<label class="field"><span>Izoh (ixtiyoriy)</span><textarea class="input" rows="2" data-field="note" placeholder="Masalan: kechki ovqat kech boʻldi">' + esc(d.note) + '</textarea></label>' +
      '</section>';

    h += '<button class="btn block" data-act="saveEntry">Saqlash</button>';
    if (d.id) h += '<button class="btn danger" data-act="deleteEntry">Yozuvni oʻchirish</button>';

    var list = sorted().slice(0, 30);
    h += '<h2 class="section-title">Oxirgi kechalar</h2>';
    if (!list.length) {
      h += '<div class="card empty"><span class="muted">Hali yozuv yoʻq. Kechqurun “Bugun” sahifasida “Yotdim” tugmasini bosing yoki yuqorida qoʻlda kiriting.</span></div>';
    } else {
      h += '<div class="stack">';
      list.forEach(function (e) {
        var c = E.cycleEstimate(e, s);
        h += '<a class="hist" href="#kundalik/' + esc(e.id) + '" style="text-decoration:none;color:inherit">' +
          '<span class="mood-dot">' + (e.mood == null ? '·' : e.mood) + '</span>' +
          '<span class="grow stack" style="gap:1px"><b style="font-size:15px">' + shortDate(E.dateKey(e.wake)) + '</b>' +
          '<span class="small muted num">' + E.fmt(E.minOfDay(e.bed)) + ' – ' + E.fmt(E.minOfDay(e.wake)) + ' · ≈' + c.cycles + ' sikl</span></span>' +
          '<b class="num">' + E.fmtDur(E.sleepMin(e, s)) + '</b></a>';
      });
      h += '</div>';
    }
    return h;
  }

  function draftTimes(d) {
    if (!d.date || !d.bed || !d.wake) return null;
    var base = E.keyToDate(d.date, 0).getTime();
    var bedMin = E.parseClock(d.bed), wakeMin = E.parseClock(d.wake);
    var wake = base + wakeMin * MIN, bed = base + bedMin * MIN;
    if (bedMin > wakeMin) bed -= E.DAY * MIN;
    return { bed: bed, wake: wake };
  }

  function draftSummary(d, s) {
    var t = draftTimes(d);
    if (!t) return '';
    var e = { bed: t.bed, wake: t.wake }, c = E.cycleEstimate(e, s);
    var fit = c.offset <= 15 ? '<span class="ok">sikl oxiriga yaqin</span>' : '<span class="muted">sikl oʻrtasida boʻlishi mumkin</span>';
    return '<div class="small" data-summary>Uyquda ≈ <b>' + E.fmtDur(E.sleepMin(e, s)) + '</b> · ≈' + c.cycles + ' sikl, ' + fit + '</div>';
  }

  function chartSvg(st, s) {
    var W = 340, H = 220, L = 40, T = 6, B = 22, PH = H - T - B, SPAN = 960; // 20:00 -> 12:00
    var n = st.chart.length, colW = (W - L) / n, bw = Math.min(14, colW * 0.62);
    var y = function (off) { return T + Math.max(0, Math.min(SPAN, off)) / SPAN * PH; };
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Har kecha yotish va turish vaqtlari">';
    [0, 240, 480, 720, 960].forEach(function (off) {
      out += '<line x1="' + L + '" x2="' + W + '" y1="' + y(off) + '" y2="' + y(off) + '" class="grid"/>' +
        '<text x="0" y="' + (y(off) + 4) + '" class="axis">' + E.fmt(E.fromNightOff(off)) + '</text>';
    });
    st.chart.forEach(function (d, i) {
      var cx = L + colW * i + colW / 2;
      if (d.bedOff != null) {
        var y1 = y(d.bedOff), y2 = y(d.wakeOff);
        out += '<rect x="' + (cx - bw / 2) + '" y="' + y1 + '" width="' + bw + '" height="' + Math.max(2, y2 - y1) + '" rx="' + Math.min(5, bw / 2) + '" class="bar' + (d.free ? ' free' : '') + '"/>';
      }
      var label = n <= 14 ? WD_SHORT[d.weekday] : (i % 5 === 0 || i === n - 1 ? String(E.keyToDate(d.key, 12).getDate()) : '');
      if (label) out += '<text x="' + cx + '" y="' + (H - 6) + '" class="axis" text-anchor="middle">' + label + '</text>';
    });
    var ty = y(E.nightOff(s.wake));
    out += '<line x1="' + L + '" x2="' + W + '" y1="' + ty + '" y2="' + ty + '" class="target"/>';
    return out + '</svg>';
  }

  function viewAnalysis() {
    var s = db.settings, now = Date.now(), st = E.stats(db.entries, s, now, ui.period), debt = E.sleepDebt(db.entries, s, now), h = '';
    h += header('Oxirgi ' + ui.period + ' kun', 'Tahlil');
    h += '<div class="seg" role="group" aria-label="Davr">';
    [7, 14, 30].forEach(function (p) {
      h += '<button data-act="period" data-v="' + p + '" aria-pressed="' + (ui.period === p) + '">' + p + ' kun</button>';
    });
    h += '</div>';

    if (!st.nights) {
      return h + '<div class="card empty"><h2>Hali maʼlumot yoʻq</h2><span class="muted small">3–4 kecha yozganingizdan keyin bu yerda grafik va tavsiyalar paydo boʻladi.</span>' +
        '<a class="btn secondary" href="#kundalik">Birinchi yozuvni kiritish</a></div>';
    }

    var sriCap = st.sri == null ? 'Ketma-ket 2 kecha kerak' : st.sri >= 80 ? 'Yaxshi barqarorlik' : st.sri >= 60 ? 'Oʻrtacha' : 'Notekis — langarni kuchaytiring';
    h += '<section class="tiles">' +
      tile('Muntazamlik (SRI)', st.sri == null ? '—' : st.sri + '<small> / 100</small>', sriCap, st.sri != null && st.sri >= 80 ? 'ok' : 'muted') +
      tile('Oʻrtacha uyqu', E.fmtDur(st.avgSleep), 'Maqsad: ' + E.fmtDur(s.targetSleep), 'muted') +
      tile('Uyqu qarzi (7 kun)', E.fmtDur(debt.minutes), debt.minutes === 0 ? 'Qarz yoʻq' : '2–3 kechada asta yoping', 'muted') +
      tile('Hafta oxiri siljishi', st.jetlag == null ? '—' : E.fmtDur(Math.abs(st.jetlag)), st.jetlag == null ? 'Ish va dam kunlari kerak' : 'Maqsad: 1 soatdan kam',
        st.jetlag != null && Math.abs(st.jetlag) < 60 ? 'ok' : 'muted') +
      tile('Oʻrtacha yotish', E.fmt(st.avgBed), 'Reja: ' + E.fmt(E.tonightPlan(s).bed), 'muted') +
      tile('Oʻrtacha turish', E.fmt(st.avgWake), 'Reja: ' + E.fmt(s.wake), 'muted') +
      '</section>';

    h += '<section class="card chart"><div class="row"><h2 class="grow">Uyqu oynasi</h2><span class="tiny muted">– – turish maqsadi</span></div>' +
      chartSvg(st, s) +
      '<div class="row tiny muted" style="gap:14px"><span class="row" style="gap:6px"><span class="dot" style="background:var(--accent)"></span>Ish kuni</span>' +
      '<span class="row" style="gap:6px"><span class="dot" style="background:var(--bar-free)"></span>Dam olish kuni</span></div></section>';

    var tips = insights(st, debt, s, now);
    if (tips.length) {
      h += '<h2 class="section-title">Kuzatuvlar</h2><div class="stack">';
      tips.forEach(function (t) { h += '<div class="card soft insight">' + icon('bulb', 22) + '<span>' + t + '</span></div>'; });
      h += '</div>';
    }
    return h;
  }

  function tile(label, value, caption, tone) {
    return '<div class="tile"><span class="tiny muted">' + label + '</span><span class="v num">' + value + '</span><span class="tiny ' + tone + '">' + caption + '</span></div>';
  }

  function insights(st, debt, s, now) {
    var out = [], list = E.inLastDays(db.entries, now, ui.period);
    if (st.nights < 3) out.push('Hozircha ' + st.nights + ' kecha yozilgan. Aniq xulosa uchun kamida bir hafta yozib boring.');
    if (st.jetlag != null && st.jetlag >= 60) {
      out.push('Dam olish kunlari uyqungiz oʻrtacha <b>' + E.fmtDur(st.jetlag) + '</b> kechroq. Dam kunlari ham odatdagidan koʻpi bilan 1 soat kech turishga harakat qiling.');
    }
    if (st.avgBed != null) {
      var late = E.nightOff(st.avgBed) - E.nightOff(E.tonightPlan(s).bed);
      if (late > 20) out.push('Oʻrtacha <b>' + E.fmtDur(late) + '</b> rejadan kech yotyapsiz. “Odat” boʻlimidagi bosqichma-bosqich reja yordam beradi.');
    }
    if (debt.minutes >= 120) out.push('Oxirgi haftada <b>' + E.fmtDur(debt.minutes) + '</b> uyqu yetishmadi. Uyquni bir kunda “toʻldirish” oʻrniga 2–3 kecha 30 daqiqa erta yoting.');
    var fresh = E.freshSleep(list, s);
    if (fresh != null) out.push('Tetik (4–5 ball) ertalablaringizda oʻrtacha <b>' + E.fmtDur(fresh) + '</b> uxlagansiz. Bu sizning shaxsiy meʼyoringizga yaqin.');
    var names = {};
    FACTORS.forEach(function (f) { names[f[0]] = f[1]; });
    E.moodInsights(list, FACTORS.map(function (f) { return f[0]; })).slice(0, 2).forEach(function (m) {
      out.push('“' + names[m.key] + '” boʻlgan kunlarning ertasiga kayfiyat oʻrtacha <b>' + Math.abs(m.diff) + ' ball ' +
        (m.diff < 0 ? 'past' : 'yuqori') + '</b>. Bu bogʻliqlik, sabab boʻlishi shart emas.');
    });
    if (!out.length) out.push('Ritmingiz barqaror. Shunday davom eting!');
    return out;
  }

  function viewHabits() {
    var s = db.settings, now = Date.now(), h = '';
    var days = E.consistency(db.entries, s, now, 21, 30);
    var ok = days.filter(function (d) { return d.status === 'ok'; }).length;
    var C = 2 * Math.PI * 40;
    h += header('21 kunlik yoʻl', 'Odat');

    h += '<section class="card"><div class="ring-row">' +
      '<svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="21 kundan ' + ok + ' kun bajarildi" style="flex-shrink:0">' +
      '<circle cx="48" cy="48" r="40" fill="none" stroke="var(--accent-soft)" stroke-width="10"/>' +
      '<circle cx="48" cy="48" r="40" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' +
      (ok / 21 * C).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 48 48)"/>' +
      '<text x="48" y="55" text-anchor="middle" font-size="22" font-weight="700" fill="currentColor">' + ok + '/21</text></svg>' +
      '<div class="stack" style="gap:4px"><h2>Bir xil vaqtda turish</h2><span class="small muted">' + E.fmt(s.wake) +
      ' ± 30 daqiqa. Bir kun oʻtib ketsa ham, yigʻilgan kunlar saqlanadi.</span></div></div>';
    h += '<div class="week">';
    days.slice(-7).forEach(function (d, i, arr) {
      var today = i === arr.length - 1;
      var label = d.status === 'ok' ? 'bajarildi' : d.status === 'miss' ? 'boshqa vaqtda turildi' : 'yozuv yoʻq';
      h += '<div><span class="tiny ' + (today ? '' : 'muted') + '" style="' + (today ? 'font-weight:700;color:var(--accent)' : '') + '">' + WD_SHORT[d.weekday] + '</span>' +
        '<span class="wd ' + d.status + '" role="img" aria-label="' + WD[d.weekday] + ': ' + label + '">' + (d.status === 'ok' ? icon('check', 16, 3) : '') + '</span></div>';
    });
    h += '</div></section>';

    var st = E.stats(db.entries, s, now, 14), target = E.tonightPlan(s).bed;
    var plan = E.gradualPlan(st.avgBed, target, 15, 3);
    h += '<section class="card"><div class="row"><h2 class="grow">Yotishni asta surish</h2><span class="tiny muted">har 3 kunda −15 daq</span></div>';
    if (!plan) {
      h += '<span class="small muted">Bir necha kecha yozing — oʻrtacha yotish vaqtingizdan shaxsiy reja tuziladi. Maqsad: ' + E.fmt(target) + '.</span>';
    } else if (plan.onTrack) {
      h += '<span class="small ok">Oʻrtacha yotish vaqtingiz (' + E.fmt(st.avgBed) + ') rejaga mos. Shunday davom eting.</span>';
    } else {
      h += '<span class="small muted">Hozir oʻrtacha ' + E.fmt(st.avgBed) + ' da yotyapsiz. Maqsad: ' + E.fmt(target) + '.</span><div class="steps">';
      plan.steps.forEach(function (p, i) {
        h += '<div class="step' + (i === 0 ? ' now' : '') + '"><span class="tiny">' + (p.to ? p.from + '–' + p.to + ' kun' : 'Maqsad') + '</span><b class="num">' + E.fmt(p.bed) + '</b></div>';
      });
      h += '</div><span class="tiny muted">Uygʻonish vaqti oʻzgarmaydi — faqat yotish vaqti siljiydi.</span>';
    }
    h += '</section>';

    var todayKey = E.dateKey(now), done = db.habits[todayKey] || {};
    var count = HABITS.filter(function (x) { return done[x[0]]; }).length;
    h += '<div class="row" style="margin:4px 4px 0"><h2 class="grow" style="font-size:20px">Bugungi kichik qadamlar</h2><span class="small muted">' + count + '/' + HABITS.length + '</span></div><div class="stack">';
    HABITS.forEach(function (x) {
      h += '<button class="habit" data-act="habit" data-v="' + x[0] + '" aria-pressed="' + !!done[x[0]] + '">' +
        '<span class="check">' + (done[x[0]] ? icon('check', 14, 3.5) : '') + '</span>' +
        '<span class="grow stack" style="gap:1px"><b style="font-size:15px">' + x[1] + '</b><span class="tiny muted">' + x[2] + '</span></span></button>';
    });
    h += '</div>';
    return h;
  }

  function viewLearn() {
    var h = header('Ilmiy asos', 'Bilim');
    h += '<article class="card hero"><span class="tiny" style="font-weight:600;letter-spacing:.4px;text-transform:uppercase;opacity:.85">Asosiy gʻoya</span>' +
      '<h2 style="font-size:22px;line-height:27px">Langar — uygʻonish vaqti. Sikl — yoʻl-yoʻriq.</h2>' +
      '<p style="margin:0;font-size:15px;line-height:21px;opacity:.92">Har kuni bir xil vaqtda turing, yotish vaqtini sikllarga qarab tanlang va ertalab oʻzingizni qanday his qilganingizni belgilang. Ilova qolganini hisoblaydi.</p></article>';
    h += '<div class="stack">';
    window.ARTICLES.forEach(function (a) {
      h += '<details class="art"><summary><span class="grow stack" style="gap:3px"><b style="font-size:15px;line-height:19px">' + esc(a.title) +
        '</b><span class="tiny muted">' + a.minutes + ' daq oʻqish</span></span><span class="chev">' + icon('chev', 18, 2.5) + '</span></summary>';
      a.body.forEach(function (p) { h += '<p>' + esc(p) + '</p>'; });
      h += '<div class="src">Manba: ' + esc(a.source) + '</div></details>';
    });
    return h + '</div>';
  }

  function viewSettings() {
    var s = db.settings, h = '';
    h += header('Shaxsiy sozlash', 'Sozlamalar', '<a class="icon-btn" href="#bugun" aria-label="Orqaga">' + icon('back', 22) + '</a>');
    h += '<section class="card">' +
      '<label class="field"><span>Uygʻonish vaqti</span><input class="input num" type="time" data-setting="wake" value="' + E.fmt(s.wake) + '"></label>' +
      selectField('Sikllar soni', 'cycles', s.cycles, [[4, '4 sikl'], [5, '5 sikl (tavsiya)'], [6, '6 sikl']]) +
      selectField('Bir sikl uzunligi', 'cycleLen', s.cycleLen, range(80, 110, 5).map(function (v) { return [v, v + ' daqiqa' + (v === 90 ? ' (oʻrtacha)' : '')]; })) +
      selectField('Uxlab qolish vaqti', 'latency', s.latency, [[5, '5 daqiqa'], [10, '10 daqiqa'], [15, '15 daqiqa'], [20, '20 daqiqa'], [30, '30 daqiqa']]) +
      selectField('Uyqu maqsadi', 'targetSleep', s.targetSleep, range(390, 540, 30).map(function (v) { return [v, E.fmtDur(v)]; })) +
      selectField('Dam olish kunlari', 'freeDays', s.freeDays.join(','), [['6,0', 'Shanba va yakshanba'], ['0', 'Faqat yakshanba']]) +
      '</section>';
    h += '<section class="card"><h2>Maʼlumotlar</h2>' +
      '<span class="small muted">Hammasi faqat shu qurilmada saqlanadi. Vaqti-vaqti bilan nusxa oling.</span>' +
      '<button class="btn secondary block" data-act="export">Nusxa olish (JSON)</button>' +
      '<label class="btn secondary block" style="cursor:pointer">Nusxadan tiklash<input type="file" accept="application/json,.json" data-act-change="import" hidden></label>';
    if (!db.entries.length) h += '<button class="btn ghost block" data-act="demo">Namuna maʼlumot bilan sinab koʻrish</button>';
    h += '<button class="btn danger block" data-act="clearAll">Hamma maʼlumotni oʻchirish</button>' +
      '<span class="tiny muted">' + db.entries.length + ' ta yozuv saqlangan.</span></section>';
    h += '<p class="tiny muted center" style="margin:0">Uyqu Ritmi 0.1 · tibbiy maslahat oʻrnini bosmaydi</p>';
    return h;
  }

  function range(a, b, step) { var r = []; for (var v = a; v <= b; v += step) r.push(v); return r; }

  function selectField(label, key, value, opts) {
    var h = '<label class="field"><span>' + label + '</span><select class="input" data-setting="' + key + '">';
    opts.forEach(function (o) { h += '<option value="' + o[0] + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + o[1] + '</option>'; });
    return h + '</select></label>';
  }

  // ---------- routing ----------

  var VIEWS = { bugun: viewToday, kundalik: viewLog, tahlil: viewAnalysis, odat: viewHabits, bilim: viewLearn, sozlamalar: viewSettings };
  var TABS = [['bugun', 'Bugun', 'moon'], ['kundalik', 'Kundalik', 'pencil'], ['tahlil', 'Tahlil', 'chart'], ['odat', 'Odat', 'repeat'], ['bilim', 'Bilim', 'book']];

  function route() {
    var parts = (location.hash || '#bugun').slice(1).split('/');
    var name = VIEWS[parts[0]] ? parts[0] : 'bugun';
    return { name: name, arg: parts[1] ? decodeURIComponent(parts[1]) : null };
  }

  function render() {
    var r = route(), main = document.getElementById('app');
    main.innerHTML = VIEWS[r.name](r.arg);
    var routeKey = r.name + '/' + (r.arg || '');
    if (ui.lastRoute !== routeKey) { window.scrollTo(0, 0); ui.lastRoute = routeKey; }
    var tabs = document.getElementById('tabs');
    if (!tabs.childElementCount) {
      tabs.innerHTML = TABS.map(function (t) {
        return '<a href="#' + t[0] + '" data-tab="' + t[0] + '">' + icon(t[2]) + t[1] + '</a>';
      }).join('');
    }
    var active = r.name === 'sozlamalar' ? 'bugun' : r.name;
    Array.prototype.forEach.call(tabs.children, function (a) {
      if (a.getAttribute('data-tab') === active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = 'Uyqu Ritmi — ' + (TABS.filter(function (t) { return t[0] === active; })[0] || TABS[0])[1];
  }

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  // ---------- actions ----------

  var ACTIONS = {
    sleep: function () {
      db.open = { bed: Date.now() };
      save(); render(); toast('Xayrli tun!');
    },
    cancelSleep: function () {
      if (!confirm('Uxlash qaydini bekor qilasizmi?')) return;
      db.open = null; save(); render();
    },
    wakeup: function () {
      var now = Date.now(), bed = db.open.bed;
      if (now - bed < 60 * MIN) {
        // Too short for a night: most likely a mis-tap.
        if (confirm('1 soatdan kam oʻtdi. Bu qayd bekor qilinsinmi?')) { db.open = null; save(); render(); }
        return;
      }
      var e = { id: uid(), bed: bed, wake: now, mood: null, factors: {}, note: '' };
      db.entries.push(e);
      db.open = null;
      save();
      ui.draftFor = null;
      go('#kundalik/' + e.id);
      toast('Xayrli tong!');
    },
    wakeShift: function (el) {
      db.settings.wake = E.mod(db.settings.wake + Number(el.getAttribute('data-v')));
      save(); render();
    },
    cycles: function (el) {
      db.settings.cycles = Number(el.getAttribute('data-v'));
      save(); render();
    },
    mood: function (el) {
      var n = Number(el.getAttribute('data-v'));
      ui.draft.mood = ui.draft.mood === n ? null : n;
      render();
    },
    factor: function (el) {
      var k = el.getAttribute('data-v');
      ui.draft.factors[k] = !ui.draft.factors[k];
      if (!ui.draft.factors[k]) delete ui.draft.factors[k];
      render();
    },
    saveEntry: function () {
      var d = ui.draft, t = draftTimes(d);
      if (!t) { toast('Sana va vaqtlarni kiriting'); return; }
      var hours = (t.wake - t.bed) / MIN / 60;
      if (hours < 1 || hours > 16) { toast('Vaqtlarni tekshiring: ' + E.fmtDur(hours * 60)); return; }
      if (t.wake > Date.now() + 5 * MIN) { toast('Uygʻonish vaqti hali kelmagan'); return; }
      var key = E.dateKey(t.wake);
      var same = db.entries.filter(function (e) { return e.id !== d.id && E.dateKey(e.wake) === key; });
      if (same.length && !confirm('Bu kun uchun yozuv bor. Yangisi bilan almashtirilsinmi?')) return;
      db.entries = db.entries.filter(function (e) { return e.id !== d.id && same.indexOf(e) < 0; });
      db.entries.push({ id: d.id || uid(), bed: t.bed, wake: t.wake, mood: d.mood, factors: d.factors, note: d.note.trim() });
      save();
      ui.draftFor = null;
      go('#kundalik');
      toast('Saqlandi');
    },
    deleteEntry: function () {
      if (!confirm('Bu yozuv oʻchirilsinmi?')) return;
      var id = ui.draft.id;
      db.entries = db.entries.filter(function (e) { return e.id !== id; });
      save();
      ui.draftFor = null;
      go('#kundalik');
    },
    period: function (el) {
      ui.period = Number(el.getAttribute('data-v'));
      render();
    },
    habit: function (el) {
      var k = el.getAttribute('data-v'), key = E.dateKey(Date.now());
      var day = db.habits[key] = db.habits[key] || {};
      day[k] = !day[k];
      save(); render();
    },
    export: function () {
      var name = 'uyqu-ritmi-' + E.dateKey(Date.now()) + '.json';
      var text = JSON.stringify(db, null, 2);
      var file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: name }).catch(function () { /* user closed the sheet */ });
        return;
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    },
    demo: function () {
      db.entries = demoEntries(Date.now());
      save(); toast('Namuna yuklandi'); go('#tahlil');
    },
    clearAll: function () {
      if (!confirm('Hamma yozuvlar va sozlamalar oʻchiriladi. Davom etasizmi?')) return;
      db = normalize({});
      save(); ui.draftFor = null; render(); toast('Tozalandi');
    }
  };

  function importFile(input) {
    var f = input.files && input.files[0];
    if (!f) return;
    f.text().then(function (text) {
      var data = normalize(JSON.parse(text));
      if (!confirm(data.entries.length + ' ta yozuv topildi. Joriy maʼlumotlar almashtirilsinmi?')) return;
      db = data; save(); ui.draftFor = null; render(); toast('Tiklandi');
    }).catch(function () { toast('Fayl oʻqilmadi'); });
  }

  // Plausible sample: steady weekdays, later weekends, a few late-caffeine days.
  function demoEntries(now) {
    var out = [], today = E.dateKey(now), seed = 7;
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (var i = 20; i >= 0; i--) {
      var key = E.addDays(today, -i), wd = E.weekday(key), free = wd === 6 || wd === 0;
      var base = E.keyToDate(key, 0).getTime();
      var caf = rnd() < 0.3, scr = rnd() < 0.5;
      var bedMin = 1370 + Math.round(rnd() * 45) + (free ? 60 : 0) + (caf ? 25 : 0);
      var wakeMin = 385 + Math.round(rnd() * 20) + (free ? 75 : 0);
      var bed = base + (bedMin - E.DAY) * MIN, wake = base + wakeMin * MIN;
      var sleep = (wake - bed) / MIN - 15;
      var mood = Math.max(1, Math.min(5, Math.round(1 + (sleep - 360) / 40 - (caf ? 1 : 0) + rnd())));
      var factors = {};
      if (caf) factors.caf = true;
      if (scr) factors.scr = true;
      if (rnd() < 0.5) factors.light = true;
      out.push({ id: uid() + i, bed: bed, wake: wake, mood: mood, factors: factors, note: '' });
    }
    return out;
  }

  // ---------- wiring ----------

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (!el || !ACTIONS[el.getAttribute('data-act')]) return;
    ev.preventDefault();
    ACTIONS[el.getAttribute('data-act')](el, ev);
  });

  document.addEventListener('input', function (ev) {
    var f = ev.target.getAttribute('data-field');
    if (!f || !ui.draft) return;
    ui.draft[f] = ev.target.value;
    if (f !== 'note') {
      var box = document.querySelector('[data-summary]'), html = draftSummary(ui.draft, db.settings);
      if (box) box.outerHTML = html || '<div data-summary></div>';
    }
  });

  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.getAttribute('data-act-change') === 'import') { importFile(el); el.value = ''; return; }
    var k = el.getAttribute('data-setting');
    if (!k) return;
    var v = el.value;
    if (k === 'wake') { if (!v) return; db.settings.wake = E.parseClock(v); }
    else if (k === 'freeDays') db.settings.freeDays = v.split(',').map(Number);
    else db.settings[k] = Number(v);
    save(); toast('Saqlandi');
  });

  window.addEventListener('hashchange', render);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });

  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline cache is optional */ });
  }
})();
