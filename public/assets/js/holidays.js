/* TripSaathi – holiday packages */
(function () {
  const D = window.TS_DATA;
  const { $, $$, h, esc, icon, d } = TS;
  const p = TS.params();
  const st = { from: p.from || 'New Delhi', to: p.to || '', date: d.validFuture(p.date, 14), rooms: +p.rooms || 1, ad: TS.clamp(+p.ad || 2, 1, 12) };
  TS.mountChrome({ page: 'results', product: 'holidays' });
  TS.Search.mount($('#srch'), 'holidays', st, { compact: true });

  const nightsOf = (pk) => pk.cities.reduce((a, c) => a + c[1], 0);
  const F = { theme: p.theme || 'All', dur: new Set(), budget: new Set(p.budget ? [p.budget] : []), stars: new Set(), region: new Set(), dest: st.to };
  let sort = 'pop';
  const durBucket = (n) => (n <= 4 ? 'a' : n <= 6 ? 'b' : 'c');
  const budBucket = (pr) => (pr < 20000 ? '0' : pr < 50000 ? '1' : '2');
  const pass = (pk) =>
    (F.theme === 'All' || pk.themes.includes(F.theme)) && (!F.dest || pk.dest === F.dest || pk.cities.some((c) => c[0] === F.dest)) &&
    (!F.dur.size || F.dur.has(durBucket(nightsOf(pk)))) && (!F.budget.size || F.budget.has(budBucket(pk.price))) &&
    (!F.stars.size || F.stars.has(pk.stars)) && (!F.region.size || F.region.has(pk.intl ? 'intl' : 'dom'));
  const sorters = { pop: (a, b) => b.rating - a.rating, plh: (a, b) => a.price - b.price, phl: (a, b) => b.price - a.price, dur: (a, b) => nightsOf(a) - nightsOf(b) };

  $('#page').innerHTML = `<div class="crumbs"><a href="index.html">Home</a> › Holiday Packages${F.dest ? ' › ' + esc(F.dest) : ''}</div><div class="layout"><aside class="filters" id="filters"></aside><section id="results"></section></div>`;

  const cnt = (fn) => D.packages.filter(fn).length;
  const chk = (g, v, label, n) => `<label class="fchk"><input type="checkbox" data-g="${g}" value="${v}" ${F[g].has(g === 'stars' ? +v : v) ? 'checked' : ''}><span>${label}</span><em>(${n})</em></label>`;
  const drawFilters = () => {
    $('#filters').innerHTML = `<div class="filters-h"><b>Filters</b><div class="row"><button type="button" data-clear>CLEAR ALL</button><button type="button" class="filters-close" data-close aria-label="Close">${icon('x', 18)}</button></div></div>
      <div class="fgrp"><h5>Destination</h5><label class="fchk"><span>${F.dest ? esc(F.dest) : 'All destinations'}</span>${F.dest ? '<button type="button" class="link-btn" data-nodest>Clear</button>' : ''}</label></div>
      <div class="fgrp"><h5>Region</h5>${chk('region', 'dom', 'India', cnt((x) => !x.intl))}${chk('region', 'intl', 'International', cnt((x) => x.intl))}</div>
      <div class="fgrp"><h5>Duration</h5>${chk('dur', 'a', 'Up to 4 nights', cnt((x) => durBucket(nightsOf(x)) === 'a'))}${chk('dur', 'b', '5 – 6 nights', cnt((x) => durBucket(nightsOf(x)) === 'b'))}${chk('dur', 'c', '7+ nights', cnt((x) => durBucket(nightsOf(x)) === 'c'))}</div>
      <div class="fgrp"><h5>Budget (per person)</h5>${chk('budget', '0', 'Under ₹20,000', cnt((x) => budBucket(x.price) === '0'))}${chk('budget', '1', '₹20,000 – ₹50,000', cnt((x) => budBucket(x.price) === '1'))}${chk('budget', '2', '₹50,000+', cnt((x) => budBucket(x.price) === '2'))}</div>
      <div class="fgrp"><h5>Hotel Category</h5>${[5, 4, 3].map((s) => chk('stars', s, s + ' Star', cnt((x) => x.stars === s))).join('')}</div>`;
  };
  drawFilters();
  const fe = $('#filters');
  fe.addEventListener('change', (e) => { const t = e.target; if (!t.dataset.g) return; const v = t.dataset.g === 'stars' ? +t.value : t.value; t.checked ? F[t.dataset.g].add(v) : F[t.dataset.g].delete(v); draw(); });
  fe.addEventListener('click', (e) => {
    if (e.target.closest('[data-clear]')) { ['dur', 'budget', 'stars', 'region'].forEach((k) => F[k].clear()); F.dest = ''; F.theme = 'All'; drawFilters(); draw(); }
    if (e.target.closest('[data-nodest]')) { F.dest = ''; drawFilters(); draw(); }
    if (e.target.closest('[data-close]')) closeF();
  });
  const closeF = () => { fe.classList.remove('open'); const s = $('.scrim'); if (s) s.remove(); };
  const openF = () => { fe.classList.add('open'); const s = h('<div class="scrim"></div>'); s.addEventListener('click', closeF); document.body.appendChild(s); };

  const incl = (pk) => [['plane', 'Flights'], ['hotel', 'Hotels'], ['car', 'Transfers'], ['map', 'Sightseeing'], ['meal', pk.stars >= 5 ? 'All meals' : 'Breakfast']];
  const card = (pk, i) => {
    const n = nightsOf(pk);
    return `<article class="pc"><div class="pc-im">${TS.scene(pk.kind, i + 101)}<span class="dur">${n}N/${n + 1}D</span><span class="rt">${icon('star', 12)} ${pk.rating}</span></div>
      <div class="pc-b"><h3>${esc(pk.name)}</h3><div class="pc-cities">${pk.cities.map((c) => `${c[1]}N ${esc(c[0])}`).join(' → ')}</div>
        <div class="pc-inc">${incl(pk).map(([ic, l]) => `<span>${icon(ic, 18)}${l}</span>`).join('')}</div>
        <ul class="pc-hl">${pk.highlights.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="pc-f"><div><span class="strike small">${TS.inr(pk.mrp)}</span><b>${TS.inr(pk.price)}</b><small>per person on twin sharing</small></div><button type="button" class="btn-cta" data-pkg="${pk.id}">VIEW DETAILS</button></div></div></article>`;
  };
  const res = $('#results');
  const draw = () => {
    const v = D.packages.filter(pass).sort(sorters[sort]);
    res.innerHTML = `<div class="res-h"><div><h1>${F.dest ? esc(F.dest) + ' ' : ''}Holiday Packages</h1><p>${v.length} packages · Departing from ${esc(st.from)} on ${d.nice(st.date)} · ${st.ad} adult${st.ad > 1 ? 's' : ''}</p></div><div class="row"><button type="button" class="btn-ghost mob-filter" data-filters>${icon('filter', 16)} Filters</button><label class="sort-sel">Sort by <select data-sort>${[['pop', 'Popularity'], ['plh', 'Price – Low to High'], ['phl', 'Price – High to Low'], ['dur', 'Duration']].map(([k, l]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div></div>
      <div class="ptabs">${['All'].concat(D.holidayThemes).map((t) => `<button type="button" data-theme="${t}" class="${F.theme === t ? 'on' : ''}">${t}</button>`).join('')}</div>
      ${v.length ? `<div class="pgrid">${v.map((pk) => card(pk, D.packages.indexOf(pk))).join('')}</div>` : `<div class="empty">${icon('holiday', 40)}<h3>No packages match your filters</h3><p class="muted">Try another theme or clear the filters.</p></div>`}`;
  };
  res.addEventListener('change', (e) => { if (e.target.matches('[data-sort]')) { sort = e.target.value; draw(); } });
  res.addEventListener('click', (e) => {
    const t = e.target.closest('[data-theme]');
    if (t) { F.theme = t.dataset.theme; draw(); return; }
    if (e.target.closest('[data-filters]')) { openF(); return; }
    const b = e.target.closest('[data-pkg]');
    if (b) openPkg(D.packages.find((x) => x.id === b.dataset.pkg));
  });

  const itinerary = (pk) => {
    const days = [];
    const n = nightsOf(pk);
    let day = 1;
    pk.cities.forEach(([c, nn], ci) => {
      for (let k = 0; k < nn; k++) {
        let t, txt;
        if (day === 1) { t = `Arrive in ${c}`; txt = `Fly from ${st.from} to ${c}. Our representative will meet you and transfer you to the hotel. Evening at leisure.`; }
        else if (k === 0) { t = `Transfer to ${c}`; txt = `After breakfast, check out and drive to ${c}. Check in and spend the evening exploring the local markets.`; }
        else { const hl = pk.highlights[(day - 2) % pk.highlights.length]; t = `${c} sightseeing`; txt = `Full-day guided excursion including ${hl.toLowerCase()}. Return to the hotel for an overnight stay.`; }
        days.push({ t, txt, c });
        day++;
      }
    });
    days.push({ t: 'Departure', txt: `After breakfast, check out and transfer to the airport for your flight back to ${st.from} with happy memories.`, c: pk.cities[pk.cities.length - 1][0] });
    return days.slice(0, n + 1);
  };
  const openPkg = (pk) => {
    const n = nightsOf(pk);
    const total = pk.price * st.ad;
    const m = TS.modal({ cls: 'modal-pkg', title: esc(pk.name), body: `<div class="pc-im" style="height:200px;border-radius:12px;overflow:hidden;margin-bottom:14px">${TS.scene(pk.kind, D.packages.indexOf(pk) + 101)}<span class="dur">${n}N/${n + 1}D</span></div>
      <div class="pc-cities" style="margin-bottom:10px">${pk.cities.map((c) => `${c[1]}N ${esc(c[0])}`).join(' → ')}</div>
      <div class="pc-inc" style="margin-bottom:16px">${incl(pk).map(([ic, l]) => `<span>${icon(ic, 18)}${l}</span>`).join('')}</div>
      <h4 style="margin-bottom:10px">Day-wise itinerary</h4><ol class="itin">${itinerary(pk).map((x, i) => `<li><i>${i + 1}</i><b>Day ${i + 1}: ${esc(x.t)}</b><p>${esc(x.txt)}</p></li>`).join('')}</ol>
      <div class="row-between" style="border-top:1px solid var(--line);padding-top:14px;margin-top:6px"><div><small class="muted">${st.ad} adult${st.ad > 1 ? 's' : ''} · ${st.rooms} room${st.rooms > 1 ? 's' : ''} · from ${esc(st.from)}</small><div class="price-lg">${TS.inr(total)}</div></div><button type="button" class="btn-cta" data-bookpkg>BOOK NOW</button></div>` });
    $('[data-bookpkg]', m.el).addEventListener('click', () => {
      m.close();
      const base = Math.round(total / 1.05);
      TS.checkout.go({
        type: 'holiday', title: pk.name, subtitle: `${n}N/${n + 1}D · ${pk.cities.map((c) => c[0]).join(', ')} · from ${st.from}`,
        date: st.date, endDate: d.iso(d.add(d.parse(st.date), n)), pax: { ad: st.ad, ch: 0, inf: 0 },
        base, taxes: total - base, fees: 0, primaryOnly: false,
        itinerary: `<div class="it-hotel"><div class="im">${TS.scene(pk.kind, D.packages.indexOf(pk) + 101)}</div><div><h4>${esc(pk.name)}</h4><div class="pc-cities">${pk.cities.map((c) => `${c[1]}N ${esc(c[0])}`).join(' → ')}</div><div class="it-dates"><div><small>Departure</small><b>${d.nice(st.date)}</b></div><div><small>Return</small><b>${d.nice(d.add(d.parse(st.date), n))}</b></div><div><small>Travellers</small><b>${st.ad} Adults</b></div></div><div class="it-meta">${incl(pk).map(([ic, l]) => `<span>${icon(ic, 14)} ${l}</span>`).join('')}</div></div></div>`,
        backUrl: location.href,
      });
    });
  };

  draw();
  if (p.pkg) { const pk = D.packages.find((x) => x.id === p.pkg); if (pk) openPkg(pk); }
})();
