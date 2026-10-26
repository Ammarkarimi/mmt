/* TripSaathi – My Trips (hotel stays from the TripSaathi API + other bookings saved on this device) */
(function () {
  const { $, esc, icon, d } = TS;
  TS.mountChrome({ page: 'mytrips' });
  const icons = { flight: 'plane', hotel: 'hotel', holiday: 'holiday', train: 'train', bus: 'bus', cab: 'car', visa: 'visa', forex: 'forex', insurance: 'shield' };
  const names = { flight: 'Flight', hotel: 'Hotel', holiday: 'Holiday', train: 'Train', bus: 'Bus', cab: 'Cab', visa: 'Visa', forex: 'Forex', insurance: 'Insurance' };
  const fmt12 = (t) => { const [H, M] = t.split(':').map(Number); return ((H + 11) % 12) + 1 + ':' + String(M).padStart(2, '0') + ' ' + (H < 12 ? 'AM' : 'PM'); };
  let tab = 'up';
  const openIds = new Set();
  let remote = [];
  let remoteState = 'idle'; // idle | loading | ok | error
  let remoteError = '';

  const statusOf = (b) => {
    if (b.status === 'cancelled') return 'can';
    if (b.api) return b.api.stage === 'completed' ? 'done' : 'up';
    return d.parse(b.endDate || b.date) < d.today() ? 'done' : 'up';
  };

  const itinerary = (b) => {
    const s = TS.hash(b.property.id) % 100000;
    const pr = b.price;
    return `<div class="it-hotel"><div class="im">${TS.scene(b.property.scene || 'city', s)}</div><div><h4>${esc(b.property.name)}${b.property.stars ? TS.stars(b.property.stars) : ''}</h4><div class="hc-loc">${esc([b.property.address, b.property.locality, b.property.city].filter(Boolean).join(', '))}</div>
      <div class="it-dates"><div><small>Check-in</small><b>${d.nice(b.checkIn)}</b><small style="text-transform:none">${fmt12(b.property.checkInTime || '14:00')}</small></div><div><small>Check-out</small><b>${d.nice(b.checkOut)}</b><small style="text-transform:none">${fmt12(b.property.checkOutTime || '12:00')}</small></div><div><small>Guests</small><b>${b.adults} Adult${b.adults > 1 ? 's' : ''}${b.children ? `, ${b.children} Child${b.children > 1 ? 'ren' : ''}` : ''}</b></div></div>
      <div class="it-meta"><span>${icon('hotel', 14)} ${b.rooms} × ${esc(b.room.name)}</span><span>${icon('meal', 14)} ${esc(b.plan.name)}</span><span>${icon(b.cancellationPolicy.key === 'non_refundable' ? 'x' : 'refund', 14)} ${esc(b.cancellationPolicy.label)}</span>${b.property.phone ? `<span>${icon('phone', 14)} Property: +91 ${esc(b.property.phone)}</span>` : ''}</div>
      <div class="fare-sum" style="margin-top:10px"><div class="row-between"><span>Room charges (${b.nights} night${b.nights > 1 ? 's' : ''})</span><b>${TS.inr(pr.roomCharges)}</b></div><div class="row-between"><span>Taxes &amp; fees</span><b>${TS.inr(pr.taxes)}</b></div>${pr.discount ? `<div class="row-between disc"><span>Coupon ${esc(b.couponCode || '')}</span><b>– ${TS.inr(pr.discount)}</b></div>` : ''}<div class="row-between tot"><span>Total paid</span><span>${TS.inr(pr.total)}</span></div></div>
      ${b.specialRequests ? `<p class="small" style="margin:8px 0 0"><b>Special requests:</b> ${esc(b.specialRequests)}</p>` : ''}</div></div>`;
  };

  const fromApi = (b) => ({
    id: b.id, type: 'hotel', api: b, title: b.property.name,
    subtitle: `${b.property.locality}, ${b.property.city} · ${b.nights} night${b.nights > 1 ? 's' : ''} · ${b.rooms} × ${b.room.name}`,
    date: b.checkIn, endDate: b.checkOut, amount: b.price.total, status: b.status, refund: b.refundAmount, createdAt: b.createdAt,
    travellers: [`${b.guest.firstName} ${b.guest.lastName}`], contact: { email: b.guest.email, phone: b.guest.phone }, itinerary: itinerary(b),
  });

  const allTrips = () => remote.concat(TS.bookings.all()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const page = $('#page');
  const draw = () => {
    const all = allTrips();
    const cnt = (k) => all.filter((b) => statusOf(b) === k).length;
    const list = all.filter((b) => statusOf(b) === tab);
    const user = TS.auth.user();
    page.innerHTML = `
      <div class="res-h" style="margin-top:6px"><div><h1>My Trips</h1><p>${user ? `Bookings for ${esc(user.name)}` : 'Bookings made on this device'}</p></div>${user ? '' : '<button type="button" class="btn-out" data-login>LOGIN TO SEE HOTEL BOOKINGS</button>'}</div>
      ${remoteState === 'loading' ? `<div class="banner-strip">${icon('clock', 18)} Loading your hotel bookings…</div>` : ''}
      ${remoteState === 'error' ? `<div class="banner-strip">${icon('info', 18)} ${esc(remoteError)}<button type="button" class="btn-out" data-reload>RETRY</button></div>` : ''}
      <div class="mt-tabs">${[['up', 'UPCOMING', 'calendar'], ['can', 'CANCELLED', 'x'], ['done', 'COMPLETED', 'check']].map(([k, l]) => `<button type="button" data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}<span>${cnt(k)}</span></button>`).join('')}</div>
      ${list.length ? list.map((b) => {
        const s = statusOf(b);
        const op = openIds.has(b.id);
        const canReview = b.api && s === 'done' && !b.api.reviewed;
        return `<article class="trip" data-id="${esc(b.id)}">
          <div class="trip-h"><span class="trip-ic">${icon(icons[b.type] || 'bag', 24)}</span><div><h3>${esc(b.title)}</h3><small>${esc(b.subtitle || '')}</small><small>${names[b.type]} · Booking ID <b>${esc(b.id)}</b> · Booked on ${d.nice(d.iso(new Date(b.createdAt)))}</small></div>
            <div class="r"><b>${TS.inr(b.amount)}</b>${s === 'up' ? `<span class="chip ok">${b.api && b.api.stage === 'in_house' ? 'CHECKED IN' : 'CONFIRMED'}</span>` : s === 'can' ? `<span class="chip red">CANCELLED</span>${b.refund ? `<small class="muted">Refund ${TS.inr(b.refund)} initiated</small>` : ''}` : `<span class="chip">COMPLETED</span>${b.api && b.api.reviewed ? '<small class="muted">Rated – thank you!</small>' : ''}`}</div></div>
          ${op ? `<div class="trip-b">${b.itinerary}${b.travellers && b.travellers.length ? `<p class="small" style="margin:10px 0 0"><b>${b.type === 'hotel' ? 'Lead guest' : 'Travellers'}:</b> ${b.travellers.map(esc).join(', ')}</p>` : ''}</div>` : ''}
          <div class="trip-act"><button type="button" class="btn-out" data-view>${op ? 'HIDE DETAILS' : 'VIEW DETAILS'}</button>${s === 'up' ? `<button type="button" class="btn-out" data-ticket>${b.type === 'hotel' ? 'HOTEL VOUCHER' : 'E-TICKET'}</button>${!b.api || b.api.stage === 'upcoming' ? '<button type="button" class="btn-danger" data-cancel>CANCEL BOOKING</button>' : ''}` : ''}${canReview ? '<button type="button" class="btn-cta" data-review>RATE YOUR STAY</button>' : ''}</div>
        </article>`;
      }).join('') : `<div class="empty">${icon('bag', 44)}<h3>${tab === 'up' ? 'Looks empty! You have no upcoming trips.' : tab === 'can' ? 'No cancelled trips' : 'No completed trips yet'}</h3><p class="muted">When you book a trip, it will show up here.</p><a class="btn-cta" href="index.html">PLAN A TRIP</a></div>`}`;
  };

  const loadRemote = async () => {
    if (!TS.auth.user()) { remote = []; remoteState = 'idle'; draw(); return; }
    remoteState = 'loading';
    draw();
    try {
      const r = await TS.api('/bookings');
      remote = r.bookings.filter((b) => b.status !== 'held').map(fromApi);
      remoteState = 'ok';
    } catch (err) {
      remoteState = err.status === 401 ? 'idle' : 'error';
      remoteError = err.message;
    }
    draw();
  };

  const cancelLocal = (b) => {
    const days = d.diff(b.date, d.today());
    const pct = days > 7 ? 0.9 : days > 2 ? 0.75 : 0.5;
    const refund = Math.round(b.amount * pct);
    confirmCancel(b, { refund, penalty: b.amount - refund }, () => { TS.bookings.update(b.id, { status: 'cancelled', refund }); TS.toast('Booking cancelled. Refund of ' + TS.inr(refund) + ' initiated.', 'ok'); draw(); });
  };

  const cancelRemote = async (b) => {
    try {
      const q = await TS.api(`/bookings/${encodeURIComponent(b.id)}/cancellation`);
      if (!q.allowed) { TS.toast(q.reason, 'err'); return; }
      confirmCancel(b, q, async (m, btn) => {
        btn.disabled = true;
        try {
          const r = await TS.api(`/bookings/${encodeURIComponent(b.id)}/cancel`, { method: 'POST', body: {} });
          m.close();
          TS.toast(r.booking.refundAmount ? `Booking cancelled. Refund of ${TS.inr(r.booking.refundAmount)} initiated.` : 'Booking cancelled.', 'ok');
          loadRemote();
        } catch (err) {
          btn.disabled = false;
          TS.toast(err.message, 'err');
        }
      });
    } catch (err) {
      TS.toast(err.message, 'err');
    }
  };

  const confirmCancel = (b, q, onYes) => {
    const m = TS.modal({ title: 'Cancel booking?', body: `<p>${esc(b.title)} · <b>${esc(b.id)}</b></p>${q.policy ? `<p class="small muted">${esc(q.policy.detail)}</p>` : ''}<div class="fare-sum"><div class="row-between"><span>Amount paid</span><b>${TS.inr(b.amount)}</b></div><div class="row-between"><span>Cancellation charges</span><b>– ${TS.inr(q.penalty)}</b></div><div class="row-between tot"><span>Refund amount</span><span>${TS.inr(q.refund)}</span></div></div><p class="tiny">Refund will be credited to the original payment method within 5–7 working days.</p><div class="row" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn-out" data-keep>KEEP BOOKING</button><button type="button" class="btn-danger" data-yes>YES, CANCEL</button></div>` });
    m.el.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-keep]')) m.close();
      const yes = ev.target.closest('[data-yes]');
      if (yes && !yes.disabled) { if (b.api) onYes(m, yes); else { m.close(); onYes(); } }
    });
  };

  const review = (b) => {
    let rating = 0;
    const m = TS.modal({ title: 'Rate your stay', body: `<p class="muted">${esc(b.title)} · ${d.nice(b.date)} – ${d.nice(b.endDate)}</p><div class="rate-stars" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">${icon('star', 30)}</button>`).join('')}</div><div class="fi" style="margin-top:12px"><label>Tell other travellers about your stay (optional)</label><textarea id="rvText" rows="4" maxlength="1000" placeholder="What did you like? What could be better?"></textarea></div><div class="row" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn-cta" data-send>SUBMIT REVIEW</button></div>` });
    m.el.addEventListener('click', async (ev) => {
      const s = ev.target.closest('[data-star]');
      if (s) { rating = +s.dataset.star; m.el.querySelectorAll('[data-star]').forEach((x) => x.classList.toggle('on', +x.dataset.star <= rating)); return; }
      const send = ev.target.closest('[data-send]');
      if (!send || send.disabled) return;
      if (!rating) { TS.toast('Please choose a star rating', 'err'); return; }
      send.disabled = true;
      try {
        await TS.api(`/bookings/${encodeURIComponent(b.id)}/review`, { method: 'POST', body: { rating, comment: $('#rvText', m.el).value } });
        m.close();
        TS.toast('Thanks for rating your stay!', 'ok');
        loadRemote();
      } catch (err) {
        send.disabled = false;
        TS.toast(err.message, 'err');
      }
    });
  };

  page.addEventListener('click', (e) => {
    if (e.target.closest('[data-login]')) { TS.openLogin(loadRemote); return; }
    if (e.target.closest('[data-reload]')) { loadRemote(); return; }
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; draw(); return; }
    const card = e.target.closest('.trip');
    if (!card) return;
    const b = allTrips().find((x) => x.id === card.dataset.id);
    if (!b) return;
    if (e.target.closest('[data-view]')) { openIds.has(b.id) ? openIds.delete(b.id) : openIds.add(b.id); draw(); return; }
    if (e.target.closest('[data-ticket]')) { TS.toast(`${b.type === 'hotel' ? 'Hotel voucher' : 'E-ticket'} for ${b.id} sent to ${b.contact && b.contact.email ? b.contact.email : 'your email'}`, 'ok'); return; }
    if (e.target.closest('[data-review]')) { review(b); return; }
    if (e.target.closest('[data-cancel]')) { if (b.api) cancelRemote(b); else cancelLocal(b); }
  });
  draw();
  loadRemote();
})();
