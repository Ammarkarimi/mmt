/* TripSaathi – shared utilities, icons, illustrations, widgets, header/footer, auth and data generators */
(function () {
  const D = window.TS_DATA;
  const TS = (window.TS = {});

  /* ================================================================ Basic utils */
  TS.$ = (s, r = document) => r.querySelector(s);
  TS.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  TS.h = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  TS.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  TS.inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  TS.num = (n) => Math.round(n).toLocaleString('en-IN');
  TS.params = () => Object.fromEntries(new URLSearchParams(location.search));
  TS.qs = (obj) => {
    const o = {};
    Object.keys(obj).forEach((k) => { if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') o[k] = obj[k]; });
    return new URLSearchParams(o).toString();
  };
  TS.hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  TS.rng = (seed) => {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  TS.pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  TS.shuffle = (r, arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  TS.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  TS.store = {
    get(k, d) { try { const v = localStorage.getItem('ts_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ts_' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem('ts_' + k); } catch (e) { /* ignore */ } },
  };
  TS.km = (a, b) => {
    const R = 6371, toR = (x) => (x * Math.PI) / 180;
    const dLat = toR(b.lat - a.lat), dLon = toR(b.lon - a.lon);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };

  /* ================================================================ Dates */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  TS.d = {
    MONTHS, MONTHS_L, DAYS,
    today() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); },
    add(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; },
    iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    parse(s) { if (!s) return null; const [y, m, dd] = s.split('-').map(Number); if (!y || !m || !dd) return null; return new Date(y, m - 1, dd); },
    diff(a, b) { return Math.round((TS.d.parse(typeof a === 'string' ? a : TS.d.iso(a)) - TS.d.parse(typeof b === 'string' ? b : TS.d.iso(b))) / 86400000); },
    yy(d) { return "'" + String(d.getFullYear()).slice(2); },
    short(d) { if (typeof d === 'string') d = TS.d.parse(d); return d.getDate() + ' ' + MONTHS[d.getMonth()]; },
    nice(d) { if (typeof d === 'string') d = TS.d.parse(d); return DAYS[d.getDay()].slice(0, 3) + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); },
    mid(d) { if (typeof d === 'string') d = TS.d.parse(d); return d.getDate() + ' ' + MONTHS[d.getMonth()] + TS.d.yy(d); },
    sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); },
    validFuture(s, fallbackDays) {
      const t = TS.d.today();
      const p = TS.d.parse(s);
      if (!p || p < t) return TS.d.iso(TS.d.add(t, fallbackDays));
      return s;
    },
  };
  TS.hm = (mins) => {
    const m = ((mins % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };
  TS.dur = (mins) => {
    const h = Math.floor(mins / 60), m = mins % 60;
    return (h ? h + 'h ' : '') + String(m).padStart(2, '0') + 'm';
  };

  /* ================================================================ Icons */
  const P = {
    plane: '<path d="M12 2.4c.8 0 1.4.7 1.4 1.5v5.3l7.8 4.7v2.1l-7.8-2.4v5l2 1.5v1.6L12 20.6l-3.4 1.1v-1.6l2-1.5v-5l-7.8 2.4v-2.1l7.8-4.7V3.9c0-.8.6-1.5 1.4-1.5z" fill="currentColor" stroke="none"/>',
    hotel: '<path d="M3 21V7.5l9-4.5 9 4.5V21"/><path d="M9.5 21v-4h5v4"/><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    villa: '<path d="M2.5 11.5L12 4l9.5 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    holiday: '<path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5h-17A8.5 8.5 0 0 1 12 3.5z"/><path d="M12 12v8"/><path d="M7.5 20.5h9"/><path d="M12 3.5c-2 2-3 5-3 8.5M12 3.5c2 2 3 5 3 8.5"/>',
    train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14"/><path d="M9 13.8h.01M15 13.8h.01"/><path d="M8 21l2-4M16 21l-2-4"/>',
    bus: '<rect x="4" y="3" width="16" height="15" rx="2.5"/><path d="M4 11h16"/><path d="M8 14.6h.01M16 14.6h.01"/><path d="M7 18v2.5M17 18v2.5"/><path d="M8 6.5h8"/>',
    car: '<path d="M5 16.5H3.5V12l2-5h13l2 5v4.5H19"/><path d="M3.5 12h17"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/><path d="M9.5 16.5h5"/>',
    visa: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><circle cx="12" cy="10" r="3.5"/><path d="M8.5 10h7M12 6.5c-1.2 1-1.2 6 0 7M12 6.5c1.2 1 1.2 6 0 7"/><path d="M9 17.5h6"/>',
    forex: '<rect x="2.5" y="5" width="19" height="14" rx="2.2"/><path d="M2.5 9.5h19"/><path d="M6 15h4"/><circle cx="16.5" cy="14.5" r="1.8"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/><path d="M3 13h18"/>',
    bag: '<path d="M5.5 8h13l-1 13h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    property: '<path d="M4 21V9.5l8-5.5 8 5.5V21"/><path d="M12 11v6M9 14h6"/>',
    chevD: '<path d="M6 9l6 6 6-6"/>', chevU: '<path d="M6 15l6-6 6 6"/>', chevR: '<path d="M9 6l6 6-6 6"/>', chevL: '<path d="M15 6l-6 6 6 6"/>',
    swap: '<path d="M7 4L3 8l4 4"/><path d="M3 8h14"/><path d="M17 20l4-4-4-4"/><path d="M21 16H7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor" stroke="none"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
    pool: '<path d="M2 19c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><path d="M8 16V6a2 2 0 0 1 4 0"/><path d="M16 16V6a2 2 0 0 0-4 0"/><path d="M8 10h8"/>',
    parking: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9.5 17V7h3.5a3 3 0 0 1 0 6H9.5"/>',
    food: '<path d="M6 3v8a2 2 0 0 0 2 2v8"/><path d="M10 3v8a2 2 0 0 1-2 2"/><path d="M8 3v6"/><path d="M17 21V3c-2 1-3 3.5-3 7h3"/>',
    snow: '<path d="M12 2.5v19M3.8 7.3l16.4 9.4M20.2 7.3L3.8 16.7"/><path d="M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2"/>',
    gym: '<path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/>',
    spa: '<path d="M12 20c-5 0-8.5-3-8.5-7 3 0 6.5 1.5 8.5 4 2-2.5 5.5-4 8.5-4 0 4-3.5 7-8.5 7z"/><path d="M12 17c-1.5-2-2.2-4-2.2-6 0-2.5 1-5 2.2-7 1.2 2 2.2 4.5 2.2 7 0 2-.7 4-2.2 6z"/>',
    glass: '<path d="M6 3.5h12l-6 8z"/><path d="M12 11.5v8.5M8 20.5h8"/>',
    bell: '<path d="M5 17.5a7 7 0 0 1 14 0"/><path d="M3 17.5h18"/><path d="M12 10.5V8.5M10.5 8.5h3"/><path d="M4 20.5h16"/>',
    kitchen: '<rect x="4.5" y="3" width="15" height="18" rx="2"/><path d="M4.5 9h15M8 6h.01M11.5 6h.01"/><path d="M8 13v4"/>',
    pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8C10 5 6.5 4.5 6.5 6.5S10 8 12 8zm0 0c2-3 5.5-3.5 5.5-1.5S14 8 12 8z"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    arrowR: '<path d="M4 12h16M14 6l6 6-6 6"/>', arrowL: '<path d="M20 12H4M10 6l-6 6 6 6"/>',
    heart: '<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
    headset: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M16 14.5h.01"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    luggage: '<rect x="6" y="7" width="12" height="13" rx="2"/><path d="M9 7V4h6v3"/><path d="M9 20v1.5M15 20v1.5M10 11v5M14 11v5"/>',
    meal: '<path d="M4 15a8 8 0 0 1 16 0z"/><path d="M2.5 18h19"/><path d="M12 7V5"/>',
    refund: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
    seat: '<path d="M7 3.5v9a2 2 0 0 0 2 2h7.5"/><path d="M6 18h11l1.5 3"/><path d="M8 14.5L6 21"/>',
    route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
    fb: '<path d="M14.5 8H17V4.5h-2.5a4 4 0 0 0-4 4V11H8v3.5h2.5V21H14v-6.5h2.6l.6-3.5H14V8.6c0-.3.2-.6.5-.6z"/>',
    xsoc: '<path d="M4.5 4h4l11 16h-4z"/><path d="M19.5 4L13.4 10.9M10.6 13.1L4.5 20"/>',
    insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.3 6.7h.01"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5v6.5M8 7.3h.01M12 17v-3.8a2.2 2.2 0 0 1 4.4 0V17M12 10.5V17"/>',
    yt: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    thumb: '<path d="M7 11v9H4v-9z"/><path d="M7 11l4-7c1.5 0 2.5 1 2.5 2.5V10h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z"/>',
  };
  TS.icon = (name, size = 20, cls = '') =>
    `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  /* ================================================================ Brand */
  TS.brand = { name: 'TripSaathi', short: 'TS', tagline: 'Har safar ka saathi', legal: 'TripSaathi Technologies Pvt. Ltd.' };
  let logoN = 0;
  TS.logoMark = (size = 34) => {
    const id = 'lg' + ++logoN;
    return `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF9A3D"/><stop offset=".55" stop-color="#FF5A4E"/><stop offset="1" stop-color="#F0386B"/></linearGradient></defs>
      <rect width="48" height="48" rx="14" fill="url(#${id})"/>
      <path d="M9.5 35.5c5 4.2 15.5 4.6 22-2.8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-dasharray=".2 4.6" opacity=".95"/>
      <path d="M10.5 21.5L38.5 10.5 24.2 26.4z" fill="#fff"/>
      <path d="M24.2 26.4L38.5 10.5 30.2 37.2z" fill="#FFE1D6"/>
      <path d="M24.2 26.4l1.6 5.6 4.4 5.2z" fill="#FFC2AE"/>
    </svg>`;
  };
  TS.logo = (variant = 'dark') =>
    `<a class="logo logo--${variant}" href="index.html" aria-label="${TS.brand.name} home">${TS.logoMark(36)}<span class="logo-word"><b>trip</b><i>saathi</i></span></a>`;

  /* ================================================================ Illustrations (procedural SVG scenes) */
  let sceneN = 0;
  const PAL = {
    beach: [['#7dd3fc', '#fef3c7'], ['#fbbf24', '#fde68a'], ['#fb923c', '#fecaca'], ['#38bdf8', '#e0f2fe']],
    mountain: [['#818cf8', '#fde68a'], ['#60a5fa', '#e0f2fe'], ['#a78bfa', '#fbcfe8'], ['#0ea5e9', '#f0f9ff']],
    snow: [['#93c5fd', '#f8fafc'], ['#a5b4fc', '#e0e7ff'], ['#7dd3fc', '#f0f9ff']],
    city: [['#1e1b4b', '#f472b6'], ['#0f172a', '#7c3aed'], ['#1e3a8a', '#fb923c'], ['#312e81', '#f9a8d4']],
    heritage: [['#f59e0b', '#fde68a'], ['#fb923c', '#fef3c7'], ['#f472b6', '#fde68a']],
    desert: [['#f97316', '#fde68a'], ['#ea580c', '#fcd34d'], ['#fb7185', '#fed7aa']],
    lake: [['#38bdf8', '#e0f2fe'], ['#818cf8', '#fce7f3'], ['#22d3ee', '#ecfeff']],
    river: [['#fb923c', '#fef3c7'], ['#60a5fa', '#fef9c3'], ['#f472b6', '#fef3c7']],
    tea: [['#7dd3fc', '#f0fdf4'], ['#a7f3d0', '#f0fdfa'], ['#93c5fd', '#ecfccb']],
    forest: [['#86efac', '#f0fdf4'], ['#67e8f9', '#ecfdf5'], ['#a5b4fc', '#ecfccb']],
    island: [['#22d3ee', '#cffafe'], ['#38bdf8', '#e0f2fe'], ['#06b6d4', '#ecfeff']],
  };
  TS.scene = function (kind, seed = 1) {
    const r = TS.rng(TS.hash(kind + ':' + seed));
    const id = 'sc' + ++sceneN;
    const R = (a, b) => a + (b - a) * r();
    const I = (a, b) => Math.floor(R(a, b + 1));
    let defs = '', g = '';
    const lin = (n, stops, vertical = true) => {
      defs += `<linearGradient id="${id}${n}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops.map((c, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
      return `url(#${id}${n})`;
    };
    const smooth = (pts) => {
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        d += ` Q${pts[i][0]},${pts[i][1]} ${mx},${my}`;
      }
      const l = pts[pts.length - 1];
      return d + ` L${l[0]},${l[1]}`;
    };
    const hills = (base, amp, n, fill, op = 1) => {
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push([(i * 400) / n, base - R(0.2, 1) * amp]);
      g += `<path d="${smooth(pts)} L400,250 L0,250 Z" fill="${fill}" opacity="${op}"/>`;
    };
    const peaks = (base, count, hMin, hMax, fill, snowCap) => {
      for (let i = 0; i < count; i++) {
        const cx = R(-20, 420), w = R(120, 220), h = R(hMin, hMax);
        g += `<path d="M${cx - w / 2},${base} L${cx},${base - h} L${cx + w / 2},${base} Z" fill="${fill}"/>`;
        g += `<path d="M${cx},${base - h} L${cx + w / 2},${base} L${cx + w * 0.1},${base} Z" fill="#000" opacity=".08"/>`;
        if (snowCap) {
          const s = 0.26;
          g += `<path d="M${cx - (w / 2) * s},${base - h * (1 - s)} L${cx},${base - h} L${cx + (w / 2) * s},${base - h * (1 - s)} L${cx + w * 0.05},${base - h * (1 - s * 0.7)} L${cx - w * 0.02},${base - h * (1 - s * 1.1)} L${cx - w * 0.07},${base - h * (1 - s * 0.8)} Z" fill="#fff" opacity=".95"/>`;
        }
      }
    };
    const pines = (count, yMin, yMax, color) => {
      const arr = [];
      for (let i = 0; i < count; i++) arr.push([R(0, 400), R(yMin, yMax)]);
      arr.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => {
        const s = 0.6 + ((y - yMin) / Math.max(1, yMax - yMin)) * 0.8;
        g += `<path d="M${x},${y - 34 * s} L${x + 11 * s},${y - 10 * s} L${x + 6 * s},${y - 10 * s} L${x + 14 * s},${y} L${x - 14 * s},${y} L${x - 6 * s},${y - 10 * s} L${x - 11 * s},${y - 10 * s} Z" fill="${color}"/><rect x="${x - 1.5 * s}" y="${y}" width="${3 * s}" height="${6 * s}" fill="${color}"/>`;
      });
    };
    const palm = (x, base, s, color = '#14532d') => {
      const lean = R(-18, 18);
      const tx = x + lean * s, ty = base - 95 * s;
      g += `<path d="M${x},${base} Q${x + lean * 0.2 * s},${base - 50 * s} ${tx},${ty}" stroke="#78350f" stroke-width="${5 * s}" fill="none" stroke-linecap="round"/>`;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + R(-0.3, 0.3);
        const ex = tx + Math.cos(a) * 42 * s, ey = ty + Math.sin(a) * 20 * s + 12 * s;
        const cx = tx + Math.cos(a) * 22 * s, cy = ty - 14 * s;
        g += `<path d="M${tx},${ty} Q${cx},${cy} ${ex},${ey} Q${cx},${cy + 8 * s} ${tx},${ty}" fill="${color}"/>`;
      }
    };
    const clouds = (n, yMax, op = 0.8) => {
      for (let i = 0; i < n; i++) {
        const x = R(0, 400), y = R(20, yMax), s = R(0.6, 1.3);
        g += `<g opacity="${op}" fill="#fff"><ellipse cx="${x}" cy="${y}" rx="${26 * s}" ry="${9 * s}"/><ellipse cx="${x + 12 * s}" cy="${y - 7 * s}" rx="${14 * s}" ry="${10 * s}"/><ellipse cx="${x - 10 * s}" cy="${y - 4 * s}" rx="${11 * s}" ry="${8 * s}"/></g>`;
      }
    };
    const birds = (n) => {
      for (let i = 0; i < n; i++) {
        const x = R(40, 360), y = R(30, 90), s = R(0.6, 1.2);
        g += `<path d="M${x - 7 * s},${y} q${3.5 * s},-${4 * s} ${7 * s},0 q${3.5 * s},-${4 * s} ${7 * s},0" stroke="#1f2937" stroke-width="1.4" fill="none" opacity=".55"/>`;
      }
    };
    const pal = TS.pick(r, PAL[kind] || PAL.city);

    switch (kind) {
      case 'beach': {
        g += `<rect width="400" height="250" fill="${lin('s', [pal[0], pal[1]])}"/>`;
        g += `<circle cx="${R(60, 340)}" cy="${R(55, 95)}" r="${R(20, 32)}" fill="#fff7ed" opacity=".95"/>`;
        clouds(3, 80);
        g += `<rect y="128" width="400" height="70" fill="${lin('w', ['#0ea5e9', '#22d3ee'])}"/>`;
        for (let i = 0; i < 6; i++) g += `<path d="M${R(0, 360)},${R(140, 185)} h${R(20, 60)}" stroke="#fff" stroke-width="2" opacity=".45" stroke-linecap="round"/>`;
        g += `<path d="M0,190 Q120,${R(170, 185)} 220,192 T400,186 L400,250 L0,250 Z" fill="#fde68a"/>`;
        g += `<path d="M0,196 Q120,${R(180, 190)} 220,198 T400,192" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`;
        palm(R(20, 90), 238, R(0.9, 1.2));
        if (r() > 0.4) palm(R(300, 380), 240, R(0.7, 1));
        birds(3);
        break;
      }
      case 'mountain':
      case 'snow': {
        g += `<rect width="400" height="250" fill="${lin('s', [pal[0], pal[1]])}"/>`;
        g += `<circle cx="${R(60, 340)}" cy="${R(40, 80)}" r="${R(14, 22)}" fill="#fff" opacity=".85"/>`;
        clouds(2, 70, 0.7);
        peaks(200, 3, 110, 170, kind === 'snow' ? '#94a3b8' : '#6366f1', true);
        peaks(220, 3, 70, 120, kind === 'snow' ? '#cbd5e1' : '#4338ca', kind === 'snow');
        if (kind === 'snow') { hills(215, 25, 5, '#f8fafc'); pines(10, 200, 245, '#334155'); }
        else { hills(205, 30, 5, '#15803d'); hills(228, 22, 6, '#166534'); pines(14, 205, 248, '#14532d'); }
        birds(2);
        break;
      }
      case 'city': {
        g += `<rect width="400" height="250" fill="${lin('s', [pal[0], pal[1]])}"/>`;
        for (let i = 0; i < 40; i++) g += `<circle cx="${R(0, 400)}" cy="${R(0, 110)}" r="${R(0.4, 1.3)}" fill="#fff" opacity="${R(0.3, 0.9)}"/>`;
        g += `<circle cx="${R(260, 360)}" cy="${R(40, 70)}" r="16" fill="#fef9c3" opacity=".9"/>`;
        let x = -10;
        const far = '#312e81', near = '#0f172a';
        while (x < 410) { const w = R(18, 40), h = R(50, 120); g += `<rect x="${x}" y="${210 - h}" width="${w}" height="${h}" fill="${far}" opacity=".75"/>`; x += w + R(0, 6); }
        x = -5;
        while (x < 410) {
          const w = R(22, 46), h = R(40, 150), y = 230 - h;
          g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${near}"/>`;
          if (h > 120 && r() > 0.5) g += `<path d="M${x + w / 2},${y - 30} L${x + w / 2 + 3},${y} L${x + w / 2 - 3},${y} Z" fill="${near}"/>`;
          for (let wy = y + 8; wy < 222; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 7) if (r() > 0.55) g += `<rect x="${wx}" y="${wy}" width="3" height="4" fill="#fde68a" opacity="${R(0.5, 1)}"/>`;
          x += w + R(1, 5);
        }
        g += `<rect y="230" width="400" height="20" fill="#020617"/>`;
        break;
      }
      case 'heritage':
      case 'desert': {
        g += `<rect width="400" height="250" fill="${lin('s', [pal[0], pal[1]])}"/>`;
        g += `<circle cx="${R(80, 320)}" cy="${R(70, 110)}" r="${R(26, 40)}" fill="#fff7ed" opacity=".85"/>`;
        birds(3);
        if (kind === 'desert') {
          hills(190, 40, 4, '#fdba74');
          hills(215, 30, 4, '#fb923c');
        }
        const c = kind === 'desert' ? '#9a3412' : '#7c2d12';
        const bx = R(70, 160), bw = R(150, 210), by = kind === 'desert' ? 185 : 200;
        g += `<rect x="${bx}" y="${by - 50}" width="${bw}" height="50" fill="${c}"/>`;
        for (let a = bx + 8; a < bx + bw - 14; a += 22) g += `<path d="M${a},${by} v-18 a7,7 0 0 1 14,0 v18 z" fill="#fde68a" opacity=".35"/>`;
        const dc = bx + bw / 2;
        g += `<rect x="${dc - 26}" y="${by - 80}" width="52" height="30" fill="${c}"/><path d="M${dc - 30},${by - 80} Q${dc},${by - 140} ${dc + 30},${by - 80} Z" fill="${c}"/><rect x="${dc - 1.5}" y="${by - 128}" width="3" height="16" fill="${c}"/>`;
        [bx - 6, bx + bw - 6].forEach((mx) => { g += `<rect x="${mx}" y="${by - 105}" width="12" height="105" fill="${c}"/><path d="M${mx - 3},${by - 105} Q${mx + 6},${by - 128} ${mx + 15},${by - 105} Z" fill="${c}"/>`; });
        [bx + 30, bx + bw - 54].forEach((sx) => { g += `<path d="M${sx},${by - 50} Q${sx + 12},${by - 72} ${sx + 24},${by - 50} Z" fill="${c}"/>`; });
        g += `<rect y="${by}" width="400" height="${250 - by}" fill="${kind === 'desert' ? '#ea580c' : '#a16207'}"/>`;
        if (kind === 'heritage') g += `<rect x="${bx - 20}" y="${by + 6}" width="${bw + 40}" height="22" fill="#38bdf8" opacity=".55"/>`;
        break;
      }
      case 'lake':
      case 'river': {
        g += `<rect width="400" height="250" fill="${lin('s', [pal[0], pal[1]])}"/>`;
        g += `<circle cx="${R(60, 340)}" cy="${R(50, 85)}" r="${R(16, 26)}" fill="#fff" opacity=".85"/>`;
        clouds(3, 80, 0.75);
        peaks(160, 3, 60, 110, '#6d28d9', kind === 'lake');
        hills(160, 25, 5, '#15803d');
        g += `<rect y="158" width="400" height="92" fill="${lin('w', ['#38bdf8', '#0369a1'])}"/>`;
        for (let i = 0; i < 10; i++) g += `<path d="M${R(0, 380)},${R(168, 240)} h${R(15, 50)}" stroke="#fff" stroke-width="1.6" opacity=".35" stroke-linecap="round"/>`;
        if (kind === 'river') {
          for (let s = 0; s < 4; s++) g += `<rect x="0" y="${200 + s * 12}" width="${150 - s * 22}" height="12" fill="${['#fbbf24', '#f59e0b', '#d97706', '#b45309'][s]}"/>`;
          g += `<path d="M30,200 v-35 h40 v35 z M38,165 q12,-22 24,0z" fill="#b45309"/>`;
        }
        const bx2 = R(180, 300), by2 = R(195, 215);
        g += `<path d="M${bx2 - 34},${by2} Q${bx2},${by2 + 14} ${bx2 + 34},${by2} Z" fill="#7c2d12"/><path d="M${bx2 - 14},${by2 + 1} v-14 h28 v14" fill="#fde68a" stroke="#7c2d12" stroke-width="2"/><path d="M${bx2 - 18},${by2 - 13} h36 l-6,-8 h-24 z" fill="#b91c1c"/>`;
        pines(5, 150, 165, '#14532d');
        break;
      }
      case 'tea':
      case 'forest': {
        g += `<rect width="400" height="250" fill="${lin('s', [pal[0], pal[1]])}"/>`;
        g += `<circle cx="${R(60, 340)}" cy="${R(45, 80)}" r="${R(15, 24)}" fill="#fff" opacity=".9"/>`;
        clouds(3, 75, 0.85);
        hills(140, 40, 4, '#4ade80', 0.8);
        hills(175, 40, 4, '#22c55e');
        if (kind === 'tea') {
          for (let row = 0; row < 9; row++) {
            const y = 185 + row * 8;
            g += `<path d="M-10,${y} Q100,${y - R(8, 18)} 200,${y} T410,${y}" stroke="#15803d" stroke-width="3.5" fill="none" stroke-dasharray="6 3" opacity=".9"/>`;
          }
          hills(250, 0.1, 2, '#166534');
          for (let i = 0; i < 4; i++) { const tx = R(20, 380), ty = R(170, 185); g += `<rect x="${tx - 1.5}" y="${ty}" width="3" height="16" fill="#713f12"/><circle cx="${tx}" cy="${ty}" r="${R(8, 13)}" fill="#166534"/>`; }
        } else {
          hills(205, 30, 5, '#15803d');
          pines(26, 150, 248, '#14532d');
          g += `<rect y="150" width="400" height="30" fill="#fff" opacity=".18"/>`;
        }
        break;
      }
      case 'island': {
        g += `<rect width="400" height="250" fill="${lin('s', [pal[0], '#a5f3fc', '#0e7490'])}"/>`;
        g += `<rect y="90" width="400" height="160" fill="${lin('w', ['#22d3ee', '#0891b2'])}"/>`;
        clouds(3, 70, 0.9);
        const ix = R(40, 200), iw = R(90, 150);
        g += `<ellipse cx="${ix + iw / 2}" cy="112" rx="${iw / 2 + 12}" ry="10" fill="#fde68a"/><ellipse cx="${ix + iw / 2}" cy="106" rx="${iw / 2}" ry="12" fill="#16a34a"/>`;
        palm(ix + iw * 0.3, 108, 0.45);
        palm(ix + iw * 0.7, 108, 0.5);
        const hy = R(160, 185);
        g += `<path d="M0,${hy + 18} H400" stroke="#92400e" stroke-width="4"/>`;
        for (let k = 0; k < 4; k++) {
          const hx = 60 + k * 90 + R(-10, 10);
          g += `<path d="M${hx - 4},${hy + 18} v20 M${hx + 34},${hy + 18} v20" stroke="#78350f" stroke-width="3"/><rect x="${hx - 6}" y="${hy}" width="42" height="18" fill="#fef3c7" stroke="#92400e" stroke-width="2"/><path d="M${hx - 12},${hy + 2} L${hx + 15},${hy - 20} L${hx + 42},${hy + 2} Z" fill="#a16207"/>`;
        }
        for (let i = 0; i < 10; i++) g += `<path d="M${R(0, 380)},${R(125, 240)} h${R(15, 40)}" stroke="#fff" stroke-width="1.6" opacity=".35" stroke-linecap="round"/>`;
        break;
      }
      case 'room': {
        const wall = TS.pick(r, ['#fef3c7', '#e0e7ff', '#fce7f3', '#ecfccb', '#f5f5f4']);
        const accent = TS.pick(r, ['#1e3a8a', '#7c2d12', '#065f46', '#6b21a8', '#9f1239']);
        g += `<rect width="400" height="250" fill="${wall}"/><rect y="190" width="400" height="60" fill="#a16207" opacity=".55"/>`;
        g += `<rect x="250" y="30" width="110" height="100" rx="4" fill="${lin('v', ['#7dd3fc', '#e0f2fe'])}" stroke="#fff" stroke-width="6"/><path d="M305,30 v100" stroke="#fff" stroke-width="4"/>`;
        g += `<rect x="40" y="95" width="190" height="60" rx="8" fill="${accent}"/><rect x="30" y="150" width="210" height="45" rx="6" fill="#fff"/><rect x="30" y="180" width="210" height="25" rx="4" fill="${accent}" opacity=".85"/>`;
        g += `<rect x="55" y="130" width="70" height="24" rx="10" fill="#f8fafc"/><rect x="140" y="130" width="70" height="24" rx="10" fill="#f8fafc"/>`;
        g += `<rect x="252" y="160" width="40" height="40" fill="#78350f"/><path d="M262,160 l4,-30 h12 l4,30 z" fill="#fde68a"/><rect x="270" y="128" width="2" height="4" fill="#78350f"/>`;
        g += `<rect x="70" y="40" width="100" height="40" fill="#fff" stroke="${accent}" stroke-width="3" opacity=".9"/><path d="M75,75 l25,-20 20,14 15,-10 30,16" stroke="${accent}" fill="none" stroke-width="2"/>`;
        break;
      }
      case 'pool': {
        g += `<rect width="400" height="250" fill="${lin('s', ['#38bdf8', '#e0f2fe'])}"/>`;
        clouds(2, 60);
        g += `<rect y="120" width="400" height="130" fill="#f5f5f4"/><path d="M40,140 L360,140 L400,250 L0,250 Z" fill="${lin('p', ['#22d3ee', '#0284c7'])}"/>`;
        for (let i = 0; i < 9; i++) g += `<path d="M${R(30, 330)},${R(150, 240)} q10,-5 20,0 t20,0" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>`;
        palm(30, 140, 0.9); palm(370, 140, 0.8);
        [120, 230].forEach((ux) => { g += `<path d="M${ux},${100} v38" stroke="#57534e" stroke-width="2"/><path d="M${ux - 34},${102} Q${ux},${70} ${ux + 34},${102} Z" fill="#f97316"/>`; });
        g += `<rect x="150" y="122" width="44" height="8" rx="3" fill="#fff"/><rect x="200" y="122" width="44" height="8" rx="3" fill="#fff"/>`;
        break;
      }
      case 'lobby': {
        g += `<rect width="400" height="250" fill="#1c1917"/><rect y="170" width="400" height="80" fill="${lin('f', ['#a8a29e', '#57534e'])}"/>`;
        for (let i = 0; i < 6; i++) g += `<rect x="${20 + i * 66}" y="30" width="40" height="140" fill="#fde68a" opacity=".12"/>`;
        g += `<path d="M200,0 v40" stroke="#fde68a" stroke-width="2"/><ellipse cx="200" cy="55" rx="40" ry="14" fill="#fde68a" opacity=".9"/><ellipse cx="200" cy="55" rx="70" ry="24" fill="#fde68a" opacity=".15"/>`;
        g += `<rect x="80" y="150" width="120" height="30" rx="8" fill="#7f1d1d"/><rect x="80" y="135" width="120" height="20" rx="6" fill="#991b1b"/><rect x="230" y="155" width="80" height="12" rx="3" fill="#a16207"/><rect x="250" y="167" width="6" height="14" fill="#a16207"/><rect x="284" y="167" width="6" height="14" fill="#a16207"/>`;
        g += `<rect x="330" y="120" width="30" height="60" rx="4" fill="#14532d"/><circle cx="345" cy="112" r="20" fill="#166534"/>`;
        break;
      }
      case 'exterior':
      default: {
        g += `<rect width="400" height="250" fill="${lin('s', ['#60a5fa', '#dbeafe'])}"/>`;
        clouds(3, 70);
        const bw = R(180, 240), bx = 200 - bw / 2, top = R(40, 70);
        const facade = TS.pick(r, ['#f5f5f4', '#fef3c7', '#e7e5e4', '#fde68a']);
        g += `<rect x="${bx}" y="${top}" width="${bw}" height="${210 - top}" fill="${facade}"/><rect x="${bx - 6}" y="${top - 8}" width="${bw + 12}" height="10" fill="#57534e"/>`;
        for (let wy = top + 14; wy < 180; wy += 24) for (let wx = bx + 12; wx < bx + bw - 20; wx += 26) g += `<rect x="${wx}" y="${wy}" width="16" height="14" fill="#7dd3fc" stroke="#78716c" stroke-width="1.5"/>`;
        g += `<rect x="185" y="180" width="30" height="30" fill="#78350f"/><rect x="170" y="172" width="60" height="8" fill="#b91c1c"/>`;
        g += `<rect y="208" width="400" height="42" fill="#a3a3a3"/><rect y="205" width="400" height="6" fill="#4d7c0f"/>`;
        pines(4, 200, 215, '#166534');
        palm(R(20, 60), 215, 0.75);
        break;
      }
    }
    return `<svg class="scene" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${defs}</defs>${g}</svg>`;
  };

  /* ================================================================ Toast / modal / popover */
  TS.toast = (msg, type = '') => {
    let wrap = TS.$('.toasts');
    if (!wrap) { wrap = TS.h('<div class="toasts" role="status" aria-live="polite"></div>'); document.body.appendChild(wrap); }
    const t = TS.h(`<div class="toast ${type}">${TS.esc(msg)}</div>`);
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2800);
  };

  TS.modal = ({ title = '', body = '', cls = '', onClose } = {}) => {
    const el = TS.h(`<div class="modal-wrap ${cls}" role="dialog" aria-modal="true"><div class="modal"><button class="modal-x" aria-label="Close">${TS.icon('x', 22)}</button>${title ? `<h3 class="modal-title">${title}</h3>` : ''}<div class="modal-body"></div></div></div>`);
    const b = TS.$('.modal-body', el);
    if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body);
    document.body.appendChild(el);
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => el.classList.add('show'));
    const close = () => {
      el.classList.remove('show');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { el.remove(); if (!TS.$('.modal-wrap')) document.body.classList.remove('no-scroll'); }, 200);
      onClose && onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
    TS.$('.modal-x', el).addEventListener('click', close);
    return { el, body: b, close };
  };

  let activePop = null;
  TS.closePopover = () => { if (activePop) { const p = activePop; activePop = null; p.close(); } };
  TS.popover = (anchor, content, { cls = '', width, align = 'left', onClose } = {}) => {
    TS.closePopover();
    const pop = TS.h(`<div class="pop ${cls}"></div>`);
    if (typeof content === 'string') pop.innerHTML = content; else pop.appendChild(content);
    if (width) pop.style.width = width + 'px';
    document.body.appendChild(pop);
    const place = () => {
      const r = anchor.getBoundingClientRect();
      pop.style.top = r.bottom + window.scrollY + 4 + 'px';
      const pw = pop.offsetWidth;
      let left = align === 'right' ? r.right + window.scrollX - pw : r.left + window.scrollX;
      left = Math.max(8, Math.min(left, document.documentElement.clientWidth - pw - 8));
      pop.style.left = left + 'px';
    };
    place();
    anchor.classList.add('is-open');
    const onDoc = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) TS.closePopover(); };
    const onKey = (e) => { if (e.key === 'Escape') TS.closePopover(); };
    setTimeout(() => { document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey); }, 0);
    const handle = {
      el: pop, anchor, place,
      close() {
        document.removeEventListener('mousedown', onDoc);
        document.removeEventListener('keydown', onKey);
        anchor.classList.remove('is-open');
        pop.remove();
        if (activePop === handle) activePop = null;
        onClose && onClose();
      },
    };
    activePop = handle;
    return handle;
  };
  window.addEventListener('resize', () => { if (activePop && window.innerWidth > 640) activePop.place(); });

  /* ---------------------------------------------------------------- List picker (cities, stations…) */
  TS.pickList = (anchor, { items, placeholder = 'Search', groupTitle = 'POPULAR', onPick, popularFilter }) => {
    const el = TS.h(`<div class="lp"><div class="lp-search">${TS.icon('search', 18)}<input type="text" placeholder="${TS.esc(placeholder)}" autocomplete="off"></div><div class="lp-list"></div></div>`);
    const input = TS.$('input', el), list = TS.$('.lp-list', el);
    let shown = [];
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      shown = q ? items.filter((it) => (it.search || (it.title + ' ' + (it.sub || '') + ' ' + (it.code || '')).toLowerCase()).includes(q)) : items.filter(popularFilter || (() => true));
      shown = shown.slice(0, 40);
      list.innerHTML = (q ? '' : `<div class="lp-grp">${groupTitle}</div>`) +
        (shown.length
          ? shown.map((it, i) => `<button type="button" class="lp-item" data-i="${i}"><span class="lp-ic">${TS.icon(it.icon || 'pin', 18)}</span><span class="lp-txt"><b>${TS.esc(it.title)}</b>${it.sub ? `<small>${TS.esc(it.sub)}</small>` : ''}</span>${it.code ? `<span class="lp-code">${TS.esc(it.code)}</span>` : ''}</button>`).join('')
          : '<div class="lp-empty">No matching results. Try another keyword.</div>');
    };
    draw();
    input.addEventListener('input', draw);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && shown[0]) { e.preventDefault(); done(shown[0]); } });
    list.addEventListener('click', (e) => { const b = e.target.closest('.lp-item'); if (b) done(shown[+b.dataset.i]); });
    const done = (it) => { TS.closePopover(); onPick && onPick(it); };
    TS.popover(anchor, el, { cls: 'pop-list', width: 360 });
    setTimeout(() => input.focus(), 10);
  };

  /* ---------------------------------------------------------------- Date picker */
  TS.pickDate = (anchor, { value, min, max, start, end, onPick, priceFn, title, footer } = {}) => {
    min = min || TS.d.today();
    max = max || TS.d.add(TS.d.today(), 365);
    const sel = value ? TS.d.parse(value) : null;
    const rs = start ? TS.d.parse(start) : null, re = end ? TS.d.parse(end) : null;
    const base = sel || min;
    let view = new Date(base.getFullYear(), base.getMonth(), 1);
    const el = TS.h('<div class="cal"></div>');
    const month = (m) => {
      const first = new Date(m.getFullYear(), m.getMonth(), 1);
      const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      const offset = (first.getDay() + 6) % 7;
      let cells = '';
      for (let i = 0; i < offset; i++) cells += '<span class="cal-e"></span>';
      const prices = [];
      if (priceFn) for (let d = 1; d <= days; d++) { const dt = new Date(m.getFullYear(), m.getMonth(), d); if (dt >= min && dt <= max) prices.push(priceFn(dt)); }
      const lo = prices.length ? Math.min(...prices) : 0;
      for (let d = 1; d <= days; d++) {
        const dt = new Date(m.getFullYear(), m.getMonth(), d);
        const dis = dt < min || dt > max;
        const cls = ['cal-d'];
        if (dis) cls.push('dis');
        if (TS.d.sameDay(dt, sel)) cls.push('sel');
        if (rs && re && dt > rs && dt < re) cls.push('rng');
        if (TS.d.sameDay(dt, rs) || TS.d.sameDay(dt, re)) cls.push('edge');
        if (TS.d.sameDay(dt, TS.d.today())) cls.push('tod');
        let pr = '';
        if (priceFn && !dis) { const p = priceFn(dt); pr = `<em class="${p <= lo * 1.08 ? 'lo' : ''}">${p >= 100000 ? Math.round(p / 1000) + 'K' : TS.num(p)}</em>`; }
        cells += `<button type="button" class="${cls.join(' ')}" ${dis ? 'disabled' : ''} data-d="${TS.d.iso(dt)}"><span>${d}</span>${pr}</button>`;
      }
      return `<div class="cal-m"><div class="cal-mt">${MONTHS_L[m.getMonth()]} <span>${m.getFullYear()}</span></div><div class="cal-wk">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((w) => `<span>${w}</span>`).join('')}</div><div class="cal-g">${cells}</div></div>`;
    };
    const draw = () => {
      const next = new Date(view.getFullYear(), view.getMonth() + 1, 1);
      const canPrev = new Date(view.getFullYear(), view.getMonth(), 0) >= min;
      el.innerHTML = `${title ? `<div class="cal-title">${title}</div>` : ''}<button type="button" class="cal-nav prev" ${canPrev ? '' : 'disabled'} aria-label="Previous month">${TS.icon('chevL', 18)}</button><button type="button" class="cal-nav next" aria-label="Next month">${TS.icon('chevR', 18)}</button><div class="cal-ms">${month(view)}${month(next)}</div>${footer ? `<div class="cal-foot">${footer}</div>` : ''}`;
    };
    draw();
    el.addEventListener('click', (e) => {
      const n = e.target.closest('.cal-nav');
      if (n && !n.disabled) { view = new Date(view.getFullYear(), view.getMonth() + (n.classList.contains('next') ? 1 : -1), 1); draw(); return; }
      const d = e.target.closest('.cal-d');
      if (d && !d.disabled) { TS.closePopover(); onPick && onPick(d.dataset.d); }
    });
    TS.popover(anchor, el, { cls: 'pop-cal' });
  };

  /* ================================================================ Auth, bookings, checkout */
  TS.auth = {
    user: () => TS.store.get('user', null),
    login(u) { TS.store.set('user', u); TS.renderAccount(); },
    logout() { TS.store.del('user'); TS.renderAccount(); TS.toast('You have been logged out'); },
  };
  TS.bookings = {
    all: () => TS.store.get('bookings', []),
    add(b) { const a = TS.bookings.all(); a.unshift(b); TS.store.set('bookings', a); },
    update(id, patch) { TS.store.set('bookings', TS.bookings.all().map((b) => (b.id === id ? Object.assign({}, b, patch) : b))); },
  };
  TS.checkout = {
    set(o) { try { sessionStorage.setItem('ts_checkout', JSON.stringify(o)); } catch (e) { /* ignore */ } TS.store.set('checkout', o); },
    get() { try { const v = sessionStorage.getItem('ts_checkout'); if (v) return JSON.parse(v); } catch (e) { /* ignore */ } return TS.store.get('checkout', null); },
    go(o) { TS.checkout.set(o); location.href = 'review.html'; },
  };

  TS.openLogin = (after) => {
    const body = TS.h(`<div class="login">
      <div class="login-side">
        ${TS.logoMark(46)}
        <h4>Sign in to unlock</h4>
        <ul><li>${TS.icon('tag', 18)} Member-only fares & deals</li><li>${TS.icon('wallet', 18)} TripCoins on every booking</li><li>${TS.icon('bag', 18)} Manage all your trips in one place</li><li>${TS.icon('headset', 18)} Priority 24×7 support</li></ul>
      </div>
      <div class="login-main">
        <div class="login-tabs"><button class="on" data-t="p">PERSONAL ACCOUNT</button><button data-t="b">BUSINESS ACCOUNT</button></div>
        <div class="login-step" data-step="1">
          <label class="lbl">Mobile Number</label>
          <div class="phone-in"><span>+91</span><input type="tel" inputmode="numeric" maxlength="10" placeholder="Enter mobile number" autocomplete="tel-national"></div>
          <button class="btn-cta btn-block" data-act="cont">CONTINUE</button>
          <div class="login-or"><span>Or Login/Signup With</span></div>
          <div class="login-alt"><button data-act="email" title="Email">${TS.icon('mail', 22)}</button></div>
        </div>
        <div class="login-step hide" data-step="2">
          <button class="link-btn" data-act="back">${TS.icon('arrowL', 16)} Change number</button>
          <p class="muted">Enter the 6-digit OTP sent to <b class="otp-ph"></b><br><small>Demo tip: use any 6 digits.</small></p>
          <div class="otp">${'<input maxlength="1" inputmode="numeric">'.repeat(6)}</div>
          <label class="lbl">Your Name <small>(optional)</small></label>
          <input class="txt" type="text" placeholder="e.g. Aarav Sharma" data-name>
          <button class="btn-cta btn-block" data-act="verify">VERIFY & LOGIN</button>
        </div>
        <p class="tiny">By proceeding, you agree to ${TS.brand.name}'s <a href="#">Privacy Policy</a>, <a href="#">User Agreement</a> and <a href="#">T&Cs</a>.</p>
      </div></div>`);
    const m = TS.modal({ body, cls: 'modal-login' });
    const phone = TS.$('.phone-in input', body);
    setTimeout(() => phone.focus(), 50);
    let biz = false;
    TS.$$('.login-tabs button', body).forEach((b) => b.addEventListener('click', () => {
      TS.$$('.login-tabs button', body).forEach((x) => x.classList.toggle('on', x === b));
      biz = b.dataset.t === 'b';
      TS.$('.lbl', body).textContent = biz ? 'Work Email or Mobile Number' : 'Mobile Number';
    }));
    phone.addEventListener('input', () => { phone.value = phone.value.replace(/\D/g, ''); });
    const otps = TS.$$('.otp input', body);
    otps.forEach((o, i) => {
      o.addEventListener('input', () => { o.value = o.value.replace(/\D/g, ''); if (o.value && otps[i + 1]) otps[i + 1].focus(); });
      o.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !o.value && otps[i - 1]) otps[i - 1].focus(); });
    });
    body.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const act = a.dataset.act;
      if (act === 'cont') {
        if (!/^[6-9]\d{9}$/.test(phone.value)) { TS.toast('Please enter a valid 10-digit mobile number', 'err'); return; }
        TS.$('.otp-ph', body).textContent = '+91 ' + phone.value;
        TS.$('[data-step="1"]', body).classList.add('hide');
        TS.$('[data-step="2"]', body).classList.remove('hide');
        otps[0].focus();
      } else if (act === 'back') {
        TS.$('[data-step="2"]', body).classList.add('hide');
        TS.$('[data-step="1"]', body).classList.remove('hide');
      } else if (act === 'verify') {
        const code = otps.map((o) => o.value).join('');
        if (code.length !== 6) { TS.toast('Please enter the 6-digit OTP', 'err'); return; }
        const name = TS.$('[data-name]', body).value.trim() || 'Traveller';
        TS.auth.login({ name, phone: phone.value, biz });
        m.close();
        TS.toast(`Welcome, ${name}! You're now logged in.`, 'ok');
        after && after();
      } else if (act === 'email') {
        TS.toast('Email login is not available in this demo – please use your mobile number');
      }
    });
  };

  /* ================================================================ Header & footer */
  TS.products = [
    { key: 'flights', label: 'Flights', icon: 'plane', href: 'index.html?tab=flights' },
    { key: 'hotels', label: 'Hotels', icon: 'hotel', href: 'index.html?tab=hotels' },
    { key: 'homestays', label: 'Homestays & Villas', short: 'Homestays', icon: 'villa', href: 'index.html?tab=homestays' },
    { key: 'holidays', label: 'Holiday Packages', short: 'Holidays', icon: 'holiday', href: 'index.html?tab=holidays' },
    { key: 'trains', label: 'Trains', icon: 'train', href: 'index.html?tab=trains' },
    { key: 'buses', label: 'Buses', icon: 'bus', href: 'index.html?tab=buses' },
    { key: 'cabs', label: 'Cabs', icon: 'car', href: 'index.html?tab=cabs' },
    { key: 'visa', label: 'Visa', icon: 'visa', href: 'index.html?tab=visa' },
    { key: 'forex', label: 'Forex Card & Currency', short: 'Forex', icon: 'forex', href: 'index.html?tab=forex' },
    { key: 'insurance', label: 'Travel Insurance', short: 'Insurance', icon: 'shield', href: 'index.html?tab=insurance' },
  ];

  TS.renderAccount = () => {
    const slot = TS.$('.hdr-acct');
    if (!slot) return;
    const u = TS.auth.user();
    if (u) {
      slot.innerHTML = `<button class="acct-btn logged" type="button"><span class="avatar">${TS.esc(u.name.charAt(0).toUpperCase())}</span><span class="acct-txt"><b>Hi, ${TS.esc(u.name.split(' ')[0])}</b><small>${u.biz ? 'Business account' : 'Personal account'}</small></span>${TS.icon('chevD', 16)}</button>`;
      TS.$('.acct-btn', slot).addEventListener('click', (e) => {
        const menu = TS.h(`<div class="menu"><a href="mytrips.html">${TS.icon('bag', 18)} My Trips</a><a href="offers.html">${TS.icon('tag', 18)} My Offers</a><button type="button" data-act="wallet">${TS.icon('wallet', 18)} TripCoins: <b>${TS.num(TS.store.get('coins', 500))}</b></button><button type="button" data-act="logout">${TS.icon('logout', 18)} Logout</button></div>`);
        menu.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-act]');
          if (!b) return;
          TS.closePopover();
          if (b.dataset.act === 'logout') TS.auth.logout();
          else TS.toast('TripCoins can be redeemed at checkout');
        });
        TS.popover(e.currentTarget, menu, { cls: 'pop-menu', align: 'right', width: 230 });
      });
    } else {
      slot.innerHTML = `<button class="acct-btn" type="button"><span class="avatar">${TS.icon('user', 18)}</span><span class="acct-txt"><b>Login or Create Account</b></span>${TS.icon('chevD', 16)}</button>`;
      TS.$('.acct-btn', slot).addEventListener('click', () => TS.openLogin());
    }
  };

  TS.mountChrome = ({ page = 'home', product } = {}) => {
    const home = page === 'home';
    const nav = TS.products.slice(0, 7).map((p) => `<a href="${p.href}" class="hnav-i ${p.key === product ? 'on' : ''}">${TS.icon(p.icon, 22)}<span>${p.short || p.label}</span></a>`).join('');
    const hdr = TS.h(`<header class="hdr ${home ? 'hdr--home' : 'hdr--inner'}">
      <div class="container hdr-in">
        ${TS.logo(home ? 'light' : 'dark')}
        ${home ? '' : `<nav class="hnav" aria-label="Products">${nav}</nav>`}
        <div class="hdr-right">
          <a class="hdr-item hide-md" href="#" data-demo="List your property">${TS.icon('property', 22)}<span><b>List Your Property</b><small>Grow your business!</small></span></a>
          ${home ? `<a class="hdr-item hide-md" href="#" data-demo="${TS.brand.name} for Business">${TS.icon('briefcase', 22)}<span><b>Introducing TS Biz</b><small>Business Travel Solution</small></span></a>` : ''}
          <a class="hdr-item" href="mytrips.html">${TS.icon('bag', 22)}<span><b>My Trips</b><small>Manage your bookings</small></span></a>
          <div class="hdr-acct"></div>
          <button class="hdr-locale hide-sm" type="button"><span class="flag" aria-hidden="true"></span>IN | ENG | INR ${TS.icon('chevD', 14)}</button>
        </div>
      </div>
    </header>`);
    const slot = TS.$('#ts-header');
    if (slot) slot.replaceWith(hdr); else document.body.prepend(hdr);
    TS.renderAccount();
    TS.$$('[data-demo]', hdr).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); TS.toast(a.dataset.demo + ' – coming soon in this demo'); }));
    TS.$('.hdr-locale', hdr) && TS.$('.hdr-locale', hdr).addEventListener('click', (e) => {
      const menu = TS.h(`<div class="locale"><label>Country / Region<select><option>India</option><option>United Arab Emirates</option><option>United States</option></select></label><label>Language<select><option>English</option><option>हिंदी</option></select></label><label>Currency<select><option>INR – Indian Rupee</option><option>AED – UAE Dirham</option><option>USD – US Dollar</option></select></label><button class="btn-cta btn-block" type="button">APPLY</button></div>`);
      TS.$('button', menu).addEventListener('click', () => { TS.closePopover(); TS.toast('Preferences saved'); });
      TS.popover(e.currentTarget, menu, { cls: 'pop-menu', align: 'right', width: 260 });
    });
    if (!home) {
      const onScroll = () => hdr.classList.toggle('scrolled', window.scrollY > 4);
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    const routes = D.popularRoutes.map(([a, b]) => {
      const A = TS.airport(a), B = TS.airport(b);
      return `<a href="flights.html?${TS.qs({ from: a, to: b, dep: TS.d.iso(TS.d.add(TS.d.today(), 7)) })}">${A.city} – ${B.city} Flights</a>`;
    }).join('');
    const cityHotels = D.hotelCities.slice(0, 12).map((c) => `<a href="hotels.html?city=${encodeURIComponent(c.name)}">Hotels in ${c.name}</a>`).join('');
    const ftr = TS.h(`<footer class="ftr">
      <div class="container">
        <div class="ftr-seo">
          <h4>Why ${TS.brand.name}?</h4>
          <p>${TS.brand.name} is a one-stop travel companion for Indian travellers. From quick domestic hops to long-haul holidays, we bring flights, hotels, homestays, trains, buses, cabs and curated holiday packages together on one simple, transparent platform – with honest prices, round-the-clock support and instant refunds on eligible cancellations.</p>
          <h4>Booking flights with ${TS.brand.name}</h4>
          <p>Compare fares across airlines, filter by departure time, stops and baggage, and lock the best price in a few taps. Special fares for students, senior citizens, armed forces personnel, doctors and nurses are available on eligible routes.</p>
          <h4>Hotels, homestays &amp; holidays</h4>
          <p>Choose from handpicked hotels, private villas and cosy homestays across India and abroad. Every listing shows verified guest ratings, clear cancellation rules and all taxes upfront, so there are no surprises at check-in.</p>
        </div>
        <div class="ftr-cols">
          <div><h5>Popular Flight Routes</h5>${routes}</div>
          <div><h5>Popular Hotels</h5>${cityHotels}</div>
          <div><h5>Product Offering</h5><a href="index.html?tab=flights">Flights</a><a href="index.html?tab=hotels">Hotels</a><a href="holidays.html">Holiday Packages</a><a href="index.html?tab=homestays">Homestays &amp; Villas</a><a href="index.html?tab=trains">Trains</a><a href="index.html?tab=buses">Buses</a><a href="index.html?tab=cabs">Cabs</a><a href="index.html?tab=visa">Visa</a><a href="index.html?tab=forex">Forex Card</a><a href="index.html?tab=insurance">Travel Insurance</a><a href="offers.html">Offers</a></div>
          <div><h5>${TS.brand.name}</h5><a href="#" data-demo="About us">About Us</a><a href="#" data-demo="Investor relations">Investor Relations</a><a href="#" data-demo="Careers">Careers</a><a href="#" data-demo="Partner with us">Partner With Us</a><a href="#" data-demo="TS Biz">TS Biz – Corporate Travel</a><a href="#" data-demo="Gift cards">Gift Cards</a><a href="#" data-demo="Travel blog">Travel Blog</a></div>
          <div><h5>About the Site</h5><a href="#" data-demo="Customer support">Customer Support</a><a href="#" data-demo="Payment security">Payment Security</a><a href="#" data-demo="Privacy policy">Privacy Policy</a><a href="#" data-demo="User agreement">User Agreement</a><a href="#" data-demo="Terms of service">Terms of Service</a><a href="#" data-demo="Report a security issue">Report Security Issue</a></div>
        </div>
      </div>
      <div class="ftr-bot">
        <div class="container ftr-bot-in">
          <div class="ftr-brand">${TS.logo('light')}<span class="muted-l">${TS.brand.tagline}</span></div>
          <div class="ftr-soc">${['fb', 'xsoc', 'insta', 'linkedin', 'yt'].map((s) => `<a href="#" data-demo="Social" aria-label="${s}">${TS.icon(s, 20)}</a>`).join('')}</div>
          <div class="ftr-copy">© ${TS.d.today().getFullYear()} ${TS.brand.legal}<br><small>Demo project – all brands, airlines, hotels and offers shown are fictional.</small></div>
        </div>
      </div>
    </footer>`);
    const fslot = TS.$('#ts-footer');
    if (fslot) fslot.replaceWith(ftr); else document.body.appendChild(ftr);
    TS.$$('[data-demo]', ftr).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); TS.toast(a.dataset.demo + ' – coming soon in this demo'); }));
  };

  /* ================================================================ Lookups */
  TS.airport = (code) => D.airports.find((a) => a.code === code);
  TS.station = (code) => D.stations.find((s) => s.code === code);
  TS.roadCity = (name) => D.roadCities.find((c) => c.city.toLowerCase() === String(name).toLowerCase());
  TS.hotelCity = (name) => D.hotelCities.find((c) => c.name.toLowerCase() === String(name).toLowerCase());
  TS.cabin = (k) => D.cabinClasses.find((c) => c.key === k) || D.cabinClasses[0];
  TS.allAirlines = () => D.airlines.concat(D.intlAirlines);
  TS.airline = (code) => TS.allAirlines().find((a) => a.code === code);
  TS.airlineLogo = (al, size = 36) =>
    `<span class="al-logo" style="width:${size}px;height:${size}px;background:linear-gradient(135deg,${al.color},${al.color2})"><svg viewBox="0 0 24 24" width="${size * 0.55}" height="${size * 0.55}"><path d="M3 15.5L21 6l-4.5 12-4-3.8-3.2 3.3.6-4.8z" fill="#fff"/></svg></span>`;
  TS.ratingText = (r) => (r >= 4.5 ? 'Excellent' : r >= 4 ? 'Very Good' : r >= 3.5 ? 'Good' : 'Average');
  TS.stars = (n) => `<span class="stars" aria-label="${n} star">${TS.icon('star', 13).repeat(n)}</span>`;

  /* ================================================================ Generators */
  const cache = {};
  const memo = (key, fn) => (cache[key] || (cache[key] = fn()));
  TS.gen = {};

  TS.gen.flights = (from, to, date, cls = 'E') => memo(`f|${from}|${to}|${date}|${cls}`, () => {
    const A = TS.airport(from), B = TS.airport(to);
    if (!A || !B || from === to) return [];
    const km = TS.km(A, B);
    const intl = !!(A.intl || B.intl);
    const r = TS.rng(TS.hash(from + to + date));
    const pool = intl ? D.intlAirlines.concat(D.airlines.slice(0, 4)) : D.airlines;
    const n = intl ? 10 + Math.floor(r() * 7) : 14 + Math.floor(r() * 10);
    const ahead = Math.max(0, TS.d.diff(date, TS.d.today()));
    const demand = ahead < 3 ? 1.55 : ahead < 7 ? 1.28 : ahead < 21 ? 1.06 : 0.94;
    const dow = TS.d.parse(date).getDay();
    const wk = dow === 5 || dow === 0 ? 1.1 : dow === 2 || dow === 3 ? 0.95 : 1;
    const mult = TS.cabin(cls).mult;
    const out = [], used = new Set();
    for (let i = 0; i < n; i++) {
      const al = TS.pick(r, pool);
      let stops = km < 550 ? 0 : r() < (intl ? 0.45 : 0.32) ? 1 : 0;
      if (intl && km > 6500 && r() < 0.35) stops = 2;
      const base = Math.round(40 + (km / 790) * 60);
      const hubs = (intl && km > 2500 ? D.intlHubs : D.hubs).filter((h) => h !== from && h !== to);
      const via = [];
      for (let s = 0; s < stops; s++) { const h = TS.pick(r, hubs.filter((x) => !via.includes(x))); if (h) via.push(h); }
      stops = via.length;
      const lay = via.map(() => 55 + Math.floor(r() * 200));
      const dur = stops ? Math.round(base * 1.18) + lay.reduce((a, b) => a + b, 0) : base + Math.floor(r() * 18);
      let dep = r() < 0.08 ? Math.floor(r() * 300) : 300 + Math.floor(r() * 1080);
      dep -= dep % 5;
      const arr = dep + dur;
      let price = (intl ? 3800 + km * 4.05 : 1750 + km * 3.35) * al.factor * demand * wk * (stops ? 0.86 : 1) * (0.84 + r() * 0.42) * mult;
      price = Math.round(price);
      let no;
      do { no = al.code + ' ' + (100 + Math.floor(r() * 8800)); } while (used.has(no));
      used.add(no);
      const aircraft = km < 650 && !intl && r() < 0.5 ? 'ATR 72-600' : intl && km > 4000 ? TS.pick(r, ['Boeing 787-9', 'Airbus A350-900', 'Boeing 777-300ER']) : TS.pick(r, ['Airbus A320neo', 'Airbus A321neo', 'Boeing 737-8']);
      const bag = intl ? (cls === 'B' || cls === 'F' ? 40 : 25) : cls === 'B' || cls === 'F' ? 35 : 15;
      const fares = [
        { key: 'saver', name: 'SAVER', price, cabin: '7 Kgs', checkin: bag + ' Kgs', cancel: 'Cancellation fee starts at ' + TS.inr(Math.min(price * 0.75, 4000 + price * 0.1)), change: 'Date change fee starts at ' + TS.inr(2999), seat: 'Chargeable seats', meal: 'Chargeable meals' },
        { key: 'flexi', name: 'FLEXI', price: price + Math.round(price * 0.11) + 450, cabin: '7 Kgs', checkin: bag + ' Kgs', cancel: 'Lower cancellation fee of ' + TS.inr(1500), change: 'Free date change (fare difference applies)', seat: 'Free standard seats', meal: 'Complimentary meals' },
        { key: 'comfort', name: 'COMFORT+', price: price + Math.round(price * 0.24) + 900, cabin: '10 Kgs', checkin: bag + 10 + ' Kgs', cancel: 'Free cancellation up to 3 days before departure', change: 'Free date change', seat: 'Free XL seats', meal: 'Complimentary meals & priority check-in' },
      ];
      out.push({
        id: `${from}${to}${date.replace(/-/g, '')}-${i}`,
        airline: al.code, no, from, to, date, dep, arr, dur, stops, via, lay, price, fares, aircraft, intl,
        seats: r() < 0.28 ? 1 + Math.floor(r() * 7) : 0,
        refundable: r() > 0.25,
        lock: r() > 0.6,
      });
    }
    return out.sort((a, b) => a.price - b.price);
  });
  TS.gen.minFare = (from, to, date, cls) => {
    const f = TS.gen.flights(from, to, typeof date === 'string' ? date : TS.d.iso(date), cls);
    return f.length ? f[0].price : 0;
  };

  TS.gen.hotels = (city, type = 'hotel') => memo(`h|${city}|${type}`, () => {
    const C = TS.hotelCity(city) || { name: city, country: 'India', kind: 'city', tier: 2800, localities: ['City Centre', 'Old Town', 'Railway Station Area', 'Airport Road', 'Lakeside'], landmark: 'City Centre' };
    const r = TS.rng(TS.hash(C.name + type));
    const homestay = type === 'homestay';
    const names = TS.shuffle(r, homestay ? D.homestayNames : D.hotelNames);
    const n = homestay ? 16 + Math.floor(r() * 6) : 20 + Math.floor(r() * 8);
    const out = [];
    for (let i = 0; i < n; i++) {
      const stars = homestay ? TS.pick(r, [0, 3, 3, 4, 4]) : TS.pick(r, [2, 3, 3, 3, 4, 4, 4, 5, 5]);
      const sv = stars || 3;
      const rating = Math.round(TS.clamp(3.3 + sv * 0.16 + r() * 0.85, 3.2, 4.9) * 10) / 10;
      const locality = TS.pick(r, C.localities);
      const base = C.tier * (0.42 + sv * 0.27) * (0.72 + r() * 0.62) * (homestay ? 0.9 : 1);
      const price = Math.max(899, Math.round(base / 50) * 50 - 1);
      const mrp = Math.round((price * (1.18 + r() * 0.42)) / 10) * 10;
      const resortish = ['beach', 'island', 'mountain', 'lake', 'forest', 'tea', 'snow'].includes(C.kind);
      const ptype = homestay ? TS.pick(r, ['Homestay', 'Villa', 'Cottage', 'Apartment', 'Homestay']) : stars >= 4 && resortish && r() < 0.45 ? 'Resort' : TS.pick(r, ['Hotel', 'Hotel', 'Hotel', 'Boutique Hotel']);
      const am = ['wifi'];
      D.amenities.slice(1).forEach((a) => {
        const p = { pool: sv >= 4 ? 0.75 : 0.2, spa: sv >= 4 ? 0.6 : 0.1, gym: sv >= 4 ? 0.7 : 0.25, bar: sv >= 4 ? 0.6 : 0.2, kitchen: homestay ? 0.8 : 0.08 }[a.key] ?? 0.65;
        if (r() < p) am.push(a.key);
      });
      const tags = [];
      if (r() < 0.62) tags.push('Free Cancellation');
      if (r() < 0.5) tags.push('Breakfast Included');
      if (r() < 0.6) tags.push('Couple Friendly');
      if (r() < 0.3) tags.push('Pay at Hotel');
      const nm = names[i % names.length] + (i >= names.length ? ' ' + locality : '');
      const roomTypes = homestay
        ? [['Entire ' + ptype, 650, 'Sleeps 4'], ['Private Room', 220, '2 Guests']]
        : [['Standard Room', 180, 'Queen Bed'], ['Deluxe Room', 260, 'King Bed'], [sv >= 4 ? 'Premium Suite' : 'Family Room', 420, sv >= 4 ? 'King Bed + Living' : '2 Queen Beds']];
      out.push({
        id: i, name: nm, city: C.name, country: C.country, locality, stars, rating, reviews: 60 + Math.floor(r() * 4200),
        dist: (0.2 + r() * 6).toFixed(1) + ' km from ' + C.landmark,
        price, mrp, tax: Math.round(price * (price > 7500 ? 0.18 : 0.12)), amenities: am, tags, type: ptype, kind: C.kind,
        seed: TS.hash(nm + C.name) % 100000,
        images: [C.kind, 'exterior', ptype === 'Resort' || am.includes('pool') ? 'pool' : 'lobby', 'room', 'room'],
        rooms: roomTypes.map(([rn, sz, bed], k) => {
          const rp = Math.round((price * (1 + k * 0.32)) / 10) * 10 - 1;
          return { name: rn, size: sz + (k ? Math.floor(r() * 60) : 0) + ' sq.ft', bed, view: TS.pick(r, ['City View', 'Garden View', resortish ? 'Valley View' : 'Pool View', C.kind === 'beach' || C.kind === 'island' ? 'Sea View' : 'Courtyard View']),
            options: [
              { name: 'Room Only', price: rp, perks: ['No meals included', tags.includes('Free Cancellation') ? 'Free Cancellation till 24 hrs before check-in' : 'Non-Refundable'] },
              { name: 'Room with Breakfast', price: Math.round(rp * 1.14), perks: ['Free Breakfast', 'Free Cancellation till 24 hrs before check-in', '10% off on food & beverages'] },
            ] };
        }),
        blurb: TS.pick(r, [`Walking distance to ${C.landmark}`, `Rooftop dining with panoramic views`, `Loved by couples for its privacy`, `Family-friendly with spacious rooms`, `Recently renovated rooms`, `Great value for money`, `Peaceful location away from the crowds`]),
        rank: r(),
      });
    }
    return out;
  });

  TS.gen.trains = (from, to, date) => memo(`t|${from}|${to}|${date}`, () => {
    const A = TS.station(from), B = TS.station(to);
    if (!A || !B || from === to) return [];
    const km = Math.round(TS.km(A, B) * 1.22);
    const r = TS.rng(TS.hash('tr' + from + to + date));
    const types = D.trainTypes.filter((t) => !t.maxKm || km <= t.maxKm);
    const n = 6 + Math.floor(r() * 6);
    const out = [];
    const short = (s) => s.city.split(' ').pop();
    for (let i = 0; i < n; i++) {
      const T = TS.pick(r, types);
      const no = String(TS.pick(r, [12, 22, 20, 14, 11]) * 1000 + Math.floor(r() * 999));
      const nm = r() < 0.5 ? `${short(B)} ${T.type}` : `${short(A)} ${short(B)} ${T.type}`;
      const dur = Math.round((km / T.speed) * 60 + r() * 60);
      let dep = Math.floor(r() * 1440); dep -= dep % 5;
      const days = [0, 1, 2, 3, 4, 5, 6].map(() => r() > 0.25);
      days[TS.d.parse(date).getDay()] = true;
      const classes = T.classes.map((c) => {
        const rate = D.trainClasses.find((x) => x.key === c).rate;
        const fare = Math.round(Math.max(rate * 120, km * rate * 0.95 * T.factor) + 40);
        const x = r();
        const avl = x < 0.45 ? { t: 'AVAILABLE-' + String(1 + Math.floor(r() * 220)).padStart(4, '0'), c: 'ok' } : x < 0.65 ? { t: 'RAC ' + (1 + Math.floor(r() * 40)), c: 'warn' } : x < 0.9 ? { t: 'GNWL' + (5 + Math.floor(r() * 80)) + '/WL' + (2 + Math.floor(r() * 50)), c: 'wl' } : { t: 'REGRET', c: 'no' };
        return { cls: c, fare, avl, tatkal: r() < 0.4, upd: Math.floor(1 + r() * 50) + ' mins ago' };
      });
      out.push({ no, name: nm, type: T.type, from, to, date, dep, arr: dep + dur, dur, km, days, classes, freeCancel: r() < 0.5, rating: Math.round((3.6 + r() * 1.2) * 10) / 10 });
    }
    return out.sort((a, b) => a.dep - b.dep);
  });

  TS.gen.buses = (from, to, date) => memo(`b|${from}|${to}|${date}`, () => {
    const A = TS.roadCity(from), B = TS.roadCity(to);
    if (!A || !B || A === B) return [];
    const km = Math.round(TS.km(A, B) * 1.3);
    const r = TS.rng(TS.hash('bus' + from + to + date));
    const n = 9 + Math.floor(r() * 7);
    const out = [];
    for (let i = 0; i < n; i++) {
      const T = TS.pick(r, D.busTypes);
      const op = TS.pick(r, D.busOperators);
      const dur = Math.round((km / (44 + r() * 14)) * 60);
      let dep = r() < 0.75 ? 1020 + Math.floor(r() * 400) : 300 + Math.floor(r() * 600);
      dep -= dep % 15;
      const price = Math.round(Math.max(349, km * 1.55 * T.factor * (0.85 + r() * 0.35)) / 10) * 10 - 1;
      const bp = ['Central Bus Stand', 'Railway Station', 'Ring Road Flyover', 'Highway Toll Plaza', 'Metro Station Gate 2'];
      out.push({
        id: `${i}`, op, type: T.label, ac: T.ac, sleeper: T.sleeper, from, to, date, dep, arr: dep + dur, dur, km, price,
        rating: Math.round((3.4 + r() * 1.5) * 10) / 10, ratings: 40 + Math.floor(r() * 2200),
        seatsLeft: 4 + Math.floor(r() * 30), seed: Math.floor(r() * 1e6),
        amen: TS.shuffle(r, ['Water Bottle', 'Blanket', 'Charging Point', 'Reading Light', 'CCTV', 'Emergency Contact', 'Track My Bus SMS']).slice(0, 3 + Math.floor(r() * 3)),
        boarding: TS.shuffle(r, bp).slice(0, 3).map((p, k) => ({ name: `${from} – ${p}`, time: dep + k * 20 })),
        dropping: TS.shuffle(r, bp).slice(0, 3).map((p, k) => ({ name: `${to} – ${p}`, time: dep + dur - 40 + k * 20 })),
        live: r() < 0.7, primo: r() < 0.25,
      });
    }
    return out.sort((a, b) => a.dep - b.dep);
  });

  TS.gen.seats = (bus) => {
    const r = TS.rng(bus.seed);
    const decks = [];
    if (bus.sleeper) {
      ['Lower', 'Upper'].forEach((dk, di) => {
        const rows = [];
        for (let i = 0; i < 6; i++) rows.push(['A', null, 'B', 'C'].map((c) => (c ? { id: (di ? 'U' : 'L') + (i + 1) + c, booked: r() < 0.45, ladies: r() < 0.08, price: bus.price + (di ? -50 : 0) + (c === 'A' ? 60 : 0), sleeper: true } : null)));
        decks.push({ name: dk, rows });
      });
    } else {
      const rows = [];
      for (let i = 0; i < 10; i++) rows.push(['A', 'B', null, 'C', 'D'].map((c) => (c ? { id: i + 1 + c, booked: r() < 0.5, ladies: r() < 0.07, price: bus.price + (c === 'A' || c === 'D' ? 30 : 0), sleeper: false } : null)));
      decks.push({ name: 'Seats', rows });
    }
    return decks;
  };
})();
