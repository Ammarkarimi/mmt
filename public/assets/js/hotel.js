/* TripSaathi – hotel details with live room availability and prices from the TripSaathi API */
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

  const nights = Math.max(1, d.diff(q.out, q.in));
  const fmt12 = TS.Search.fmt12;
  const amenity = (k) => D.amenities.find((a) => a.key === k);
  const listUrl = 'hotels.html?' + TS.qs({ city: q.city, in: q.in, out: q.out, rooms: q.rooms, ad: q.ad, ch: q.ch, type: q.type === 'homestay' ? 'homestay' : '' });
  const crumbs = (name) => `<div class="crumbs"><a href="index.html">Home</a> › <a href="${listUrl}">${q.type === 'homestay' ? 'Homestays' : 'Hotels'} in ${esc(q.city)}</a>${name ? ` › ${esc(name)}` : ''}</div>`;

  let x;
  let rooms = [];

  const render = (data) => {
    x = data.property;
    rooms = data.rooms;
    const reviews = data.reviews;
    const seed = TS.hash(x.id) % 100000;
    const art = (kind, i) => (x.photos[i] ? `<img src="${esc(x.photos[i])}" alt="" loading="lazy">` : TS.scene(kind, seed + i));
    document.title = `${x.name}, ${x.city} | TripSaathi`;

    const options = rooms.filter((rm) => rm.bookable).flatMap((rm) => rm.ratePlans.map((o) => ({ rm, o })));
    const best = options.reduce((b, c) => (!b || c.o.total < b.o.total ? c : b), null);
    const maxFit = rooms.reduce((m, rm) => Math.max(m, rm.maxAdults), 0);
    const neg = (o) => o.mealPlan === 'EP';

    const roomHTML = (rm, ri) => {
      const status = !rm.fits
        ? `<p class="small room-note">${icon('info', 14)} Fits ${rm.maxAdults} adult${rm.maxAdults > 1 ? 's' : ''}${rm.maxChildren ? ` + ${rm.maxChildren} child${rm.maxChildren > 1 ? 'ren' : ''}` : ''} per room – add rooms to choose this one.</p>`
        : !rm.bookable ? `<p class="small room-note red">${icon('x', 14)} Sold out for your dates</p>`
          : rm.available <= 3 ? `<p class="small room-note red">Only ${rm.available} left at this price!</p>` : '';
      return `<div class="room ${rm.bookable ? '' : 'off'}">
        <div class="room-l"><div class="im">${rm.photos[0] ? `<img src="${esc(rm.photos[0])}" alt="" loading="lazy">` : TS.scene('room', seed + ri * 7)}</div><h4>${esc(rm.name)}</h4><ul>
          ${rm.sizeSqft ? `<li>${icon('map', 14)} ${rm.sizeSqft} sq.ft</li>` : ''}${rm.view ? `<li>${icon('villa', 14)} ${esc(rm.view)}</li>` : ''}${rm.bedType ? `<li>${icon('user', 14)} ${esc(rm.bedType)}</li>` : ''}
          <li>${icon('user', 14)} Up to ${rm.maxOccupancy} guests</li>${rm.amenities.slice(0, 4).map((a) => `<li>${icon('check', 14)} ${esc(a)}</li>`).join('')}</ul>${status}</div>
        <div>${rm.ratePlans.map((o) => `<div class="ropt"><div><h5>${esc(o.name)}</h5><ul>
            ${o.inclusions.map((t) => `<li class="${neg(o) ? 'neg' : ''}">${icon(neg(o) ? 'x' : 'check', 14)} ${esc(t)}</li>`).join('')}
            <li class="${o.policy.key === 'non_refundable' ? 'neg' : ''}">${icon(o.policy.key === 'non_refundable' ? 'x' : 'check', 14)} ${esc(o.policy.label)}</li>
            ${rm.extraAdultPrice && q.ad > q.rooms * rm.baseOccupancy ? `<li>${icon('info', 14)} Includes extra adult charges</li>` : ''}</ul></div>
          <div class="rp"><b>${TS.inr(Math.round(o.roomCharges / nights))}</b><small>+ ${TS.inr(Math.round(o.taxes / nights))} taxes &amp; fees per night</small><small>${q.rooms > 1 ? `${q.rooms} rooms · ` : ''}${TS.inr(o.total)} for ${nights} night${nights > 1 ? 's' : ''}</small>
            <button type="button" class="btn-cta" data-room="${esc(rm.id)}" data-plan="${esc(o.id)}" ${rm.bookable ? '' : 'disabled'}>${rm.bookable ? 'SELECT ROOM' : rm.fits ? 'SOLD OUT' : 'NOT AVAILABLE'}</button></div></div>`).join('')}</div>
      </div>`;
    };

    const rules = [
      [true, `Check-in from ${fmt12(x.checkInTime)}, check-out by ${fmt12(x.checkOutTime)}`],
      [true, 'Government-issued photo ID is required at check-in'],
      [x.policies.coupleFriendly, x.policies.coupleFriendly ? 'Unmarried couples are welcome with valid ID' : 'Unmarried couples may not be allowed'],
      [x.policies.localIdsAllowed, x.policies.localIdsAllowed ? 'Local IDs are accepted' : 'Local IDs are not accepted'],
      [x.policies.payAtHotel, x.policies.payAtHotel ? 'Pay at hotel option available on request' : 'Full prepayment required at booking'],
      [x.policies.petsAllowed, x.policies.petsAllowed ? 'Pets are allowed' : 'Pets are not allowed'],
      [x.policies.smokingAllowed, x.policies.smokingAllowed ? 'Smoking allowed in designated areas' : 'Smoking is not allowed inside rooms'],
    ].concat((x.policies.extraRules || []).map((r) => [true, r]));

    $('#page').innerHTML = `${crumbs(x.name)}
      <div class="hd-top">
        <div class="hd-title"><div><h1>${esc(x.name)}${x.stars ? TS.stars(x.stars) : ''}</h1><div class="hc-loc">${esc(x.locality)}, ${esc(x.city)}${x.landmark ? ` <span>| ${esc(x.landmark)}</span>` : ''}</div><span class="hc-type">${esc(x.type)}</span></div>
          <div class="row"><button type="button" class="btn-ghost" data-share>${icon('share', 16)} Share</button><button type="button" class="btn-ghost" data-fav>${icon('heart', 16)} Save</button></div></div>
        <div class="hd-gal">${[x.scene, 'exterior', 'room', x.amenities.includes('pool') ? 'pool' : 'lobby', 'room'].map((k, i) => `<div>${art(k, i)}${i === 0 ? `<span class="lbl-p">${esc(x.city)}</span>` : ''}</div>`).join('')}</div>
      </div>
      <nav class="subnav" id="subnav">${[['ov', 'Overview'], ['rooms', 'Rooms'], ['am', 'Amenities'], ['loc', 'Location'], ['rev', 'Guest Reviews'], ['pol', 'Property Rules']].map(([k, l], i) => `<a href="#${k}" class="${i === 0 ? 'on' : ''}">${l}</a>`).join('')}</nav>
      <div class="hd-grid">
        <div>
          <section class="box" id="ov" style="margin-bottom:14px"><h3>About ${esc(x.name)}</h3>${x.description.split(/\n+/).map((para) => `<p>${esc(para)}</p>`).join('')}<div class="hc-tags" style="flex-direction:row;flex-wrap:wrap;gap:14px"><span>${icon('check', 14)} ${esc(x.policies.cancellation.label)} on refundable rates</span>${x.policies.coupleFriendly ? `<span>${icon('check', 14)} Couple Friendly</span>` : ''}${x.policies.payAtHotel ? `<span>${icon('check', 14)} Pay at Hotel</span>` : ''}</div></section>
          <section id="rooms" style="margin-bottom:14px"><div class="box"><h3>Select a room</h3><p class="muted small">Live prices for ${q.rooms} room${q.rooms > 1 ? 's' : ''} · ${q.ad} adult${q.ad > 1 ? 's' : ''}${q.ch ? `, ${q.ch} child${q.ch > 1 ? 'ren' : ''}` : ''} · ${d.nice(q.in)} – ${d.nice(q.out)}</p>
            ${rooms.length ? rooms.map(roomHTML).join('') : '<p class="muted">No rooms are open for sale right now.</p>'}
            ${rooms.length && !rooms.some((rm) => rm.fits) ? `<div class="banner-strip">${icon('info', 18)} Rooms here fit up to ${maxFit} adults each. Increase the number of rooms in the search above.</div>` : ''}</div></section>
          <section class="box" id="am" style="margin-bottom:14px"><h3>Amenities</h3><div class="am-grid">${x.amenities.map((k) => { const a = amenity(k); return a ? `<span>${icon(a.icon, 18)} ${a.label}</span>` : ''; }).join('')}<span>${icon('headset', 18)} Front desk</span><span>${icon('shield', 18)} Daily housekeeping</span></div></section>
          <section class="box" id="loc" style="margin-bottom:14px"><h3>Location</h3><div class="mapbox"><span class="pinm">${icon('pin', 40)}</span></div><p style="margin-top:10px">${esc([x.address, x.locality, x.city, x.state, x.pincode].filter(Boolean).join(', '))}${x.country !== 'India' ? ', ' + esc(x.country) : ''}</p>${x.landmark ? `<ul class="ticks"><li>${icon('pin', 14)} ${esc(x.landmark)}</li></ul>` : ''}</section>
          <section class="box" id="rev" style="margin-bottom:14px"><h3>Guest Reviews</h3>${x.rating
            ? `<div class="row" style="gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:6px"><div class="rbadge" style="display:inline-block;font-size:26px;padding:10px 14px">${x.rating.toFixed(1)}</div><p style="margin:0"><b>${TS.ratingText(x.rating)}</b><br><small class="muted">${TS.num(x.ratingCount)} verified rating${x.ratingCount > 1 ? 's' : ''}</small></p></div>
               ${reviews.map((rv) => `<div class="review"><div class="row-between"><b>${esc(rv.author)}</b><span class="rbadge" style="font-size:12px">${rv.rating}.0</span></div><small class="muted">${rv.stayedOn ? `Stayed in ${d.MONTHS_L[d.parse(rv.stayedOn).getMonth()]} ${d.parse(rv.stayedOn).getFullYear()}` : ''}</small>${rv.comment ? `<p>${esc(rv.comment)}</p>` : ''}</div>`).join('')}`
            : '<p class="muted">No reviews yet – guests who stay here can rate the property after check-out.</p>'}</section>
          <section class="box" id="pol"><h3>Property Rules</h3><div class="form-grid g2" style="margin-bottom:10px"><div><small class="muted">Check-in</small><br><b>${fmt12(x.checkInTime)}</b></div><div><small class="muted">Check-out</small><br><b>${fmt12(x.checkOutTime)}</b></div></div><ul class="ticks">${rules.map(([ok, t]) => `<li>${icon(ok ? 'check' : 'x', 14)} ${esc(t)}</li>`).join('')}</ul></section>
        </div>
        <aside class="hd-side">
          <div class="box">${best
            ? `<h4>${esc(best.rm.name)}</h4><small class="muted">${esc(best.o.name)} · ${q.rooms} room${q.rooms > 1 ? 's' : ''}</small><div style="margin:10px 0"><div class="price-lg">${TS.inr(Math.round(best.o.roomCharges / nights))}</div><small class="muted">+ ${TS.inr(Math.round(best.o.taxes / nights))} taxes &amp; fees per night</small></div><div class="it-dates" style="margin-bottom:12px"><div><small>Check-in</small><b>${d.nice(q.in)}</b></div><div><small>Check-out</small><b>${d.nice(q.out)}</b></div></div><button type="button" class="btn-cta btn-block" data-room="${esc(best.rm.id)}" data-plan="${esc(best.o.id)}">BOOK THIS NOW</button><a href="#rooms" class="link-btn" style="margin-top:10px;justify-content:center;width:100%">View all ${options.length} room options</a>`
            : `<h4>Sold out for your dates</h4><p class="muted small">Change your dates or guests in the search bar above to see availability.</p>`}</div>
          ${x.rating ? `<div class="box"><div class="rating" style="justify-content:space-between"><span style="text-align:left"><b>${TS.ratingText(x.rating)}</b><small>${TS.num(x.ratingCount)} ratings</small></span><span class="rbadge">${x.rating.toFixed(1)}</span></div>${reviews[0] && reviews[0].comment ? `<p class="small muted" style="margin:10px 0 0">"${esc(reviews[0].comment)}"</p>` : ''}</div>` : ''}
          <div class="box"><h4>Why book with TripSaathi?</h4><ul class="ticks"><li>${icon('check', 14)} Live prices from the property</li><li>${icon('check', 14)} Instant confirmation</li><li>${icon('check', 14)} 24×7 customer support</li></ul></div>
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
  };

  $('#page').addEventListener('click', (e) => {
    if (e.target.closest('[data-retry]')) { load(); return; }
    if (!x) return;
    if (e.target.closest('[data-share]')) { (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(() => TS.toast('Link copied to clipboard', 'ok'), () => TS.toast('Copy the page URL to share')); return; }
    if (e.target.closest('[data-fav]')) { const f = new Set(TS.store.get('favs', [])); f.add(x.id); TS.store.set('favs', [...f]); TS.toast('Added to your shortlist', 'ok'); return; }
    const b = e.target.closest('[data-room]');
    if (!b || b.disabled) return;
    const rm = rooms.find((r) => r.id === b.dataset.room);
    const o = rm.ratePlans.find((r) => r.id === b.dataset.plan);
    const seed = TS.hash(x.id) % 100000;
    TS.checkout.go({
      type: 'hotel', title: x.name, subtitle: `${x.locality}, ${x.city} · ${nights} night${nights > 1 ? 's' : ''} · ${q.rooms} room${q.rooms > 1 ? 's' : ''}`,
      date: q.in, endDate: q.out, pax: { ad: q.ad, ch: q.ch, inf: 0 }, primaryOnly: true,
      // The review page re-prices this selection on the server before anything is charged.
      api: { propertyId: x.id, roomTypeId: rm.id, ratePlanId: o.id, checkin: q.in, checkout: q.out, rooms: q.rooms, adults: q.ad, children: q.ch },
      base: o.roomCharges, taxes: o.taxes, fees: 0,
      itinerary: `<div class="it-hotel"><div class="im">${x.photos[0] ? `<img src="${esc(x.photos[0])}" alt="">` : TS.scene(x.scene, seed)}</div><div><h4>${esc(x.name)}${x.stars ? TS.stars(x.stars) : ''}</h4><div class="hc-loc">${esc(x.locality)}, ${esc(x.city)}</div><div class="it-dates"><div><small>Check-in</small><b>${d.nice(q.in)}</b><small style="text-transform:none">${fmt12(x.checkInTime)}</small></div><div><small>Check-out</small><b>${d.nice(q.out)}</b><small style="text-transform:none">${fmt12(x.checkOutTime)}</small></div><div><small>Guests</small><b>${q.ad} Adult${q.ad > 1 ? 's' : ''}${q.ch ? ', ' + q.ch + ' Child' + (q.ch > 1 ? 'ren' : '') : ''}</b></div></div><div class="it-meta"><span>${icon('hotel', 14)} ${q.rooms} × ${esc(rm.name)}</span><span>${icon('meal', 14)} ${esc(o.name)}</span>${o.inclusions.map((t) => `<span>${icon('check', 14)} ${esc(t)}</span>`).join('')}<span>${icon(o.policy.key === 'non_refundable' ? 'x' : 'refund', 14)} ${esc(o.policy.label)}</span></div></div></div>`,
      backUrl: location.href,
    });
  });

  const load = async () => {
    $('#page').innerHTML = `${crumbs('')}<div class="box skel-box"><div class="spinner"></div><p class="muted">Loading live rooms and prices…</p></div>`;
    try {
      render(await TS.api(`/hotels/${encodeURIComponent(p.id || '')}?` + TS.qs({ checkin: q.in, checkout: q.out, rooms: q.rooms, adults: q.ad, children: q.ch })));
    } catch (err) {
      $('#page').innerHTML = `${crumbs('')}<div class="empty">${icon('hotel', 40)}<h3>${err.status === 404 ? 'This property is not available on TripSaathi' : "We couldn't load this property"}</h3><p class="muted">${esc(err.message)}</p><div class="row" style="justify-content:center"><a class="btn-out" href="${listUrl}">SEE OTHER STAYS</a>${err.status === 404 ? '' : '<button type="button" class="btn-out" data-retry>TRY AGAIN</button>'}</div></div>`;
    }
  };
  load();
})();
