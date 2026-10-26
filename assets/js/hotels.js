/* TripSaathi – hotel & homestay listing */
(function () {
  const D = window.TS_DATA;
  const { $, $$, h, esc, icon, d } = TS;
  const p = TS.params();
  const q = TS.Search.hotelsFromParams(p);
  const product = q.type === 'homestay' ? 'homestays' : 'hotels';
  TS.mountChrome({ page: 'results', product });
  TS.Search.mount($('#srch'), product, q, { compact: true });
  TS.store.set('last_' + product, p);

  const list = TS.gen.hotels(q.city, q.type);
  const nights = Math.max(1, d.diff(q.out, q.in));
  const guests = q.ad + q.ch;
  const bands = TS.Search.priceBands.slice(1);
  const inBand = (price, key) => { const [a, b] = key.split('-').map((x) => (x === '' ? Infinity : +x)); return price >= a && price < (b || Infinity); };
  const F = { price: new Set(q.price ? [q.price] : []), stars: new Set(), rating: 0, types: new Set(), am: new Set(), loc: new Set(), tags: new Set(), name: '' };
  let sort = 'pop';
  let favs = new Set(TS.store.get('favs', []));
  const word = q.type === 'homestay' ? 'homestays & villas' : 'properties';

  const pass = (x) =>
    (!F.price.size || [...F.price].some((k) => inBand(x.price, k))) && (!F.stars.size || F.stars.has(x.stars)) && x.rating >= F.rating &&
    (!F.types.size || F.types.has(x.type)) && [...F.am].every((a) => x.amenities.includes(a)) && (!F.loc.size || F.loc.has(x.locality)) &&
    [...F.tags].every((t) => x.tags.includes(t)) && (!F.name || x.name.toLowerCase().includes(F.name));
  const sorters = { pop: (a, b) => b.rating * 0.6 + b.rank - (a.rating * 0.6 + a.rank), rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews, plh: (a, b) => a.price - b.price, phl: (a, b) => b.price - a.price };

  $('#page').innerHTML = `<div class="crumbs"><a href="index.html">Home</a> › ${q.type === 'homestay' ? 'Homestays' : 'Hotels'} › ${esc(q.city)}</div><div class="layout"><aside class="filters" id="filters" aria-label="Filters"></aside><section id="results"></section></div>`;
  document.title = `${q.type === 'homestay' ? 'Homestays & Villas' : 'Hotels'} in ${q.city} | TripSaathi`;

  /* ------------------------------------------------------------ filters */
  const cnt = (fn) => list.filter(fn).length;
  const drawFilters = () => {
    const types = Array.from(new Set(list.map((x) => x.type)));
    const locs = Array.from(new Set(list.map((x) => x.locality)));
    const chk = (g, v, label, n) => `<label class="fchk"><input type="checkbox" data-g="${g}" value="${esc(v)}" ${F[g].has(g === 'stars' ? +v : v) ? 'checked' : ''}><span>${label}</span><em>(${n})</em></label>`;
    $('#filters').innerHTML = `
      <div class="filters-h"><b>Select Filters</b><div class="row"><button type="button" data-clear>CLEAR ALL</button><button type="button" class="filters-close" data-close aria-label="Close">${icon('x', 18)}</button></div></div>
      <div class="fgrp"><div class="lp-search" style="border:1px solid var(--line-2);border-radius:8px;padding:8px 10px">${icon('search', 16)}<input type="text" data-name placeholder="Search by property name" value="${esc(F.name)}"></div></div>
      <div class="fgrp"><h5>Suggested For You</h5>${['Free Cancellation', 'Breakfast Included', 'Couple Friendly', 'Pay at Hotel'].map((t) => chk('tags', t, t, cnt((x) => x.tags.includes(t)))).join('')}</div>
      <div class="fgrp"><h5>Price per night</h5>${bands.map(([k, l]) => chk('price', k, l, cnt((x) => inBand(x.price, k)))).join('')}</div>
      ${q.type === 'homestay' ? '' : `<div class="fgrp"><h5>Star Category</h5><div class="fstars">${[5, 4, 3, 2].map((s) => `<button type="button" data-star="${s}" class="${F.stars.has(s) ? 'on' : ''}">${s} ${icon('star', 13)} <em class="muted">(${cnt((x) => x.stars === s)})</em></button>`).join('')}</div></div>`}
      <div class="fgrp"><h5>User Rating</h5>${[[4.5, 'Excellent: 4.5 & above'], [4, 'Very Good: 4 & above'], [3.5, 'Good: 3.5 & above']].map(([r, l]) => `<label class="fchk"><input type="radio" name="rt" data-rating="${r}" ${F.rating === r ? 'checked' : ''}><span>${l}</span><em>(${cnt((x) => x.rating >= r)})</em></label>`).join('')}</div>
      <div class="fgrp"><h5>Property Type</h5>${types.map((t) => chk('types', t, t, cnt((x) => x.type === t))).join('')}</div>
      <div class="fgrp"><h5>Amenities</h5>${D.amenities.map((a) => chk('am', a.key, a.label, cnt((x) => x.amenities.includes(a.key)))).join('')}</div>
      <div class="fgrp"><h5>Locality</h5>${locs.map((l) => chk('loc', l, esc(l), cnt((x) => x.locality === l))).join('')}</div>`;
  };
  drawFilters();
  const fe = $('#filters');
  fe.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.rating) F.rating = +t.dataset.rating;
    else if (t.dataset.g) { const v = t.dataset.g === 'stars' ? +t.value : t.value; t.checked ? F[t.dataset.g].add(v) : F[t.dataset.g].delete(v); }
    draw();
  });
  fe.addEventListener('input', (e) => { if (e.target.hasAttribute('data-name')) { F.name = e.target.value.trim().toLowerCase(); draw(); } });
  fe.addEventListener('click', (e) => {
    const s = e.target.closest('[data-star]');
    if (s) { const v = +s.dataset.star; F.stars.has(v) ? F.stars.delete(v) : F.stars.add(v); s.classList.toggle('on'); draw(); return; }
    if (e.target.closest('[data-clear]')) { Object.keys(F).forEach((k) => (F[k] instanceof Set ? F[k].clear() : null)); F.rating = 0; F.name = ''; drawFilters(); draw(); }
    if (e.target.closest('[data-close]')) closeF();
  });
  const closeF = () => { fe.classList.remove('open'); const s = $('.scrim'); if (s) s.remove(); };
  const openF = () => { fe.classList.add('open'); const s = h('<div class="scrim"></div>'); s.addEventListener('click', closeF); document.body.appendChild(s); };

  /* ------------------------------------------------------------ cards */
  const amLabel = (k) => D.amenities.find((a) => a.key === k);
  const link = (x) => 'hotel.html?' + TS.qs({ city: q.city, id: x.id, in: q.in, out: q.out, rooms: q.rooms, ad: q.ad, ch: q.ch, type: q.type === 'homestay' ? 'homestay' : '' });
  const card = (x) => {
    const disc = Math.round((1 - x.price / x.mrp) * 100);
    const loggedIn = !!TS.auth.user();
    const price = loggedIn ? Math.round(x.price * 0.95) : x.price;
    return `<a class="hc" href="${link(x)}" data-id="${x.id}">
      <div class="hc-img"><button type="button" class="hc-fav ${favs.has(x.name) ? 'on' : ''}" data-fav="${esc(x.name)}" aria-label="Save to shortlist">${icon('heart', 18)}</button>
        <div class="big">${TS.scene(x.images[0], x.seed)}</div>
        <div class="ths">${x.images.slice(1).map((k, i) => `<div class="th ${i === 3 ? 'more' : ''}" data-more="+${8 + (x.seed % 20)}">${TS.scene(k, x.seed + i)}</div>`).join('')}</div></div>
      <div class="hc-body">
        <h3>${esc(x.name)}${x.stars ? TS.stars(x.stars) : ''}</h3>
        <div class="hc-loc">${esc(x.locality)} <span>| ${esc(x.dist)}</span></div>
        <span class="hc-type">${esc(x.type)}</span>
        <div class="hc-am">${x.amenities.slice(0, 5).map((k) => { const a = amLabel(k); return `<span>${icon(a.icon, 14)} ${a.label}</span>`; }).join('')}</div>
        <div class="hc-tags">${x.tags.slice(0, 3).map((t) => `<span>${icon('check', 14)} ${t}</span>`).join('')}</div>
        <span class="hc-blurb">${esc(x.blurb)}</span>
      </div>
      <div class="hc-side">
        <div class="rating"><span><b>${TS.ratingText(x.rating)}</b><small>(${TS.num(x.reviews)} Ratings)</small></span><span class="rbadge">${x.rating.toFixed(1)}</span></div>
        <div class="hc-price"><span class="disc">${disc}% off</span> <span class="strike">${TS.inr(x.mrp)}</span><b>${TS.inr(price * q.rooms)}</b><small>+ ${TS.inr(x.tax * q.rooms)} taxes &amp; fees</small><small>${q.rooms > 1 ? `for ${q.rooms} rooms ` : ''}per night</small>${loggedIn ? '<span class="chip ok" style="margin-top:6px">Member price applied</span>' : '<div class="hc-login" data-login>Login to save 5% more</div>'}</div>
      </div>
    </a>`;
  };

  const res = $('#results');
  const draw = () => {
    const v = list.filter(pass).sort(sorters[sort]);
    const locs = Array.from(new Set(list.map((x) => x.locality))).slice(0, 6);
    res.innerHTML = `<div class="res-h"><div><h1>${v.length} ${word} in ${esc(q.city)}</h1><p>${d.nice(q.in)} – ${d.nice(q.out)} · ${nights} night${nights > 1 ? 's' : ''} · ${q.rooms} room${q.rooms > 1 ? 's' : ''}, ${guests} guest${guests > 1 ? 's' : ''}</p></div><div class="row"><button type="button" class="btn-ghost mob-filter" data-filters>${icon('filter', 16)} Filters</button><label class="sort-sel">Sort by <select data-sort>${[['pop', 'Popular'], ['rating', 'User Rating (Highest first)'], ['plh', 'Price (Lowest first)'], ['phl', 'Price (Highest first)']].map(([k, l]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div></div>
      <div class="trending" style="margin-bottom:14px"><span>Popular areas:</span>${locs.map((l) => `<button type="button" data-loc="${esc(l)}" style="${F.loc.has(l) ? 'background:var(--blue-l);color:var(--blue-2)' : 'background:#fff'}">${esc(l)}</button>`).join('')}</div>
      ${TS.auth.user() ? '' : `<div class="banner-strip">${icon('lock', 18)} Login to unlock member prices – save up to 5% extra on ${word} in ${esc(q.city)}.<button type="button" class="btn-out" data-login>LOGIN</button></div>`}
      ${v.length ? v.map(card).join('') : `<div class="empty">${icon('hotel', 40)}<h3>No ${word} match your filters</h3><p class="muted">Try removing some filters.</p></div>`}`;
  };
  res.addEventListener('change', (e) => { if (e.target.matches('[data-sort]')) { sort = e.target.value; draw(); } });
  res.addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]');
    if (fav) { e.preventDefault(); const n = fav.dataset.fav; favs.has(n) ? favs.delete(n) : favs.add(n); TS.store.set('favs', [...favs]); fav.classList.toggle('on'); TS.toast(favs.has(n) ? 'Added to your shortlist' : 'Removed from shortlist'); return; }
    if (e.target.closest('[data-login]')) { e.preventDefault(); TS.openLogin(draw); return; }
    if (e.target.closest('[data-filters]')) { openF(); return; }
    const lc = e.target.closest('[data-loc]');
    if (lc) { const l = lc.dataset.loc; F.loc.has(l) ? F.loc.delete(l) : F.loc.add(l); drawFilters(); draw(); }
  });
  draw();
})();
