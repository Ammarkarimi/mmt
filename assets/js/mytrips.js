/* TripSaathi – My Trips */
(function () {
  const { $, esc, icon, d } = TS;
  TS.mountChrome({ page: 'mytrips' });
  const icons = { flight: 'plane', hotel: 'hotel', holiday: 'holiday', train: 'train', bus: 'bus', cab: 'car', visa: 'visa', forex: 'forex', insurance: 'shield' };
  const names = { flight: 'Flight', hotel: 'Hotel', holiday: 'Holiday', train: 'Train', bus: 'Bus', cab: 'Cab', visa: 'Visa', forex: 'Forex', insurance: 'Insurance' };
  let tab = 'up';
  const openIds = new Set();
  const statusOf = (b) => (b.status === 'cancelled' ? 'can' : d.parse(b.endDate || b.date) < d.today() ? 'done' : 'up');

  const page = $('#page');
  const draw = () => {
    const all = TS.bookings.all();
    const cnt = (k) => all.filter((b) => statusOf(b) === k).length;
    const list = all.filter((b) => statusOf(b) === tab);
    const user = TS.auth.user();
    page.innerHTML = `
      <div class="res-h" style="margin-top:6px"><div><h1>My Trips</h1><p>${user ? `Bookings for ${esc(user.name)}` : 'Bookings made on this device'}</p></div>${user ? '' : '<button type="button" class="btn-out" data-login>LOGIN TO SYNC TRIPS</button>'}</div>
      <div class="mt-tabs">${[['up', 'UPCOMING', 'calendar'], ['can', 'CANCELLED', 'x'], ['done', 'COMPLETED', 'check']].map(([k, l]) => `<button type="button" data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}<span>${cnt(k)}</span></button>`).join('')}</div>
      ${list.length ? list.map((b) => {
        const s = statusOf(b);
        const op = openIds.has(b.id);
        return `<article class="trip" data-id="${b.id}">
          <div class="trip-h"><span class="trip-ic">${icon(icons[b.type] || 'bag', 24)}</span><div><h3>${esc(b.title)}</h3><small>${esc(b.subtitle || '')}</small><small>${names[b.type]} · Booking ID <b>${b.id}</b> · Booked on ${d.nice(d.iso(new Date(b.createdAt)))}</small></div>
            <div class="r"><b>${TS.inr(b.amount)}</b>${s === 'up' ? '<span class="chip ok">CONFIRMED</span>' : s === 'can' ? `<span class="chip red">CANCELLED</span>${b.refund ? `<small class="muted">Refund ${TS.inr(b.refund)} initiated</small>` : ''}` : '<span class="chip">COMPLETED</span>'}</div></div>
          ${op ? `<div class="trip-b">${b.itinerary}${b.travellers && b.travellers.length ? `<p class="small" style="margin:10px 0 0"><b>Travellers:</b> ${b.travellers.map(esc).join(', ')}</p>` : ''}</div>` : ''}
          <div class="trip-act"><button type="button" class="btn-out" data-view>${op ? 'HIDE DETAILS' : 'VIEW DETAILS'}</button>${s === 'up' ? '<button type="button" class="btn-out" data-ticket>E-TICKET</button><button type="button" class="btn-danger" data-cancel>CANCEL BOOKING</button>' : ''}</div>
        </article>`;
      }).join('') : `<div class="empty">${icon('bag', 44)}<h3>${tab === 'up' ? 'Looks empty! You have no upcoming trips.' : tab === 'can' ? 'No cancelled trips' : 'No completed trips yet'}</h3><p class="muted">When you book a trip, it will show up here.</p><a class="btn-cta" href="index.html">PLAN A TRIP</a></div>`}`;
  };
  page.addEventListener('click', (e) => {
    if (e.target.closest('[data-login]')) { TS.openLogin(draw); return; }
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; draw(); return; }
    const card = e.target.closest('.trip');
    if (!card) return;
    const b = TS.bookings.all().find((x) => x.id === card.dataset.id);
    if (e.target.closest('[data-view]')) { openIds.has(b.id) ? openIds.delete(b.id) : openIds.add(b.id); draw(); return; }
    if (e.target.closest('[data-ticket]')) { TS.toast(`E-ticket for ${b.id} sent to ${b.contact && b.contact.email ? b.contact.email : 'your email'}`, 'ok'); return; }
    if (e.target.closest('[data-cancel]')) {
      const days = d.diff(b.date, d.today());
      const pct = days > 7 ? 0.9 : days > 2 ? 0.75 : 0.5;
      const refund = Math.round(b.amount * pct);
      const m = TS.modal({ title: 'Cancel booking?', body: `<p>${esc(b.title)} · <b>${b.id}</b></p><div class="fare-sum"><div class="row-between"><span>Amount paid</span><b>${TS.inr(b.amount)}</b></div><div class="row-between"><span>Cancellation charges</span><b>– ${TS.inr(b.amount - refund)}</b></div><div class="row-between tot"><span>Refund amount</span><span>${TS.inr(refund)}</span></div></div><p class="tiny">Refund will be credited to the original payment method within 5–7 working days.</p><div class="row" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn-out" data-keep>KEEP BOOKING</button><button type="button" class="btn-danger" data-yes>YES, CANCEL</button></div>` });
      m.el.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-keep]')) m.close();
        if (ev.target.closest('[data-yes]')) { TS.bookings.update(b.id, { status: 'cancelled', refund }); m.close(); TS.toast('Booking cancelled. Refund of ' + TS.inr(refund) + ' initiated.', 'ok'); draw(); }
      });
    }
  });
  draw();
})();
