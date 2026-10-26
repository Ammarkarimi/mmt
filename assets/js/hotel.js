/* TripSaathi – hotel details */
(function () {
  const D = window.TS_DATA;
  const { $, $$, h, esc, icon, d } = TS;
  const p = TS.params();
  const q = TS.Search.hotelsFromParams(p);
  const product = q.type === 'homestay' ? 'homestays' : 'hotels';
  TS.mountChrome({ page: 'results', product });
  const band = h('<div class="srch-band"><div class="container"><div class="sw sw--compact" id="srch"></div></div></div>');
  $('#page').before(band);
  TS.Search.mount($('#srch'), product, q, { compact: true });

  const list = TS.gen.hotels(q.city, q.type);
  const x = list.find((o) => String(o.id) === String(p.id)) || list[0];
  const nights = Math.max(1, d.diff(q.out, q.in));
  const r = TS.rng(x.seed);
  document.title = `${x.name}, ${x.city} | TripSaathi`;

  const amenity = (k) => D.amenities.find((a) => a.key === k);
  const cheapest = x.rooms[0].options[0];
  const reviewers = ['Ananya', 'Rohit', 'Meera', 'Kabir', 'Ishita', 'Vikram', 'Sana', 'Arjun', 'Neha', 'Dev'];
  const reviewTexts = [
    'Spotless rooms and a really warm staff. Breakfast spread had good local options.',
    'Great location – we could walk to most places. Check-in was quick and smooth.',
    'Value for money stay. The room was a little smaller than expected but very clean.',
    'Loved the view from our balcony! Will definitely come back with family.',
    'Comfortable beds and quiet surroundings. Wi-Fi was fast enough for work calls.',
    'Helpful front desk who arranged a cab and sightseeing for us at a fair price.',
    'Food at the restaurant was delicious. Pool area was well maintained.',
  ];
  const cats = [['Location', 0.2], ['Cleanliness', 0.1], ['Service', 0.05], ['Value for money', -0.1], ['Amenities', -0.05]];
  const reviews = Array.from({ length: 3 }, (_, i) => ({ n: TS.pick(r, reviewers), t: TS.pick(r, reviewTexts), s: Math.min(5, Math.round((x.rating + r() * 0.6 - 0.2) * 10) / 10), m: d.MONTHS_L[(d.today().getMonth() + 11 - i) % 12] }));

  const roomHTML = (rm, ri) => `<div class="room">
      <div class="room-l"><div class="im">${TS.scene('room', x.seed + ri * 7)}</div><h4>${esc(rm.name)}</h4><ul><li>${icon('map', 14)} ${rm.size}</li><li>${icon('villa', 14)} ${esc(rm.view)}</li><li>${icon('user', 14)} ${esc(rm.bed)}</li>${x.amenities.slice(0, 3).map((k) => `<li>${icon(amenity(k).icon, 14)} ${amenity(k).label}</li>`).join('')}</ul></div>
      <div>${rm.options.map((o, oi) => `<div class="ropt"><div><h5>${esc(o.name)}</h5><ul>${o.perks.map((pk) => `<li class="${/No meals|Non-Refundable/.test(pk) ? 'neg' : ''}">${icon(/No meals|Non-Refundable/.test(pk) ? 'x' : 'check', 14)} ${esc(pk)}</li>`).join('')}</ul></div><div class="rp"><span class="strike small">${TS.inr(Math.round(o.price * 1.25))}</span><b>${TS.inr(o.price * q.rooms)}</b><small>+ ${TS.inr(Math.round(o.price * q.rooms * (o.price > 7500 ? 0.18 : 0.12)))} taxes &amp; fees per night</small><button type="button" class="btn-cta" data-room="${ri}" data-opt="${oi}">SELECT ROOM</button></div></div>`).join('')}</div>
    </div>`;

  $('#page').innerHTML = `
    <div class="crumbs"><a href="index.html">Home</a> › <a href="hotels.html?${TS.qs({ city: q.city, in: q.in, out: q.out, rooms: q.rooms, ad: q.ad, ch: q.ch, type: q.type === 'homestay' ? 'homestay' : '' })}">${q.type === 'homestay' ? 'Homestays' : 'Hotels'} in ${esc(q.city)}</a> › ${esc(x.name)}</div>
    <div class="hd-top">
      <div class="hd-title"><div><h1>${esc(x.name)}${x.stars ? TS.stars(x.stars) : ''}</h1><div class="hc-loc">${esc(x.locality)}, ${esc(x.city)} <span>| ${esc(x.dist)}</span></div><span class="hc-type">${esc(x.type)}</span></div>
        <div class="row"><button type="button" class="btn-ghost" data-share>${icon('share', 16)} Share</button><button type="button" class="btn-ghost" data-fav>${icon('heart', 16)} Save</button></div></div>
      <div class="hd-gal">${[x.images[0], 'exterior', 'room', x.images[2], 'room'].map((k, i) => `<div>${TS.scene(k, x.seed + i)}${i === 0 ? `<span class="lbl-p">${esc(x.city)}</span>` : i === 4 ? `<span class="lbl-p">+${12 + (x.seed % 30)} photos</span>` : ''}</div>`).join('')}</div>
    </div>
    <nav class="subnav" id="subnav">${[['ov', 'Overview'], ['rooms', 'Rooms'], ['am', 'Amenities'], ['loc', 'Location'], ['rev', 'Guest Reviews'], ['pol', 'Property Rules']].map(([k, l], i) => `<a href="#${k}" class="${i === 0 ? 'on' : ''}">${l}</a>`).join('')}</nav>
    <div class="hd-grid">
      <div>
        <section class="box" id="ov" style="margin-bottom:14px"><h3>About ${esc(x.name)}</h3><p>${esc(x.name)} is a ${x.stars ? x.stars + '-star ' : ''}${esc(x.type.toLowerCase())} in ${esc(x.locality)}, ${esc(x.city)}, located ${esc(x.dist)}. ${esc(x.blurb)}. Guests rate it <b>${x.rating.toFixed(1)}/5</b> for its ${cats.slice(0, 2).map((c) => c[0].toLowerCase()).join(' and ')}.</p><div class="hc-tags" style="flex-direction:row;flex-wrap:wrap;gap:14px">${x.tags.map((t) => `<span>${icon('check', 14)} ${t}</span>`).join('')}</div></section>
        <section id="rooms" style="margin-bottom:14px"><div class="box"><h3>Select a room</h3><p class="muted small">Prices for ${q.rooms} room${q.rooms > 1 ? 's' : ''} · ${q.ad + q.ch} guest${q.ad + q.ch > 1 ? 's' : ''} · per night</p>${x.rooms.map(roomHTML).join('')}</div></section>
        <section class="box" id="am" style="margin-bottom:14px"><h3>Amenities</h3><div class="am-grid">${x.amenities.map((k) => `<span>${icon(amenity(k).icon, 18)} ${amenity(k).label}</span>`).join('')}<span>${icon('headset', 18)} Front desk</span><span>${icon('luggage', 18)} Luggage storage</span><span>${icon('shield', 18)} Daily sanitisation</span></div></section>
        <section class="box" id="loc" style="margin-bottom:14px"><h3>Location</h3><div class="mapbox"><span class="pinm">${icon('pin', 40)}</span></div><p style="margin-top:10px">${esc(x.locality)}, ${esc(x.city)}, ${esc(x.country)}</p><ul class="ticks"><li>${icon('pin', 14)} ${esc(x.dist)}</li><li>${icon('plane', 14)} ${(8 + r() * 30).toFixed(1)} km from the nearest airport</li><li>${icon('train', 14)} ${(1 + r() * 12).toFixed(1)} km from the railway station</li></ul></section>
        <section class="box" id="rev" style="margin-bottom:14px"><h3>Guest Reviews</h3><div class="row" style="gap:20px;align-items:flex-start;flex-wrap:wrap"><div style="text-align:center;min-width:120px"><div class="rbadge" style="display:inline-block;font-size:26px;padding:10px 14px">${x.rating.toFixed(1)}</div><p style="margin:6px 0 0"><b>${TS.ratingText(x.rating)}</b><br><small class="muted">${TS.num(x.reviews)} ratings</small></p></div><div class="rev-bars" style="flex:1;min-width:240px">${cats.map(([c, o]) => { const v = TS.clamp(x.rating + o, 3, 5); return `<div class="rev-bar"><span>${c}</span><span class="b"><i style="width:${(v / 5) * 100}%"></i></span><b>${v.toFixed(1)}</b></div>`; }).join('')}</div></div>
          ${reviews.map((rv) => `<div class="review"><div class="row-between"><b>${rv.n}</b><span class="rbadge" style="font-size:12px">${rv.s.toFixed(1)}</span></div><small class="muted">Stayed in ${rv.m}</small><p>${esc(rv.t)}</p></div>`).join('')}</section>
        <section class="box" id="pol"><h3>Property Rules</h3><div class="form-grid g2" style="margin-bottom:10px"><div><small class="muted">Check-in</small><br><b>2:00 PM</b></div><div><small class="muted">Check-out</small><br><b>12:00 PM</b></div></div><ul class="ticks"><li>${icon('check', 14)} Unmarried couples are allowed with valid ID</li><li>${icon('check', 14)} Government-issued photo ID is required at check-in</li><li>${icon('check', 14)} ${x.tags.includes('Pay at Hotel') ? 'Pay at hotel option available' : 'Full prepayment required at booking'}</li><li>${icon('x', 14)} Pets are not allowed</li><li>${icon('x', 14)} Smoking is not allowed inside rooms</li></ul></section>
      </div>
      <aside class="hd-side">
        <div class="box"><h4>${esc(x.rooms[0].name)}</h4><small class="muted">${esc(cheapest.name)} · ${q.rooms} room${q.rooms > 1 ? 's' : ''}</small><div style="margin:10px 0"><span class="strike">${TS.inr(x.mrp * q.rooms)}</span><div class="price-lg">${TS.inr(cheapest.price * q.rooms)}</div><small class="muted">+ ${TS.inr(x.tax * q.rooms)} taxes &amp; fees per night</small></div><div class="it-dates" style="margin-bottom:12px"><div><small>Check-in</small><b>${d.nice(q.in)}</b></div><div><small>Check-out</small><b>${d.nice(q.out)}</b></div></div><button type="button" class="btn-cta btn-block" data-room="0" data-opt="0">BOOK THIS NOW</button><a href="#rooms" class="link-btn" style="margin-top:10px;justify-content:center;width:100%">View ${x.rooms.length} more room options</a></div>
        <div class="box"><div class="rating" style="justify-content:space-between"><span style="text-align:left"><b>${TS.ratingText(x.rating)}</b><small>${TS.num(x.reviews)} ratings</small></span><span class="rbadge">${x.rating.toFixed(1)}</span></div><p class="small muted" style="margin:10px 0 0">"${esc(reviews[0].t)}"</p></div>
        <div class="box"><h4>Why book with TripSaathi?</h4><ul class="ticks"><li>${icon('check', 14)} Lowest price guarantee</li><li>${icon('check', 14)} Instant confirmation</li><li>${icon('check', 14)} 24×7 customer support</li></ul></div>
      </aside>
    </div>`;

  const subnav = $('#subnav');
  const secs = $$('.hd-grid section[id]');
  window.addEventListener('scroll', () => {
    let cur = secs[0].id;
    secs.forEach((s) => { if (s.getBoundingClientRect().top < 160) cur = s.id; });
    $$('a', subnav).forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + cur));
  }, { passive: true });
  subnav.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    const t = $(a.getAttribute('href'));
    window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' });
  });

  $('#page').addEventListener('click', (e) => {
    if (e.target.closest('[data-share]')) { (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(() => TS.toast('Link copied to clipboard', 'ok'), () => TS.toast('Copy the page URL to share')); return; }
    if (e.target.closest('[data-fav]')) { const f = new Set(TS.store.get('favs', [])); f.add(x.name); TS.store.set('favs', [...f]); TS.toast('Added to your shortlist', 'ok'); return; }
    const b = e.target.closest('[data-room]');
    if (!b) return;
    const rm = x.rooms[+b.dataset.room], o = rm.options[+b.dataset.opt];
    const base = o.price * q.rooms * nights;
    TS.checkout.go({
      type: 'hotel', title: x.name, subtitle: `${x.locality}, ${x.city} · ${nights} night${nights > 1 ? 's' : ''} · ${q.rooms} room${q.rooms > 1 ? 's' : ''}`,
      date: q.in, endDate: q.out, pax: { ad: q.ad, ch: q.ch, inf: 0 }, primaryOnly: true,
      base, taxes: Math.round(base * (o.price > 7500 ? 0.18 : 0.12)), fees: 0,
      itinerary: `<div class="it-hotel"><div class="im">${TS.scene(x.images[0], x.seed)}</div><div><h4>${esc(x.name)}${x.stars ? TS.stars(x.stars) : ''}</h4><div class="hc-loc">${esc(x.locality)}, ${esc(x.city)}</div><div class="it-dates"><div><small>Check-in</small><b>${d.nice(q.in)}</b><small style="text-transform:none">2:00 PM</small></div><div><small>Check-out</small><b>${d.nice(q.out)}</b><small style="text-transform:none">12:00 PM</small></div><div><small>Guests</small><b>${q.ad} Adult${q.ad > 1 ? 's' : ''}${q.ch ? ', ' + q.ch + ' Child' : ''}</b></div></div><div class="it-meta"><span>${icon('hotel', 14)} ${q.rooms} × ${esc(rm.name)}</span><span>${icon('meal', 14)} ${esc(o.name)}</span>${o.perks.map((pk) => `<span>${icon('check', 14)} ${esc(pk)}</span>`).join('')}</div></div></div>`,
      backUrl: location.href,
    });
  });
})();
