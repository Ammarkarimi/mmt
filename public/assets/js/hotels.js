/* TripSaathi – hotel & homestay listing, backed by live inventory from the TripSaathi API */
(function () {
  const D = window.TS_DATA;
  const { $, h, esc, icon, d } = TS;
  const p = TS.params();
  const q = TS.Search.hotelsFromParams(p);
  const product = q.type === 'homestay' ? 'homestays' : 'hotels';
  TS.mountChrome({ page: 'results', product });
  TS.Search.mount($('#srch'), product, q, { compact: true });
  TS.store.set('last_' + product, p);

  let list = [];
  const nights = Math.max(1, d.diff(q.out, q.in));
  const guests = q.ad + q.ch;
  const bands = TS.Search.priceBands.slice(1);
  const inBand = (price, key) => { const [a, b] = key.split('-').map((x) => (x === '' ? Infinity : +x)); return price >= a && price < (b || Infinity); };
  const F = { price: new Set(q.price ? [q.price] : []), stars: new Set(), rating: 0, types: new Set(), am: new Set(), loc: new Set(), tags: new Set(), name: '' };
  let sort = 'pop';
  const favs = new Set(TS.store.get('favs', []));
  const word = q.type === 'homestay' ? 'homestays & villas' : 'properties';
  const seedOf = (x) => TS.hash(x.id) % 100000;

  const pass = (x) =>
    (!F.price.size || [...F.price].some((k) => inBand(x.perNight, k))) && (!F.stars.size || F.stars.has(x.stars)) && (x.rating || 0) >= F.rating &&
    (!F.types.size || F.types.has(x.type)) && [...F.am].every((a) => x.amenities.includes(a)) && (!F.loc.size || F.loc.has(x.locality)) &&
    [...F.tags].every((t) => x.tags.includes(t)) && (!F.name || x.name.toLowerCase().includes(F.name));
  const sorters = {
    pop: (a, b) => a.rank - b.rank,
    rating: (a, b) => (b.rating || 0) - (a.rating || 0) || b.ratingCount - a.ratingCount,
    plh: (a, b) => a.perNight - b.perNight,
    phl: (a, b) => b.perNight - a.perNight,
  };
  const order = (a, b) => Number(a.soldOut) - Number(b.soldOut) || sorters[sort](a, b);

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
      <div class="fgrp"><h5>Price per night</h5>${bands.map(([k, l]) => chk('price', k, l, cnt((x) => inBand(x.perNight, k)))).join('')}</div>
      ${q.type === 'homestay' ? '' : `<div class="fgrp"><h5>Star Category</h5><div class="fstars">${[5, 4, 3, 2].map((s) => `<button type="button" data-star="${s}" class="${F.stars.has(s) ? 'on' : ''}">${s} ${icon('star', 13)} <em class="muted">(${cnt((x) => x.stars === s)})</em></button>`).join('')}</div></div>`}
      <div class="fgrp"><h5>User Rating</h5>${[[4.5, 'Excellent: 4.5 & above'], [4, 'Very Good: 4 & above'], [3.5, 'Good: 3.5 & above']].map(([r, l]) => `<label class="fchk"><input type="radio" name="rt" data-rating="${r}" ${F.rating === r ? 'checked' : ''}><span>${l}</span><em>(${cnt((x) => (x.rating || 0) >= r)})</em></label>`).join('')}</div>
      <div class="fgrp"><h5>Property Type</h5>${types.map((t) => chk('types', t, esc(t), cnt((x) => x.type === t))).join('')}</div>
      <div class="fgrp"><h5>Amenities</h5>${D.amenities.map((a) => chk('am', a.key, a.label, cnt((x) => x.amenities.includes(a.key)))).join('')}</div>
      <div class="fgrp"><h5>Locality</h5>${locs.map((l) => chk('loc', l, esc(l), cnt((x) => x.locality === l))).join('')}</div>`;
  };
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
  const link = (x) => 'hotel.html?' + TS.qs({ id: x.id, city: q.city, in: q.in, out: q.out, rooms: q.rooms, ad: q.ad, ch: q.ch, type: q.type === 'homestay' ? 'homestay' : '' });
  const art = (x, kind, i) => (x.photos[i] ? `<img src="${esc(x.photos[i])}" alt="" loading="lazy">` : TS.scene(kind, seedOf(x) + i));
  const card = (x) => {
    const extra = ['exterior', x.amenities.includes('pool') ? 'pool' : 'lobby', 'room', 'room'];
    return `<a class="hc ${x.soldOut ? 'sold' : ''}" href="${link(x)}" data-id="${esc(x.id)}">
      <div class="hc-img"><button type="button" class="hc-fav ${favs.has(x.id) ? 'on' : ''}" data-fav="${esc(x.id)}" aria-label="Save to shortlist">${icon('heart', 18)}</button>
        <div class="big">${art(x, x.scene, 0)}</div>
        <div class="ths">${extra.map((k, i) => `<div class="th">${art(x, k, i + 1)}</div>`).join('')}</div></div>
      <div class="hc-body">
        <h3>${esc(x.name)}${x.stars ? TS.stars(x.stars) : ''}</h3>
        <div class="hc-loc">${esc(x.locality)}${x.landmark ? ` <span>| ${esc(x.landmark)}</span>` : ''}</div>
        <span class="hc-type">${esc(x.type)}</span>
        <div class="hc-am">${x.amenities.slice(0, 5).map((k) => { const a = amLabel(k); return a ? `<span>${icon(a.icon, 14)} ${a.label}</span>` : ''; }).join('')}</div>
        <div class="hc-tags">${x.tags.slice(0, 3).map((t) => `<span>${icon('check', 14)} ${t}</span>`).join('')}</div>
        <span class="hc-blurb">${esc(x.summary)}</span>
      </div>
      <div class="hc-side">
        ${x.rating ? `<div class="rating"><span><b>${TS.ratingText(x.rating)}</b><small>(${TS.num(x.ratingCount)} Ratings)</small></span><span class="rbadge">${x.rating.toFixed(1)}</span></div>` : '<span class="chip blue">New on TripSaathi</span>'}
        <div class="hc-price">${x.soldOut
          ? `<b class="sold-txt">Sold out</b><small>for your dates</small><small>Try different dates</small>`
          : `<small class="muted">${esc(x.room)} · ${esc(x.plan)}</small><b>${TS.inr(x.perNight * q.rooms)}</b><small>+ ${TS.inr(x.perNightTax * q.rooms)} taxes &amp; fees</small><small>${q.rooms > 1 ? `for ${q.rooms} rooms ` : ''}per night</small>${x.roomsLeft ? `<span class="chip red" style="margin-top:6px">Only ${x.roomsLeft} room${x.roomsLeft > 1 ? 's' : ''} left</span>` : ''}`}</div>
      </div>
    </a>`;
  };

  const res = $('#results');
  const head = (n) => `<div class="res-h"><div><h1>${n} ${word} in ${esc(q.city)}</h1><p>${d.nice(q.in)} – ${d.nice(q.out)} · ${nights} night${nights > 1 ? 's' : ''} · ${q.rooms} room${q.rooms > 1 ? 's' : ''}, ${guests} guest${guests > 1 ? 's' : ''}</p></div><div class="row"><button type="button" class="btn-ghost mob-filter" data-filters>${icon('filter', 16)} Filters</button><label class="sort-sel">Sort by <select data-sort>${[['pop', 'Popular'], ['rating', 'User Rating (Highest first)'], ['plh', 'Price (Lowest first)'], ['phl', 'Price (Highest first)']].map(([k, l]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div></div>`;
  const draw = () => {
    if (!list.length) {
      res.innerHTML = `${head(0)}<div class="empty">${icon('hotel', 40)}<h3>No ${word} available in ${esc(q.city)} for these dates</h3><p class="muted">Try other dates or a nearby city. Own a property in ${esc(q.city)}? List it on TripSaathi and reach travellers like these.</p><a class="btn-out" href="partner.html">LIST YOUR PROPERTY</a></div>`;
      return;
    }
    const v = list.filter(pass).sort(order);
    const locs = Array.from(new Set(list.map((x) => x.locality))).slice(0, 6);
    res.innerHTML = `${head(v.length)}
      <div class="trending" style="margin-bottom:14px"><span>Popular areas:</span>${locs.map((l) => `<button type="button" data-loc="${esc(l)}" style="${F.loc.has(l) ? 'background:var(--blue-l);color:var(--blue-2)' : 'background:#fff'}">${esc(l)}</button>`).join('')}</div>
      <div class="banner-strip">${icon('shield', 18)} Live prices and availability, straight from each property. All taxes shown upfront.</div>
      ${v.length ? v.map(card).join('') : `<div class="empty">${icon('hotel', 40)}<h3>No ${word} match your filters</h3><p class="muted">Try removing some filters.</p></div>`}`;
  };
  res.addEventListener('change', (e) => { if (e.target.matches('[data-sort]')) { sort = e.target.value; draw(); } });
  res.addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]');
    if (fav) { e.preventDefault(); const n = fav.dataset.fav; favs.has(n) ? favs.delete(n) : favs.add(n); TS.store.set('favs', [...favs]); fav.classList.toggle('on'); TS.toast(favs.has(n) ? 'Added to your shortlist' : 'Removed from shortlist'); return; }
    if (e.target.closest('[data-filters]')) { openF(); return; }
    if (e.target.closest('[data-retry]')) { load(); return; }
    const lc = e.target.closest('[data-loc]');
    if (lc) { const l = lc.dataset.loc; F.loc.has(l) ? F.loc.delete(l) : F.loc.add(l); drawFilters(); draw(); }
  });

  /* ------------------------------------------------------------ data */
  const load = async () => {
    res.innerHTML = `${head('…')}${'<div class="hc skel"><div class="hc-img"></div><div class="hc-body"><i></i><i></i><i></i></div><div class="hc-side"></div></div>'.repeat(3)}`;
    try {
      const r = await TS.api('/hotels/search?' + TS.qs({ city: q.city, category: q.type, checkin: q.in, checkout: q.out, rooms: q.rooms, adults: q.ad, children: q.ch }));
      list = r.results.map((x, i) => Object.assign(x, { rank: i }));
      drawFilters();
      draw();
    } catch (err) {
      res.innerHTML = `${head(0)}<div class="empty">${icon('info', 40)}<h3>We couldn't load ${word} right now</h3><p class="muted">${esc(err.message)}</p><button type="button" class="btn-out" data-retry>TRY AGAIN</button></div>`;
    }
  };
  drawFilters();
  load();
})();
