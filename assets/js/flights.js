/* TripSaathi – flight search results */
(function () {
  const { $, $$, h, esc, icon, d } = TS;
  const p = TS.params();
  const q = TS.Search.flightsFromParams(p);
  TS.mountChrome({ page: 'results', product: 'flights' });
  TS.Search.mount($('#srch'), 'flights', q, { compact: true });
  TS.store.set('last_flights', p);

  const legs = q.trip === 'multi' ? q.legs : q.trip === 'round' ? [{ from: q.from, to: q.to, dep: q.dep }, { from: q.to, to: q.from, dep: q.ret }] : [{ from: q.from, to: q.to, dep: q.dep }];
  const all = legs.map((l) => TS.gen.flights(l.from, l.to, l.dep, q.cls));
  const flat = all.flat();
  const multi = legs.length > 1;
  const nPax = q.ad + q.ch;
  const paxTotal = nPax + q.inf;
  const city = (c) => TS.airport(c).city;
  const cabin = TS.cabin(q.cls);
  const intl = flat.some((f) => f.intl);
  const fareLabel = (TS_DATA.specialFares.find((f) => f.key === q.fare) || {}).label;

  const bands = [['b6', 'Before 6 AM', 0, 360], ['m', '6 AM – 12 PM', 360, 720], ['a', '12 PM – 6 PM', 720, 1080], ['n', 'After 6 PM', 1080, 1440]];
  const band = (mins) => bands.find((b) => mins % 1440 >= b[2] && mins % 1440 < b[3])[0];
  const maxP = flat.length ? Math.max(...flat.map((f) => f.price)) : 0;
  const minP = flat.length ? Math.min(...flat.map((f) => f.price)) : 0;
  const minDur = flat.length ? Math.min(...flat.map((f) => f.dur)) : 1;
  const F = { stops: new Set(), dep: new Set(), arr: new Set(), al: new Set(), refund: false, maxPrice: maxP };
  let sort = 'cheap';
  let active = 0;
  const sel = all.map((list) => (list[0] ? list[0].id : null));
  const open = {};

  const pass = (f) =>
    (!F.stops.size || F.stops.has(Math.min(f.stops, 2))) && (!F.dep.size || F.dep.has(band(f.dep))) && (!F.arr.size || F.arr.has(band(f.arr))) &&
    (!F.al.size || F.al.has(f.airline)) && (!F.refund || f.refundable) && f.price <= F.maxPrice;
  const score = (f) => f.price / minP + (f.dur / minDur) * 0.5 + f.stops * 0.35;
  const sorters = {
    cheap: (a, b) => a.price - b.price,
    nonstop: (a, b) => a.stops - b.stops || a.price - b.price,
    prefer: (a, b) => score(a) - score(b),
    fast: (a, b) => a.dur - b.dur || a.price - b.price,
    early: (a, b) => (a.dep % 1440) - (b.dep % 1440),
  };
  const view = (i) => all[i].filter(pass).sort(sorters[sort]);
  const findF = (id) => flat.find((f) => f.id === id);
  const plusDay = (f) => { const n = Math.floor(f.arr / 1440); return n ? `<sup>+${n} day${n > 1 ? 's' : ''}</sup>` : ''; };
  const stopTxt = (f) => (f.stops ? `${f.stops} stop${f.stops > 1 ? 's' : ''} via ${f.via.map(city).join(', ')}` : 'Non stop');
  const offerAmt = (f) => Math.min(1500, Math.round(f.price * 0.12));

  /* ------------------------------------------------------------ page skeleton */
  const title = q.trip === 'multi' ? legs.map((l) => city(l.from)).concat(city(legs[legs.length - 1].to)).join(' → ') : `${city(q.from)} ${q.trip === 'round' ? '⇄' : '→'} ${city(q.to)}`;
  $('#page').innerHTML = `
    <div class="crumbs"><a href="index.html">Home</a> › Flights › ${esc(title)}</div>
    <div class="layout">
      <aside class="filters" id="filters" aria-label="Filters"></aside>
      <section id="results"></section>
    </div>`;
  document.title = `${title} Flights | TripSaathi`;

  /* ------------------------------------------------------------ filters */
  const countBy = (fn) => { const m = {}; flat.forEach((f) => { const k = fn(f); if (!m[k]) m[k] = { n: 0, min: Infinity }; m[k].n++; m[k].min = Math.min(m[k].min, f.price); }); return m; };
  const drawFilters = () => {
    const st = countBy((f) => Math.min(f.stops, 2));
    const al = countBy((f) => f.airline);
    const db = countBy((f) => band(f.dep));
    const ab = countBy((f) => band(f.arr));
    const ns = st[0] || { n: 0 };
    const topAl = Object.keys(al).sort((a, b) => al[a].min - al[b].min).slice(0, 2);
    const chk = (grp, v, label, info) => `<label class="fchk"><input type="checkbox" data-g="${grp}" value="${v}" ${F[grp] instanceof Set ? (F[grp].has(isNaN(v) ? v : +v) ? 'checked' : '') : F[grp] ? 'checked' : ''}><span>${label}</span><em>${info}</em></label>`;
    const tiles = (grp, counts) => `<div class="ftimes">${bands.map((b) => `<button type="button" class="ftime ${F[grp].has(b[0]) ? 'on' : ''}" data-g="${grp}" data-v="${b[0]}" ${counts[b[0]] ? '' : 'disabled'}><b>${b[1]}</b>${counts[b[0]] ? TS.inr(counts[b[0]].min) : '–'}</button>`).join('')}</div>`;
    $('#filters').innerHTML = `
      <div class="filters-h"><b>Filters</b><div class="row"><button type="button" data-clear>CLEAR ALL</button><button type="button" class="filters-close" data-close aria-label="Close">${icon('x', 18)}</button></div></div>
      <div class="fgrp"><h5>Popular Filters</h5>
        ${chk('stops', 0, 'Non Stop', ns.n ? TS.inr(ns.min) : '–')}
        ${chk('refund', 'r', 'Refundable Fares', flat.filter((f) => f.refundable).length + ' flights')}
        ${topAl.map((a) => chk('al', a, TS.airline(a).name, TS.inr(al[a].min))).join('')}
      </div>
      <div class="fgrp"><h5>Departure from ${esc(city(legs[0].from))}</h5>${tiles('dep', db)}</div>
      <div class="fgrp"><h5>Arrival at ${esc(city(legs[0].to))}</h5>${tiles('arr', ab)}</div>
      <div class="fgrp"><h5>${multi ? 'Price per leg' : 'One Way Price'}</h5><input class="range" type="range" min="${minP}" max="${maxP}" step="50" value="${F.maxPrice}" data-price aria-label="Maximum price"><div class="range-l"><span>${TS.inr(minP)}</span><span data-price-l>${TS.inr(F.maxPrice)}</span></div></div>
      <div class="fgrp"><h5>Stops</h5>${[0, 1, 2].filter((s) => st[s]).map((s) => chk('stops', s, s === 0 ? 'Non Stop' : s === 1 ? '1 Stop' : '2+ Stops', TS.inr(st[s].min))).join('')}</div>
      <div class="fgrp"><h5>Airlines</h5>${Object.keys(al).sort((a, b) => al[a].min - al[b].min).map((a) => chk('al', a, `${TS.airline(a).name} <em>(${al[a].n})</em>`, TS.inr(al[a].min))).join('')}</div>`;
  };
  drawFilters();
  const filtersEl = $('#filters');
  filtersEl.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.g === 'refund') F.refund = t.checked;
    else if (t.dataset.g) { const v = t.dataset.g === 'stops' ? +t.value : t.value; t.checked ? F[t.dataset.g].add(v) : F[t.dataset.g].delete(v); $$(`input[data-g="${t.dataset.g}"][value="${t.value}"]`, filtersEl).forEach((x) => (x.checked = t.checked)); }
    drawResults();
  });
  filtersEl.addEventListener('input', (e) => { if (e.target.hasAttribute('data-price')) { F.maxPrice = +e.target.value; $('[data-price-l]', filtersEl).textContent = TS.inr(F.maxPrice); drawResults(); } });
  filtersEl.addEventListener('click', (e) => {
    const tile = e.target.closest('.ftime');
    if (tile) { const s = F[tile.dataset.g]; s.has(tile.dataset.v) ? s.delete(tile.dataset.v) : s.add(tile.dataset.v); tile.classList.toggle('on'); drawResults(); return; }
    if (e.target.closest('[data-clear]')) { F.stops.clear(); F.dep.clear(); F.arr.clear(); F.al.clear(); F.refund = false; F.maxPrice = maxP; drawFilters(); drawResults(); }
    if (e.target.closest('[data-close]')) closeFilters();
  });
  const closeFilters = () => { filtersEl.classList.remove('open'); const s = $('.scrim'); if (s) s.remove(); };
  const openFilters = () => { filtersEl.classList.add('open'); const s = h('<div class="scrim"></div>'); s.addEventListener('click', closeFilters); document.body.appendChild(s); };

  /* ------------------------------------------------------------ cards */
  const segs = (f) => {
    const fly = f.dur - f.lay.reduce((a, b) => a + b, 0);
    const per = Math.round(fly / (f.stops + 1));
    const pts = [f.from].concat(f.via, [f.to]);
    let t = f.dep, out = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const A = TS.airport(pts[i]), B = TS.airport(pts[i + 1]);
      out += `<div class="seg"><div class="fc-al">${TS.airlineLogo(TS.airline(f.airline), 28)}<span><b>${TS.airline(f.airline).name}</b><small>${i ? f.airline + ' ' + (+f.no.split(' ')[1] + 7 * i) : f.no} · ${f.aircraft}</small></span></div><div><b>${TS.hm(t)}</b> <small>${d.nice(d.add(d.parse(f.date), Math.floor(t / 1440)))}</small><small>${A.city} (${A.code}) – ${A.name}</small></div><div class="fc-d">${TS.dur(per)}<div class="line"></div>${cabin.short}</div><div><b>${TS.hm(t + per)}</b> <small>${d.nice(d.add(d.parse(f.date), Math.floor((t + per) / 1440)))}</small><small>${B.city} (${B.code}) – ${B.name}</small></div></div>`;
      t += per;
      if (i < f.via.length) { out += `<span class="layover">${icon('clock', 13)} ${TS.dur(f.lay[i])} layover in ${B.city}</span>`; t += f.lay[i]; }
    }
    return out;
  };
  const detailsHTML = (f, tab = 'det') => {
    const base = Math.round(f.price * 0.83);
    const body = {
      det: segs(f) + `<div class="it-meta">${icon('luggage', 14)} Cabin: ${f.fares[0].cabin} &nbsp; ${icon('bag', 14)} Check-in: ${f.fares[0].checkin} (1 piece only)</div>`,
      fare: `<table class="tbl"><tbody><tr><td>Base fare (${nPax} × ${TS.inr(base)})</td><td>${TS.inr(base * nPax)}</td></tr><tr><td>Taxes &amp; surcharges</td><td>${TS.inr((f.price - base) * nPax)}</td></tr>${q.inf ? `<tr><td>Infant fare (${q.inf})</td><td>${TS.inr((intl ? 5000 : 1500) * q.inf)}</td></tr>` : ''}<tr><th>Total (${paxTotal} traveller${paxTotal > 1 ? 's' : ''})</th><th>${TS.inr(f.price * nPax + (intl ? 5000 : 1500) * q.inf)}</th></tr></tbody></table>`,
      can: `<table class="tbl"><thead><tr><th>Time frame (from departure)</th><th>Airline fee + TS fee</th></tr></thead><tbody><tr><td>0 – 2 hours</td><td>Non-refundable</td></tr><tr><td>2 hours – 3 days</td><td>${TS.inr(Math.min(f.price * 0.75, 4000 + f.price * 0.1))} + ₹300</td></tr><tr><td>3 days – 365 days</td><td>${TS.inr(Math.min(f.price * 0.5, 2999))} + ₹300</td></tr></tbody></table>`,
      chg: `<table class="tbl"><thead><tr><th>Time frame (from departure)</th><th>Airline fee + TS fee + fare difference</th></tr></thead><tbody><tr><td>0 – 2 hours</td><td>Not allowed</td></tr><tr><td>2 hours – 365 days</td><td>₹2,999 + ₹300 + fare difference</td></tr></tbody></table>`,
    }[tab];
    return `<div class="det-tabs">${[['det', 'FLIGHT DETAILS'], ['fare', 'FARE SUMMARY'], ['can', 'CANCELLATION'], ['chg', 'DATE CHANGE']].map(([k, l]) => `<button type="button" data-dtab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
  };
  const faresHTML = (f) => `<div class="fc-fares">${f.fares.map((fr, i) => `<div class="ff ${i === 1 ? 'best' : ''}"><div class="ff-h"><b>${TS.inr(fr.price)}</b><span>${fr.name}${i === 1 ? ' · RECOMMENDED' : ''}</span></div><small class="muted">per adult</small><ul><li>${icon('luggage', 14)} ${fr.cabin} cabin, ${fr.checkin} check-in</li><li>${icon('refund', 14)} ${fr.cancel}</li><li>${icon('calendar', 14)} ${fr.change}</li><li>${icon('seat', 14)} ${fr.seat}</li><li>${icon('meal', 14)} ${fr.meal}</li></ul><button type="button" class="btn-cta" data-book="${f.id}" data-fare="${fr.key}">BOOK NOW</button></div>`).join('')}</div>`;
  const card = (f) => {
    const al = TS.airline(f.airline);
    const o = open[f.id];
    return `<article class="fc" data-id="${f.id}">
      <div class="fc-main">
        <div class="fc-al">${TS.airlineLogo(al, 38)}<span><b>${al.name}</b><small>${f.no}</small></span></div>
        <div class="fc-t"><b>${TS.hm(f.dep)}</b><small>${esc(city(f.from))}</small></div>
        <div class="fc-d">${TS.dur(f.dur)}<div class="line ${f.stops ? 'stop' : ''}">${f.via.map((_, i) => `<i style="left:${((i + 1) / (f.stops + 1)) * 100}%"></i>`).join('')}</div><span class="st ${f.stops ? 's' : ''}">${stopTxt(f)}</span></div>
        <div class="fc-t r"><b>${TS.hm(f.arr)}${plusDay(f)}</b><small>${esc(city(f.to))}</small></div>
        <div class="fc-p"><b>${TS.inr(f.price)}</b><small>per adult</small></div>
        <div class="fc-cta"><button type="button" class="btn-out" data-toggle="prices">${o === 'prices' ? 'HIDE PRICES' : 'VIEW PRICES'}</button></div>
      </div>
      <div class="fc-sub"><span class="fc-offer">${icon('tag', 14)} Get ${TS.inr(offerAmt(f))} off using code TSFLY</span><div class="fc-tags">${f.seats ? `<span class="chip red">${f.seats} seat${f.seats > 1 ? 's' : ''} left</span>` : ''}${f.refundable ? '<span class="chip ok">Partially refundable</span>' : '<span class="chip">Non-refundable</span>'}${f.lock ? '<span class="chip blue">Lock price</span>' : ''}<button type="button" class="fc-more" data-toggle="details">${o === 'details' ? 'Hide' : 'View'} Flight Details ${icon(o === 'details' ? 'chevU' : 'chevD', 14)}</button></div></div>
      ${o === 'prices' ? faresHTML(f) : ''}${o === 'details' ? `<div class="fc-det">${detailsHTML(f)}</div>` : ''}
    </article>`;
  };
  const row = (f, li) => {
    const al = TS.airline(f.airline);
    return `<div class="fr ${sel[li] === f.id ? 'on' : ''}" data-pick="${f.id}" data-leg="${li}" role="radio" aria-checked="${sel[li] === f.id}" tabindex="0"><span class="rdo"></span><div class="fr-mid"><div class="fr-al">${TS.airlineLogo(al, 28)}<span><b>${al.name}</b><small>${f.no}</small></span></div><div><span class="t">${TS.hm(f.dep)}</span><small>${f.from}</small></div><div class="fc-d" style="text-align:left">${TS.dur(f.dur)}<br><span class="st ${f.stops ? 's' : ''}" style="font-size:11px">${f.stops ? f.stops + ' stop' : 'Non stop'}</span></div><div><span class="t">${TS.hm(f.arr)}${Math.floor(f.arr / 1440) ? '<sup class="no" style="font-size:10px">+' + Math.floor(f.arr / 1440) + '</sup>' : ''}</span><small>${f.to}</small></div></div><div class="pr">${TS.inr(f.price)}</div></div>`;
  };
  const sortbar = () => {
    const pickBest = (fn) => { const v = flat.filter(pass).sort(sorters[fn]); return v[0]; };
    return `<div class="sortbar">${[['cheap', 'Cheapest'], ['nonstop', 'Non Stop First'], ['prefer', 'You May Prefer'], ['fast', 'Fastest'], ['early', 'Early Departure']].map(([k, l]) => { const b = pickBest(k); return `<button type="button" data-sort="${k}" class="${sort === k ? 'on' : ''}"><b>${l}</b><small>${b ? TS.inr(b.price) + ' | ' + TS.dur(b.dur) : '–'}</small></button>`; }).join('')}</div>`;
  };
  const dstrip = () => {
    const base = d.parse(legs[0].dep);
    const days = [];
    for (let i = -3; i <= 3; i++) { const x = d.add(base, i); if (x >= d.today()) days.push(x); }
    while (days.length < 7) days.push(d.add(days[days.length - 1], 1));
    const prices = days.map((x) => TS.gen.minFare(legs[0].from, legs[0].to, x, q.cls));
    const lo = Math.min(...prices);
    return `<div class="dstrip"><button type="button" class="nav" data-shift="-1" aria-label="Earlier dates" ${d.add(base, -1) < d.today() ? 'disabled' : ''}>${icon('chevL', 18)}</button><div class="dstrip-days">${days.map((x, i) => `<button type="button" class="dday ${d.sameDay(x, base) ? 'on' : ''}" data-day="${d.iso(x)}"><b>${d.DAYS[x.getDay()].slice(0, 3)}, ${d.MONTHS[x.getMonth()]} ${x.getDate()}</b><small class="${prices[i] === lo ? 'lo' : ''}">${TS.inr(prices[i])}</small></button>`).join('')}</div><button type="button" class="nav" data-shift="1" aria-label="Later dates">${icon('chevR', 18)}</button></div>`;
  };
  const heading = () => {
    const count = multi ? view(active).length : view(0).length;
    const sub = `${q.trip === 'oneway' ? 'One way' : q.trip === 'round' ? 'Round trip' : 'Multi-city'} · ${d.nice(legs[0].dep)}${q.trip === 'round' ? ' – ' + d.nice(q.ret) : ''} · ${paxTotal} Traveller${paxTotal > 1 ? 's' : ''} · ${cabin.short}${q.fare !== 'regular' ? ' · ' + fareLabel + ' fare' : ''}`;
    return `<div class="res-h"><div><h1>Flights from ${esc(city(legs[0].from))} to ${esc(city(legs[multi && q.trip === 'multi' ? legs.length - 1 : 0].to))}</h1><p>${sub}</p></div><div class="row"><span class="muted small">${count} flights found</span><button type="button" class="btn-ghost mob-filter" data-filters>${icon('filter', 16)} Filters</button></div></div>`;
  };
  const promo = () => (TS.auth.user() ? `<div class="banner-strip">${icon('sparkle', 18)} Member price unlocked! Extra ₹150 off with <b>TSUPI</b> on UPI payments.</div>` : `<div class="banner-strip">${icon('lock', 18)} Login to unlock member-only fares and save more on this trip.<button type="button" class="btn-out" data-login>LOGIN NOW</button></div>`);
  const empty = () => `<div class="empty">${icon('plane', 40)}<h3>No flights match your filters</h3><p class="muted">Try removing a few filters to see more options.</p><button class="btn-out" data-clear-all type="button">CLEAR FILTERS</button></div>`;

  /* ------------------------------------------------------------ results */
  const results = $('#results');
  const drawResults = () => {
    if (!flat.length) { results.innerHTML = `<div class="empty">${icon('plane', 40)}<h3>No flights found for this route</h3><p class="muted">Please try a different city pair or date.</p></div>`; return; }
    let html = heading();
    if (!multi) {
      const list = view(0);
      html += dstrip() + sortbar() + promo() + (list.length ? list.map(card).join('') : empty());
    } else if (q.trip === 'round') {
      html += sortbar() + promo() + `<div class="split">${legs.map((l, li) => { const list = view(li); return `<div class="split-col"><h3>${esc(city(l.from))} → ${esc(city(l.to))} <small>${d.nice(l.dep)}</small></h3>${list.length ? list.map((f) => row(f, li)).join('') : empty()}</div>`; }).join('')}</div>`;
    } else {
      html += `<div class="legtabs">${legs.map((l, li) => { const s = sel[li] && findF(sel[li]); return `<button type="button" class="${li === active ? 'on' : ''}" data-legtab="${li}"><b>${l.from} → ${l.to}</b><small>${d.nice(l.dep)}</small><br>${s ? `<span class="ok">${s.no} · ${TS.inr(s.price)}</span>` : '<span class="muted small">Not selected</span>'}</button>`; }).join('')}</div>` + sortbar() + promo();
      const list = view(active);
      html += list.length ? list.map((f) => row(f, active)).join('') : empty();
    }
    results.innerHTML = html;
    if (multi) drawSticky();
  };

  /* sticky bar for multi-leg */
  let sticky;
  const drawSticky = () => {
    if (!sticky) { sticky = h('<div class="stickybar"><div class="container stickybar-in"></div></div>'); $('#page').after(sticky); }
    const chosen = sel.map((id) => id && findF(id));
    const ready = chosen.every(Boolean);
    const total = chosen.reduce((a, f) => a + (f ? f.price : 0), 0);
    $('.stickybar-in', sticky).innerHTML = `<div class="sb-legs">${chosen.map((f, i) => f ? `<div class="sb-leg">${TS.airlineLogo(TS.airline(f.airline), 30)}<span><small>${legs[i].from} → ${legs[i].to} · ${f.no}</small><b>${TS.hm(f.dep)} → ${TS.hm(f.arr)}</b> · ${TS.inr(f.price)}</span></div>` : `<div class="sb-leg"><span><small>${legs[i].from} → ${legs[i].to}</small><b>Select a flight</b></span></div>`).join('')}</div><div class="sb-tot"><b>${TS.inr(total * nPax)}</b><small>for ${nPax} adult${nPax > 1 ? 's' : ''}/child · <a href="#" data-farebk style="color:#9ec1ff">Fare breakup</a></small></div><button type="button" class="btn-cta" data-bookmulti ${ready ? '' : 'disabled'}>BOOK NOW</button>`;
  };

  /* ------------------------------------------------------------ booking */
  const itinLeg = (f, fare) => {
    const A = TS.airport(f.from), B = TS.airport(f.to), al = TS.airline(f.airline);
    return `<div class="it-leg"><div class="it-leg-h"><b>${esc(A.city)} → ${esc(B.city)}</b><span>${d.nice(f.date)} · ${stopTxt(f)} · ${TS.dur(f.dur)}</span></div>
      <div class="row" style="margin-bottom:10px">${TS.airlineLogo(al, 30)}<span><b>${al.name}</b> <span class="muted small">${f.no} · ${f.aircraft}</span></span><span class="chip blue" style="margin-left:auto">${fare.name}</span></div>
      <div class="it-row"><div><span class="t">${TS.hm(f.dep)}</span><small>${A.city} (${A.code})</small><small>${esc(A.name)}</small></div><div class="mid">${icon('plane', 18)}<br>${TS.dur(f.dur)}</div><div style="text-align:right"><span class="t">${TS.hm(f.arr)}</span><small>${B.city} (${B.code})</small><small>${esc(B.name)}</small></div></div>
      <div class="it-meta"><span>${icon('luggage', 14)} Cabin ${fare.cabin}</span><span>${icon('bag', 14)} Check-in ${fare.checkin}</span><span>${icon('refund', 14)} ${fare.cancel}</span><span>${icon('meal', 14)} ${fare.meal}</span></div></div>`;
  };
  const book = (parts) => {
    const per = parts.reduce((a, x) => a + x.fare.price, 0);
    const infFee = (intl ? 5000 : 1500) * q.inf * parts.length;
    const total = per * nPax + infFee;
    const base = Math.round(per * 0.83) * nPax + infFee;
    TS.checkout.go({
      type: 'flight', title, intl,
      subtitle: `${q.trip === 'oneway' ? 'One way' : q.trip === 'round' ? 'Round trip' : 'Multi-city'} · ${d.nice(legs[0].dep)} · ${paxTotal} Traveller${paxTotal > 1 ? 's' : ''} · ${cabin.short}`,
      date: legs[0].dep, endDate: legs[legs.length - 1].dep,
      pax: { ad: q.ad, ch: q.ch, inf: q.inf },
      base, taxes: total - base, fees: 0,
      itinerary: parts.map((x) => itinLeg(x.f, x.fare)).join(''),
      addons: [{ key: 'ins', label: 'Secure your trip with travel insurance', desc: 'Medical cover, trip delay and baggage loss protection', price: intl ? 449 : 199, perPax: true }, { key: 'zc', label: 'Zero cancellation', desc: 'Cancel anytime before 24 hrs and get a full refund of the airline fee', price: Math.round(per * 0.06), perPax: true }],
      backUrl: location.href,
    });
  };

  results.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-filters]')) { openFilters(); return; }
    if (t.closest('[data-login]')) { TS.openLogin(drawResults); return; }
    if (t.closest('[data-clear-all]')) { $('[data-clear]', filtersEl).click(); return; }
    const s = t.closest('[data-sort]');
    if (s) { sort = s.dataset.sort; drawResults(); return; }
    const day = t.closest('[data-day]');
    if (day) { location.href = 'flights.html?' + TS.qs(Object.assign({}, p, { dep: day.dataset.day })); return; }
    const sh = t.closest('[data-shift]');
    if (sh && !sh.disabled) { const nd = d.add(d.parse(legs[0].dep), +sh.dataset.shift * 3); location.href = 'flights.html?' + TS.qs(Object.assign({}, p, { dep: d.iso(nd < d.today() ? d.today() : nd) })); return; }
    const dt = t.closest('[data-dtab]');
    if (dt) { const c = dt.closest('.fc'); $('.fc-det', c).innerHTML = detailsHTML(findF(c.dataset.id), dt.dataset.dtab); return; }
    const tg = t.closest('[data-toggle]');
    if (tg) { const id = tg.closest('.fc').dataset.id; open[id] = open[id] === tg.dataset.toggle ? null : tg.dataset.toggle; const c = tg.closest('.fc'); c.outerHTML = card(findF(id)); return; }
    const bk = t.closest('[data-book]');
    if (bk) { const f = findF(bk.dataset.book); book([{ f, fare: f.fares.find((x) => x.key === bk.dataset.fare) }]); return; }
    const lt = t.closest('[data-legtab]');
    if (lt) { active = +lt.dataset.legtab; drawResults(); return; }
    const pk = t.closest('[data-pick]');
    if (pk) {
      const li = +pk.dataset.leg;
      sel[li] = pk.dataset.pick;
      if (q.trip === 'multi' && li < legs.length - 1) { active = li + 1; drawResults(); window.scrollTo({ top: results.offsetTop - 140, behavior: 'smooth' }); }
      else { $$(`.fr[data-leg="${li}"]`, results).forEach((x) => { const on = x.dataset.pick === sel[li]; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); drawSticky(); }
    }
  });
  results.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.fr')) { e.preventDefault(); e.target.click(); } });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-farebk]')) {
      e.preventDefault();
      const chosen = sel.map((id) => id && findF(id)).filter(Boolean);
      TS.modal({ title: 'Fare breakup', body: `<table class="tbl"><tbody>${chosen.map((f) => `<tr><td>${f.from} → ${f.to} · ${f.no}</td><td>${TS.inr(f.price)} × ${nPax}</td></tr>`).join('')}<tr><th>Total (excl. infants)</th><th>${TS.inr(chosen.reduce((a, f) => a + f.price, 0) * nPax)}</th></tr></tbody></table>` });
    }
    const bm = e.target.closest('[data-bookmulti]');
    if (bm && !bm.disabled) {
      const chosen = sel.map((id) => findF(id));
      const opts = ['saver', 'flexi', 'comfort'].map((k) => ({ k, name: chosen[0].fares.find((x) => x.key === k).name, price: chosen.reduce((a, f) => a + f.fares.find((x) => x.key === k).price, 0), fare: chosen[0].fares.find((x) => x.key === k) }));
      const m = TS.modal({ title: 'Select a fare type for your trip', body: `<div class="fc-fares" style="border:0;background:none;padding:0">${opts.map((o, i) => `<div class="ff ${i === 1 ? 'best' : ''}"><div class="ff-h"><b>${TS.inr(o.price)}</b><span>${o.name}</span></div><small class="muted">per adult, all flights</small><ul><li>${icon('luggage', 14)} ${o.fare.checkin} check-in</li><li>${icon('refund', 14)} ${o.fare.cancel}</li><li>${icon('meal', 14)} ${o.fare.meal}</li></ul><button type="button" class="btn-cta" data-fk="${o.k}">CONTINUE</button></div>`).join('')}</div>` });
      m.el.addEventListener('click', (ev) => { const b = ev.target.closest('[data-fk]'); if (b) { m.close(); book(chosen.map((f) => ({ f, fare: f.fares.find((x) => x.key === b.dataset.fk) }))); } });
    }
  });

  drawResults();
})();
