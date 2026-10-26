/* TripSaathi – cab search results */
(function () {
  const D = window.TS_DATA;
  const { $, esc, icon, d } = TS;
  const p = TS.params();
  const mode = ['oneway', 'round', 'airport', 'hourly'].includes(p.mode) ? p.mode : 'oneway';
  const q = { mode, from: TS.roadCity(p.from) ? p.from : 'New Delhi', to: TS.roadCity(p.to) ? p.to : 'Agra', date: d.validFuture(p.date, 1), ret: d.validFuture(p.ret, 2), time: /^\d\d:\d\d$/.test(p.time || '') ? p.time : '10:00', pkg: D.rentalPackages.includes(p.pkg) ? p.pkg : D.rentalPackages[2], airport: TS.airport(p.airport) ? p.airport : 'DEL', dir: p.dir === 'from' ? 'from' : 'to' };
  if (q.ret < q.date) q.ret = q.date;
  TS.mountChrome({ page: 'results', product: 'cabs' });
  TS.Search.mount($('#srch'), 'cabs', q, { compact: true });

  const r = TS.rng(TS.hash(JSON.stringify(q)));
  let km, label, days = 1, hours;
  if (mode === 'oneway' || mode === 'round') {
    km = Math.max(60, Math.round(TS.km(TS.roadCity(q.from), TS.roadCity(q.to)) * 1.28));
    days = mode === 'round' ? Math.max(1, d.diff(q.ret, q.date) + 1) : 1;
    label = `${q.from} ${mode === 'round' ? '⇄' : '→'} ${q.to}`;
  } else if (mode === 'airport') {
    km = 18 + Math.floor(r() * 28);
    const a = TS.airport(q.airport);
    label = q.dir === 'to' ? `${q.from} → ${a.city} Airport (${a.code})` : `${a.city} Airport (${a.code}) → ${q.from}`;
  } else {
    const [hh, kk] = q.pkg.match(/\d+/g).map(Number);
    hours = hh; km = kk;
    label = `${q.from} · Hourly rental ${q.pkg}`;
  }
  const driveMins = Math.round((km / (mode === 'airport' || mode === 'hourly' ? 28 : 52)) * 60);
  const priceFor = (c) => {
    if (mode === 'oneway') return Math.round(Math.max(km, 120) * c.rate + 300);
    if (mode === 'round') return Math.round(Math.max(km * 2, 250 * days) * c.rate * 0.92 + 300 * days);
    if (mode === 'airport') return Math.round(349 + km * c.rate * 1.15);
    return Math.round(km * c.rate * 1.2 + hours * 140);
  };
  const carSVG = (color) => `<svg viewBox="0 0 160 70" width="140" height="62" aria-hidden="true"><ellipse cx="80" cy="62" rx="70" ry="5" fill="#000" opacity=".12"/><path d="M12 48c0-7 3-12 10-13l18-4 16-14c4-3 8-4 13-4h34c6 0 11 2 15 6l12 12 13 3c6 2 9 6 9 12v6c0 3-2 5-5 5H17c-3 0-5-2-5-5z" fill="${color}"/><path d="M46 31l14-12c3-2 6-3 10-3h14v15zM90 16h12c4 0 8 2 11 5l10 10H90z" fill="#dbeafe"/><rect x="88" y="16" width="3" height="15" fill="${color}"/><circle cx="42" cy="55" r="10" fill="#1f2937"/><circle cx="42" cy="55" r="4.5" fill="#9ca3af"/><circle cx="120" cy="55" r="10" fill="#1f2937"/><circle cx="120" cy="55" r="4.5" fill="#9ca3af"/><rect x="140" y="40" width="9" height="4" rx="2" fill="#fde68a"/><rect x="13" y="42" width="7" height="4" rx="2" fill="#fca5a5"/></svg>`;

  document.title = `${label} Cabs | TripSaathi`;
  const fmt12 = TS.Search.fmt12;
  const incl = mode === 'hourly' ? ['Driver allowance', `${km} km included`, `₹${14 + Math.floor(r() * 6)}/km after`] : mode === 'airport' ? ['Toll charges included', 'Meet & greet', '45 mins free waiting'] : ['Toll & state tax included', 'Driver allowance included', `Extra km at ₹${11 + Math.floor(r() * 6)}/km`];

  $('#page').innerHTML = `<div class="crumbs"><a href="index.html">Home</a> › Cabs › ${esc(label)}</div>
    <div class="trip-sum"><div><small>Trip</small><b>${esc(label)}</b></div><div><small>${mode === 'round' ? 'Dates' : 'Pickup'}</small><b>${d.nice(q.date)}${mode === 'round' ? ' – ' + d.nice(q.ret) : ''}, ${fmt12(q.time)}</b></div><div><small>${mode === 'hourly' ? 'Package' : 'Distance'}</small><b>${mode === 'hourly' ? q.pkg : '~' + TS.num(km * (mode === 'round' ? 2 : 1)) + ' km'}</b></div><div><small>Est. drive time</small><b>${TS.dur(mode === 'hourly' ? hours * 60 : driveMins)}</b></div></div>
    <div class="banner-strip">${icon('shield', 18)} All drivers are verified and cars are sanitised before every ride. Free cancellation up to 6 hours before pickup.</div>
    <div class="res-h"><div><h1>Choose your ride</h1><p>${D.cabs.length} car types available</p></div></div>
    <div id="cars">${D.cabs.map((c) => {
      const pr = priceFor(c);
      const mrp = Math.round(pr * (1.12 + r() * 0.12));
      const rating = (4.1 + r() * 0.8).toFixed(1);
      return `<article class="cc"><div class="cc-car">${carSVG(c.color)}</div><div><h3>${c.name}</h3><small class="muted">${esc(c.eg)}</small><div class="cc-sp"><span>${icon('user', 14)} ${c.seats} seats</span><span>${icon('luggage', 14)} ${c.bags} bags</span><span>${icon('snow', 14)} AC</span><span>${icon('star', 14)} ${rating}</span></div><div class="cc-inc">${incl.map((x) => `<span class="chip ok">${icon('check', 11)} ${x}</span>`).join('')}</div></div><div class="cc-p"><div><span class="strike small">${TS.inr(mrp)}</span><b>${TS.inr(pr)}</b><small>${Math.round((1 - pr / mrp) * 100)}% off · incl. taxes</small></div><button type="button" class="btn-cta" data-car="${c.key}" data-price="${pr}">SELECT</button></div></article>`;
    }).join('')}</div>`;

  $('#cars').addEventListener('click', (e) => {
    const b = e.target.closest('[data-car]');
    if (!b) return;
    const c = D.cabs.find((x) => x.key === b.dataset.car);
    const total = +b.dataset.price;
    const base = Math.round(total / 1.05);
    TS.checkout.go({
      type: 'cab', title: `${c.name} · ${label}`, subtitle: `${d.nice(q.date)}, ${fmt12(q.time)} · ${c.seats} seats`,
      date: q.date, endDate: mode === 'round' ? q.ret : q.date, pax: { ad: 1, ch: 0, inf: 0 }, primaryOnly: true, pickup: true,
      base, taxes: total - base, fees: 0,
      itinerary: `<div class="it-simple"><span>${carSVG(c.color)}</span><div><b>${c.name} – ${esc(c.eg)}</b><small>${esc(label)}</small><small>Pickup ${d.nice(q.date)} at ${fmt12(q.time)}${mode === 'round' ? ' · Return ' + d.nice(q.ret) : ''}</small><div class="it-meta">${incl.map((x) => `<span>${icon('check', 14)} ${x}</span>`).join('')}</div></div></div>`,
      backUrl: location.href,
    });
  });
})();
