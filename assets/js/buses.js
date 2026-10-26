/* TripSaathi – bus search results with seat selection */
(function () {
  const { $, $$, h, esc, icon, d } = TS;
  const p = TS.params();
  const q = { from: TS.roadCity(p.from) ? p.from : 'New Delhi', to: TS.roadCity(p.to) ? p.to : 'Manali', date: d.validFuture(p.date, 1) };
  TS.mountChrome({ page: 'results', product: 'buses' });
  TS.Search.mount($('#srch'), 'buses', q, { compact: true });

  const list = TS.gen.buses(q.from, q.to, q.date);
  const bands = [['b6', 'Before 6 AM', 0, 360], ['m', '6 AM – 12 PM', 360, 720], ['a', '12 PM – 6 PM', 720, 1080], ['n', 'After 6 PM', 1080, 1440]];
  const band = (m) => bands.find((b) => m % 1440 >= b[2] && m % 1440 < b[3])[0];
  const F = { kind: new Set(), dep: new Set(), ops: new Set(), r4: false, live: false, primo: false };
  let sort = 'dep';
  let openId = null;
  const picked = {};
  const bp = {}, dp = {};

  const kindOf = (b) => [b.ac ? 'AC' : 'Non AC', b.sleeper ? 'Sleeper' : 'Seater'];
  const pass = (b) => [...F.kind].every((k) => kindOf(b).includes(k)) && (!F.dep.size || F.dep.has(band(b.dep))) && (!F.ops.size || F.ops.has(b.op)) && (!F.r4 || b.rating >= 4) && (!F.live || b.live) && (!F.primo || b.primo);
  const sorters = { dep: (a, b) => a.dep - b.dep, cheap: (a, b) => a.price - b.price, rating: (a, b) => b.rating - a.rating, fast: (a, b) => a.dur - b.dur };

  $('#page').innerHTML = `<div class="crumbs"><a href="index.html">Home</a> › Buses › ${esc(q.from)} to ${esc(q.to)}</div><div class="layout"><aside class="filters" id="filters"></aside><section id="results"></section></div>`;
  document.title = `${q.from} to ${q.to} Buses | TripSaathi`;

  const ops = Array.from(new Set(list.map((b) => b.op))).sort();
  const chk = (g, v, label, n) => `<label class="fchk"><input type="checkbox" data-g="${g}" value="${esc(v)}" ${F[g] instanceof Set ? (F[g].has(v) ? 'checked' : '') : F[g] ? 'checked' : ''}><span>${label}</span>${n != null ? `<em>(${n})</em>` : ''}</label>`;
  const drawFilters = () => {
    $('#filters').innerHTML = `<div class="filters-h"><b>Filters</b><div class="row"><button type="button" data-clear>CLEAR ALL</button><button type="button" class="filters-close" data-close aria-label="Close">${icon('x', 18)}</button></div></div>
      <div class="fgrp"><h5>Popular Filters</h5>${chk('r4', 1, 'Highly rated (4+)', list.filter((b) => b.rating >= 4).length)}${chk('live', 1, 'Live tracking', list.filter((b) => b.live).length)}${chk('primo', 1, 'TS Primo buses', list.filter((b) => b.primo).length)}</div>
      <div class="fgrp"><h5>Bus Type</h5>${['AC', 'Non AC', 'Sleeper', 'Seater'].map((k) => chk('kind', k, k, list.filter((b) => kindOf(b).includes(k)).length)).join('')}</div>
      <div class="fgrp"><h5>Departure Time</h5><div class="ftimes">${bands.map((b) => `<button type="button" class="ftime ${F.dep.has(b[0]) ? 'on' : ''}" data-v="${b[0]}"><b>${b[1]}</b>${list.filter((x) => band(x.dep) === b[0]).length} buses</button>`).join('')}</div></div>
      <div class="fgrp"><h5>Operators</h5>${ops.map((o) => chk('ops', o, esc(o), list.filter((b) => b.op === o).length)).join('')}</div>`;
  };
  drawFilters();
  const fe = $('#filters');
  fe.addEventListener('change', (e) => { const t = e.target; const g = t.dataset.g; if (!g) return; if (F[g] instanceof Set) (t.checked ? F[g].add(t.value) : F[g].delete(t.value)); else F[g] = t.checked; draw(); });
  fe.addEventListener('click', (e) => {
    const tl = e.target.closest('.ftime');
    if (tl) { F.dep.has(tl.dataset.v) ? F.dep.delete(tl.dataset.v) : F.dep.add(tl.dataset.v); tl.classList.toggle('on'); draw(); return; }
    if (e.target.closest('[data-clear]')) { ['kind', 'dep', 'ops'].forEach((k) => F[k].clear()); F.r4 = F.live = F.primo = false; drawFilters(); draw(); }
    if (e.target.closest('[data-close]')) closeF();
  });
  const closeF = () => { fe.classList.remove('open'); const s = $('.scrim'); if (s) s.remove(); };
  const openF = () => { fe.classList.add('open'); const s = h('<div class="scrim"></div>'); s.addEventListener('click', closeF); document.body.appendChild(s); };

  const seatsHTML = (b) => {
    const decks = TS.gen.seats(b);
    const mine = picked[b.id] || [];
    const all = decks.flatMap((dk) => dk.rows.flat().filter(Boolean));
    const total = mine.reduce((a, id) => a + all.find((s) => s.id === id).price, 0);
    return `<div class="seatwrap">
      <div><div class="legend"><span><i></i>Available</span><span><i class="b"></i>Booked</span><span><i class="l"></i>Ladies</span><span><i class="s"></i>Selected</span></div>
        <div class="decks">${decks.map((dk) => `<div class="deck"><h5>${dk.name}${dk.name !== 'Upper' ? ` <span title="Driver">${icon('car', 16)}</span>` : ''}</h5><div class="deck-rows">${dk.rows.map((rw) => `<div class="deck-row" style="grid-template-columns:${rw.map((s) => (s ? '32px' : '16px')).join(' ')}">${rw.map((s) => (s ? `<button type="button" class="seat ${s.sleeper ? 'sl' : ''} ${s.booked ? 'booked' : ''} ${s.ladies ? 'ladies' : ''} ${mine.includes(s.id) ? 'sel' : ''}" data-seat="${s.id}" ${s.booked ? 'disabled' : ''} title="${s.id} · ${TS.inr(s.price)}">${s.id}</button>` : '<span class="seat-gap"></span>')).join('')}</div>`).join('')}</div></div>`).join('')}</div></div>
      <div class="seat-side">
        <label>Boarding point<select data-bp>${b.boarding.map((x, i) => `<option value="${i}" ${(bp[b.id] || 0) == i ? 'selected' : ''}>${TS.hm(x.time)} · ${esc(x.name)}</option>`).join('')}</select></label>
        <label>Dropping point<select data-dp>${b.dropping.map((x, i) => `<option value="${i}" ${(dp[b.id] || 0) == i ? 'selected' : ''}>${TS.hm(x.time)} · ${esc(x.name)}</option>`).join('')}</select></label>
        <div class="seat-sum"><div class="row-between"><span>Seat(s)</span><b>${mine.length ? mine.join(', ') : '–'}</b></div><div class="row-between"><span>Fare</span><b>${TS.inr(total)}</b></div><p class="tiny">Max 6 seats per booking. GST extra.</p></div>
        <button type="button" class="btn-cta btn-block" data-continue ${mine.length ? '' : 'disabled'}>CONTINUE</button>
      </div></div>`;
  };
  const card = (b) => {
    const opn = openId === b.id;
    return `<article class="bc" data-id="${b.id}">
      <div class="bc-main">
        <div class="bc-op"><b>${esc(b.op)}</b><small>${esc(b.type)}</small>${b.primo ? ' <span class="chip blue">PRIMO</span>' : ''}</div>
        <div class="bc-t"><b>${TS.hm(b.dep)}</b><small>${d.short(b.date)} · ${esc(b.from)}</small></div>
        <div class="bc-t bc-d"><small>${TS.dur(b.dur)}</small><small>${TS.num(b.km)} km</small></div>
        <div class="bc-t"><b>${TS.hm(b.arr)}</b><small>${d.short(d.add(d.parse(b.date), Math.floor(b.arr / 1440)))} · ${esc(b.to)}</small></div>
        <div class="bc-r"><span class="rate-g ${b.rating < 4 ? 'mid' : ''}">${icon('star', 11)} ${b.rating}</span><small class="muted">${TS.num(b.ratings)} ratings</small></div>
        <div class="bc-p"><small>Starts from</small><b>${TS.inr(b.price)}</b><small class="${b.seatsLeft < 8 ? 'no' : ''}">${b.seatsLeft} seats left</small><button type="button" class="btn-cta" style="margin-top:8px" data-seats>${opn ? 'HIDE SEATS' : 'SELECT SEATS'}</button></div>
      </div>
      <div class="bc-sub">${b.live ? `<span>${icon('pin', 13)} Live tracking</span>` : ''}${b.amen.map((a) => `<span>${icon('check', 13)} ${a}</span>`).join('')}</div>
      ${opn ? seatsHTML(b) : ''}
    </article>`;
  };
  const res = $('#results');
  const draw = () => {
    const v = list.filter(pass).sort(sorters[sort]);
    res.innerHTML = `<div class="res-h"><div><h1>${esc(q.from)} to ${esc(q.to)} Bus</h1><p>${v.length} buses · ${d.nice(q.date)}</p></div><div class="row"><button type="button" class="btn-ghost mob-filter" data-filters>${icon('filter', 16)} Filters</button></div></div>
      <div class="sortbar">${[['dep', 'Departure', 'Earliest first'], ['cheap', 'Price', 'Lowest first'], ['rating', 'Rating', 'Highest first'], ['fast', 'Duration', 'Fastest first']].map(([k, l, s]) => `<button type="button" data-sort="${k}" class="${sort === k ? 'on' : ''}"><b>${l}</b><small>${s}</small></button>`).join('')}</div>
      ${v.length ? v.map(card).join('') : `<div class="empty">${icon('bus', 40)}<h3>No buses found</h3><p class="muted">Try clearing filters or another date.</p></div>`}`;
  };
  const redraw = (b) => { $(`.bc[data-id="${b.id}"]`, res).outerHTML = card(b); };
  res.addEventListener('change', (e) => {
    const c = e.target.closest('.bc');
    if (!c) return;
    if (e.target.matches('[data-bp]')) bp[c.dataset.id] = +e.target.value;
    if (e.target.matches('[data-dp]')) dp[c.dataset.id] = +e.target.value;
  });
  res.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-filters]')) { openF(); return; }
    const s = t.closest('[data-sort]');
    if (s) { sort = s.dataset.sort; draw(); return; }
    const c = t.closest('.bc');
    if (!c) return;
    const b = list.find((x) => x.id === c.dataset.id);
    if (t.closest('[data-seats]')) { const prev = openId; openId = openId === b.id ? null : b.id; if (prev && prev !== b.id) { const pb = list.find((x) => x.id === prev); if ($(`.bc[data-id="${prev}"]`, res)) redraw(pb); } redraw(b); return; }
    const st = t.closest('[data-seat]');
    if (st && !st.disabled) {
      const arr = picked[b.id] || (picked[b.id] = []);
      const i = arr.indexOf(st.dataset.seat);
      if (i >= 0) arr.splice(i, 1);
      else if (arr.length >= 6) { TS.toast('You can select up to 6 seats', 'err'); return; }
      else arr.push(st.dataset.seat);
      redraw(b);
      return;
    }
    if (t.closest('[data-continue]')) {
      const seats = picked[b.id] || [];
      const all = TS.gen.seats(b).flatMap((dk) => dk.rows.flat().filter(Boolean));
      const base = seats.reduce((a, id) => a + all.find((x) => x.id === id).price, 0);
      const B1 = b.boarding[bp[b.id] || 0], D1 = b.dropping[dp[b.id] || 0];
      TS.checkout.go({
        type: 'bus', title: `${b.op}`, subtitle: `${b.from} → ${b.to} · ${d.nice(b.date)} · Seat ${seats.join(', ')}`,
        date: b.date, pax: { ad: seats.length, ch: 0, inf: 0 }, needAge: true, seatLabels: seats,
        base, taxes: Math.round(base * 0.05), fees: 0,
        itinerary: `<div class="it-leg"><div class="it-leg-h"><b>${esc(b.op)}</b><span>${esc(b.type)}</span></div><div class="it-row"><div><span class="t">${TS.hm(B1.time)}</span><small>${esc(B1.name)}</small><small>${d.nice(b.date)}</small></div><div class="mid">${icon('bus', 18)}<br>${TS.dur(b.dur)}</div><div style="text-align:right"><span class="t">${TS.hm(D1.time)}</span><small>${esc(D1.name)}</small><small>${d.nice(d.add(d.parse(b.date), Math.floor(D1.time / 1440)))}</small></div></div><div class="it-meta"><span>${icon('seat', 14)} Seat${seats.length > 1 ? 's' : ''}: ${seats.join(', ')}</span>${b.live ? `<span>${icon('pin', 14)} Live tracking</span>` : ''}<span>${icon('star', 14)} ${b.rating} rated</span></div></div>`,
        backUrl: location.href,
      });
    }
  });
  draw();
})();
