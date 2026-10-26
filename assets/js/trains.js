/* TripSaathi – train search results */
(function () {
  const D = window.TS_DATA;
  const { $, $$, h, esc, icon, d } = TS;
  const p = TS.params();
  const q = { mode: 'book', from: TS.station(p.from) ? p.from : 'NDLS', to: TS.station(p.to) ? p.to : 'BCT', date: d.validFuture(p.date, 1), cls: D.trainClasses.some((c) => c.key === p.cls) ? p.cls : 'ALL' };
  TS.mountChrome({ page: 'results', product: 'trains' });
  TS.Search.mount($('#srch'), 'trains', q, { compact: true });

  const A = TS.station(q.from), B = TS.station(q.to);
  const list = TS.gen.trains(q.from, q.to, q.date);
  const bands = [['b6', 'Early Morning', '00:00 – 06:00', 0, 360], ['m', 'Morning', '06:00 – 12:00', 360, 720], ['a', 'Mid Day', '12:00 – 18:00', 720, 1080], ['n', 'Night', '18:00 – 24:00', 1080, 1440]];
  const band = (m) => bands.find((b) => m % 1440 >= b[3] && m % 1440 < b[4])[0];
  const AC = ['3E', '3A', '2A', '1A', 'CC', 'EC'];
  const F = { ac: false, avail: false, fc: false, cls: new Set(q.cls !== 'ALL' ? [q.cls] : []), types: new Set(), dep: new Set(), arr: new Set() };
  let sort = 'dep';
  const chosen = {};
  const paxN = {};

  const pass = (t) => {
    const cls = t.classes.filter((c) => (!F.cls.size || F.cls.has(c.cls)) && (!F.ac || AC.includes(c.cls)) && (!F.avail || c.avl.c === 'ok'));
    return cls.length && (!F.fc || t.freeCancel) && (!F.types.size || F.types.has(t.type)) && (!F.dep.size || F.dep.has(band(t.dep))) && (!F.arr.size || F.arr.has(band(t.arr)));
  };
  const sorters = { dep: (a, b) => a.dep - b.dep, fast: (a, b) => a.dur - b.dur, arr: (a, b) => (a.arr % 1440) - (b.arr % 1440), cheap: (a, b) => Math.min(...a.classes.map((c) => c.fare)) - Math.min(...b.classes.map((c) => c.fare)) };

  $('#page').innerHTML = `<div class="crumbs"><a href="index.html">Home</a> › Trains › ${esc(A.name)} to ${esc(B.name)}</div><div class="layout"><aside class="filters" id="filters"></aside><section id="results"></section></div>`;
  document.title = `${A.city} to ${B.city} Trains | TripSaathi`;

  const types = Array.from(new Set(list.map((t) => t.type)));
  const classes = Array.from(new Set(list.flatMap((t) => t.classes.map((c) => c.cls))));
  const chk = (g, v, label) => `<label class="fchk"><input type="checkbox" data-g="${g}" value="${v}" ${F[g] instanceof Set ? (F[g].has(v) ? 'checked' : '') : F[g] ? 'checked' : ''}><span>${label}</span></label>`;
  const tiles = (g) => `<div class="ftimes">${bands.map((b) => `<button type="button" class="ftime ${F[g].has(b[0]) ? 'on' : ''}" data-g="${g}" data-v="${b[0]}"><b>${b[1]}</b>${b[2]}</button>`).join('')}</div>`;
  const drawFilters = () => {
    $('#filters').innerHTML = `<div class="filters-h"><b>Filters</b><div class="row"><button type="button" data-clear>CLEAR ALL</button><button type="button" class="filters-close" data-close aria-label="Close">${icon('x', 18)}</button></div></div>
      <div class="fgrp"><h5>Quick Filters</h5>${chk('ac', 'ac', 'AC only')}${chk('avail', 'avail', 'Available seats only')}${chk('fc', 'fc', 'Free cancellation')}</div>
      <div class="fgrp"><h5>Journey Class</h5>${classes.map((c) => chk('cls', c, `${c} – ${D.trainClasses.find((x) => x.key === c).label}`)).join('')}</div>
      <div class="fgrp"><h5>Train Types</h5>${types.map((t) => chk('types', t, t)).join('')}</div>
      <div class="fgrp"><h5>Departure from ${esc(A.city)}</h5>${tiles('dep')}</div>
      <div class="fgrp"><h5>Arrival at ${esc(B.city)}</h5>${tiles('arr')}</div>`;
  };
  drawFilters();
  const fe = $('#filters');
  fe.addEventListener('change', (e) => { const t = e.target; const g = t.dataset.g; if (!g) return; if (F[g] instanceof Set) (t.checked ? F[g].add(t.value) : F[g].delete(t.value)); else F[g] = t.checked; draw(); });
  fe.addEventListener('click', (e) => {
    const tl = e.target.closest('.ftime');
    if (tl) { const s = F[tl.dataset.g]; s.has(tl.dataset.v) ? s.delete(tl.dataset.v) : s.add(tl.dataset.v); tl.classList.toggle('on'); draw(); return; }
    if (e.target.closest('[data-clear]')) { F.ac = F.avail = F.fc = false; ['cls', 'types', 'dep', 'arr'].forEach((k) => F[k].clear()); drawFilters(); draw(); }
    if (e.target.closest('[data-close]')) closeF();
  });
  const closeF = () => { fe.classList.remove('open'); const s = $('.scrim'); if (s) s.remove(); };
  const openF = () => { fe.classList.add('open'); const s = h('<div class="scrim"></div>'); s.addEventListener('click', closeF); document.body.appendChild(s); };

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const card = (t) => {
    const sel = chosen[t.no];
    const c = sel && t.classes.find((x) => x.cls === sel);
    const pax = paxN[t.no] || 1;
    const arrD = d.add(d.parse(t.date), Math.floor(t.arr / 1440));
    return `<article class="tc" data-no="${t.no}">
      <div class="tc-h">
        <div><h3>${esc(t.name)}</h3><small>#${t.no} · ${esc(t.type)}</small><div class="runs">Runs on: ${days.map((x, i) => `<span class="${t.days[i] ? 'y' : ''}">${x}</span>`).join('')}</div></div>
        <div class="tc-t"><b>${TS.hm(t.dep)}</b><small>${esc(A.name)} (${A.code})</small><small>${d.nice(t.date)}</small></div>
        <div class="tc-dur">${TS.dur(t.dur)}<div class="line"></div>${TS.num(t.km)} km</div>
        <div class="tc-t"><b>${TS.hm(t.arr)}</b><small>${esc(B.name)} (${B.code})</small><small>${d.nice(arrD)}</small></div>
      </div>
      <div class="tc-cls">${t.classes.filter((x) => !F.cls.size || F.cls.has(x.cls)).map((x) => `<button type="button" class="tcls ${sel === x.cls ? 'on' : ''} ${x.avl.c === 'no' ? 'dis' : ''}" data-cls="${x.cls}" ${x.avl.c === 'no' ? 'disabled' : ''}><div class="row-between"><b>${x.cls}${x.tatkal ? ' <span class="chip amber" style="font-size:9px;padding:1px 5px">TATKAL</span>' : ''}</b><span class="fare">${TS.inr(x.fare)}</span></div><span class="av ${x.avl.c}">${x.avl.t}</span><small>Updated ${x.upd}</small></button>`).join('')}</div>
      <div class="tc-f"><div class="row">${t.freeCancel ? `<span class="chip ok">${icon('refund', 12)} Free cancellation</span>` : ''}<span class="chip">${icon('star', 11)} ${t.rating} rated</span><a href="#" class="link-btn small" data-sched>View schedule</a></div>
        ${c ? `<div class="row"><label class="sort-sel">Travellers <select data-pax>${[1, 2, 3, 4, 5, 6].map((n) => `<option ${n === pax ? 'selected' : ''}>${n}</option>`).join('')}</select></label><b style="font-size:18px">${TS.inr(c.fare * pax)}</b><button type="button" class="btn-cta" data-book>BOOK NOW</button></div>` : '<span class="muted small">Select a class to see fare and book</span>'}
      </div></article>`;
  };
  const res = $('#results');
  const draw = () => {
    const v = list.filter(pass).sort(sorters[sort]);
    const prev = d.add(d.parse(q.date), -1);
    res.innerHTML = `<div class="res-h"><div><h1>Trains from ${esc(A.city)} to ${esc(B.city)}</h1><p>${v.length} trains · ${d.nice(q.date)}</p></div><div class="row"><button type="button" class="btn-ghost" data-day="-1" ${prev < d.today() ? 'disabled' : ''}>${icon('chevL', 14)} Prev day</button><button type="button" class="btn-ghost" data-day="1">Next day ${icon('chevR', 14)}</button><button type="button" class="btn-ghost mob-filter" data-filters>${icon('filter', 16)} Filters</button></div></div>
      <div class="sortbar">${[['dep', 'Departure', 'Earliest first'], ['fast', 'Duration', 'Fastest first'], ['arr', 'Arrival', 'Earliest first'], ['cheap', 'Price', 'Lowest first']].map(([k, l, s]) => `<button type="button" data-sort="${k}" class="${sort === k ? 'on' : ''}"><b>${l}</b><small>${s}</small></button>`).join('')}</div>
      <div class="banner-strip">${icon('shield', 18)} <span><b>Free Cancellation</b> on select trains – get a full refund of the ticket fare. Zero payment gateway fee on UPI.</span></div>
      ${v.length ? v.map(card).join('') : `<div class="empty">${icon('train', 40)}<h3>No trains found</h3><p class="muted">Try changing filters or the travel date.</p></div>`}`;
  };
  res.addEventListener('change', (e) => { if (e.target.matches('[data-pax]')) { const no = e.target.closest('.tc').dataset.no; paxN[no] = +e.target.value; e.target.closest('.tc').outerHTML = card(list.find((t) => t.no === no)); } });
  res.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-filters]')) { openF(); return; }
    const s = t.closest('[data-sort]');
    if (s) { sort = s.dataset.sort; draw(); return; }
    const dy = t.closest('[data-day]');
    if (dy && !dy.disabled) { location.href = 'trains.html?' + TS.qs(Object.assign({}, q, { date: d.iso(d.add(d.parse(q.date), +dy.dataset.day)) })); return; }
    const tc = t.closest('.tc');
    if (!tc) return;
    const tr = list.find((x) => x.no === tc.dataset.no);
    if (t.closest('[data-sched]')) {
      e.preventDefault();
      const r = TS.rng(TS.hash(tr.no));
      const mids = TS.shuffle(r, D.stations.filter((x) => x !== A && x !== B)).slice(0, 3);
      const stops = [A].concat(mids, [B]);
      TS.modal({ title: `${esc(tr.name)} (#${tr.no}) – Schedule`, body: `<ul class="live">${stops.map((x, i) => { const tm = tr.dep + Math.round((tr.dur * i) / (stops.length - 1)); return `<li class="${i === 0 ? 'done' : ''}"><i></i><div><b>${esc(x.name)}</b><small>${x.code} · Day ${1 + Math.floor(tm / 1440)}</small></div><div class="tr">${TS.hm(tm)}<small class="ontime">${i && i < stops.length - 1 ? '5 min halt' : i ? 'Destination' : 'Source'}</small></div></li>`; }).join('')}</ul>` });
      return;
    }
    const cb = t.closest('[data-cls]');
    if (cb && !cb.disabled) { chosen[tr.no] = cb.dataset.cls; tc.outerHTML = card(tr); return; }
    if (t.closest('[data-book]')) {
      const c = tr.classes.find((x) => x.cls === chosen[tr.no]);
      const pax = paxN[tr.no] || 1;
      const base = c.fare * pax;
      TS.checkout.go({
        type: 'train', title: `${tr.name} (#${tr.no})`, subtitle: `${A.city} → ${B.city} · ${d.nice(tr.date)} · Class ${c.cls}`,
        date: tr.date, pax: { ad: pax, ch: 0, inf: 0 }, needAge: true,
        base, taxes: Math.round(base * 0.05), fees: 17 * pax,
        itinerary: `<div class="it-leg"><div class="it-leg-h"><b>${esc(tr.name)} · #${tr.no}</b><span>${esc(tr.type)} · Class ${c.cls} (${D.trainClasses.find((x) => x.key === c.cls).label})</span></div><div class="it-row"><div><span class="t">${TS.hm(tr.dep)}</span><small>${esc(A.name)} (${A.code})</small><small>${d.nice(tr.date)}</small></div><div class="mid">${icon('train', 18)}<br>${TS.dur(tr.dur)}</div><div style="text-align:right"><span class="t">${TS.hm(tr.arr)}</span><small>${esc(B.name)} (${B.code})</small><small>${d.nice(d.add(d.parse(tr.date), Math.floor(tr.arr / 1440)))}</small></div></div><div class="it-meta"><span class="${c.avl.c}">${icon('info', 14)} ${c.avl.t}</span>${tr.freeCancel ? `<span>${icon('refund', 14)} Free cancellation</span>` : ''}<span>${icon('user', 14)} ${pax} traveller${pax > 1 ? 's' : ''}</span></div></div>`,
        backUrl: location.href,
      });
    }
  });
  draw();
})();
