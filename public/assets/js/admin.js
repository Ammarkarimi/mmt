/* TripSaathi admin console – review partner listings, approve them to go live, monitor bookings */
(function () {
  const D = window.TS_DATA;
  const { $, $$, h, esc, icon, d } = TS;
  const app = $('#app');
  const api = (path, opts = {}) => TS.api(path, Object.assign({}, opts, { realm: 'partner' }));
  const me = () => { const u = TS.store.get('ptoken', null) ? TS.store.get('puser', null) : null; return u && u.role === 'admin' ? u : null; };
  const STATUS = { draft: ['Draft', ''], pending_review: ['Pending review', 'amber'], live: ['Live', 'ok'], rejected: ['Rejected', 'red'], suspended: ['Suspended', 'red'] };
  const chip = (s) => `<span class="chip ${STATUS[s][1]}">${STATUS[s][0]}</span>`;
  const when = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '–');
  const fmt12 = (t) => { const [H, M] = String(t).split(':').map(Number); return ((H + 11) % 12) + 1 + ':' + String(M).padStart(2, '0') + ' ' + (H < 12 ? 'AM' : 'PM'); };
  let tab = 'pending_review';
  let search = '';

  const shell = (content) => {
    const u = me();
    app.innerHTML = `<header class="ph-hdr"><div class="container ph-hdr-in">${TS.logo('light')}<span class="ph-badge admin">Admin console</span>
        <nav class="ph-nav">${u ? `<span class="ph-who">${icon('user', 16)} ${esc(u.name)}</span><button type="button" class="ph-out" data-logout>${icon('logout', 18)}<span>Log out</span></button>` : '<a href="partner.html">Partner Hub</a>'}</nav></div></header>
      <main class="container ph-main">${content}</main>`;
    const out = $('[data-logout]', app);
    if (out) out.addEventListener('click', () => { TS.store.del('ptoken'); TS.store.del('puser'); start(); });
    return $('.ph-main', app);
  };

  /* ------------------------------------------------------------ login */
  const login = () => {
    const main = shell(`<div class="ph-narrow box"><h2>TripSaathi staff login</h2><p class="muted">Review partner listings and manage bookings.</p>
      <form id="adm" novalidate><div class="fi"><label for="a_email">Email</label><input id="a_email" name="email" type="email" autocomplete="username"></div><div class="fi"><label for="a_pw">Password</label><input id="a_pw" name="password" type="password" autocomplete="current-password"></div>
      <button class="btn-cta btn-block" type="submit">LOGIN</button></form><p class="tiny" style="text-align:center">Hotel partner? <a href="partner.html#/login">Log in to the Partner Hub</a></p></div>`);
    $('#adm', main).addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('button', e.target);
      btn.disabled = true;
      try {
        const r = await api('/auth/login', { method: 'POST', body: { email: $('#a_email').value.trim(), password: $('#a_pw').value } });
        if (r.user.role !== 'admin') { TS.toast('This account is a partner account. Use the Partner Hub instead.', 'err'); return; }
        TS.store.set('ptoken', r.token);
        TS.store.set('puser', r.user);
        start();
      } catch (err) { TS.toast(err.message, 'err'); } finally { btn.disabled = false; }
    });
  };

  /* ------------------------------------------------------------ console */
  const consoleView = async () => {
    const main = shell(`<div class="kpis" id="stats"><div class="spinner" style="margin:20px auto"></div></div>
      <div class="tabs-line adm-tabs">${[['pending_review', 'Review queue'], ['live', 'Live'], ['rejected', 'Rejected'], ['suspended', 'Suspended'], ['draft', 'Drafts'], ['', 'All properties'], ['bookings', 'Bookings']].map(([k, l]) => `<button type="button" data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="row adm-search"><div class="lp-search">${icon('search', 16)}<input id="q" placeholder="Search…" value="${esc(search)}"></div></div>
      <div id="list"></div>`);
    const loadStats = async () => {
      try {
        const s = await api('/admin/stats');
        const kpi = (l, v, sub = '') => `<div class="kpi"><small>${l}</small><b>${v}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
        $('#stats', main).innerHTML = kpi('Pending review', s.properties.pending_review) + kpi('Live properties', s.properties.live, `${s.properties.draft} drafts`) + kpi('Partners', s.users.partners, `${s.users.customers} customers`) + kpi('Confirmed bookings', s.bookings.confirmed, `${s.bookings.cancelled} cancelled`) + kpi('Gross bookings', TS.inr(s.bookings.gmv), `${TS.inr(s.bookings.discounts)} in coupons`) + kpi('Commission', TS.inr(s.bookings.commission), `${TS.inr(s.bookings.refunds)} refunded`);
      } catch (err) { $('#stats', main).innerHTML = `<p class="muted">${esc(err.message)}</p>`; }
    };
    const list = $('#list', main);
    const loadList = async () => {
      list.innerHTML = '<div class="spinner" style="margin:30px auto"></div>';
      $('#q', main).placeholder = tab === 'bookings' ? 'Booking ID, guest phone or email' : 'Property, city or partner email';
      try {
        if (tab === 'bookings') {
          const r = await api('/admin/bookings?' + TS.qs({ q: search }));
          list.innerHTML = r.bookings.length ? `<div class="tbl-wrap"><table class="tbl ph-tbl"><thead><tr><th>Booking</th><th>Guest</th><th>Property</th><th>Stay</th><th>Total</th><th>Commission</th><th>Status</th><th></th></tr></thead><tbody>${r.bookings.map((b) => `<tr>
              <td><b>${esc(b.id)}</b><br><small class="muted">${when(b.createdAt)}</small></td>
              <td>${esc(b.guest.firstName)} ${esc(b.guest.lastName)}<br><small class="muted">+91 ${esc(b.guest.phone)} · ${esc(b.guest.email)}</small></td>
              <td>${esc(b.property.name)}<br><small class="muted">${esc(b.property.city)} · ${b.rooms} × ${esc(b.room.name)}</small></td>
              <td>${d.short(b.checkIn)} – ${d.short(b.checkOut)}<br><small class="muted">${b.nights} night${b.nights > 1 ? 's' : ''}</small></td>
              <td>${TS.inr(b.price.total)}${b.couponCode ? `<br><small class="muted">${esc(b.couponCode)} –${TS.inr(b.price.discount)}</small>` : ''}</td>
              <td>${TS.inr(b.commission)}</td>
              <td>${{ confirmed: '<span class="chip ok">Confirmed</span>', held: '<span class="chip amber">Held</span>', cancelled: `<span class="chip red">Cancelled</span><br><small class="muted">by ${esc(b.cancelledBy || '')}${b.refundAmount ? ` · refund ${TS.inr(b.refundAmount)}` : ''}</small>`, expired: '<span class="chip">Expired</span>' }[b.status]}</td>
              <td>${['confirmed', 'held'].includes(b.status) && b.stage !== 'completed' ? `<button type="button" class="btn-ghost" data-cancel="${esc(b.id)}">Cancel</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${icon('bag', 40)}<h3>No bookings found</h3></div>`;
        } else {
          const r = await api('/admin/properties?' + TS.qs({ status: tab, q: search }));
          list.innerHTML = r.properties.length ? `<div class="tbl-wrap"><table class="tbl ph-tbl"><thead><tr><th>Property</th><th>Partner</th><th>Status</th><th>Rooms</th><th>${tab === 'pending_review' ? 'Submitted' : 'Updated'}</th><th></th></tr></thead><tbody>${r.properties.map((p) => `<tr>
              <td><b>${esc(p.name)}</b><br><small class="muted">${esc(p.type)} · ${esc([p.locality, p.city].filter(Boolean).join(', '))}</small></td>
              <td>${esc(p.owner.name)}<br><small class="muted">${esc(p.owner.email)}</small></td>
              <td>${chip(p.status)}</td><td>${p.roomTypes}</td><td>${when(tab === 'pending_review' ? p.submittedAt : p.updatedAt)}</td>
              <td><button type="button" class="btn-out" data-open="${esc(p.id)}">${p.status === 'pending_review' ? 'REVIEW' : 'VIEW'}</button></td></tr>`).join('')}</tbody></table></div>`
            : `<div class="empty">${icon('check', 40)}<h3>${tab === 'pending_review' ? 'The review queue is empty' : 'No properties here'}</h3></div>`;
        }
      } catch (err) { list.innerHTML = `<p class="muted">${esc(err.message)}</p>`; }
    };
    let t;
    $('#q', main).addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { search = e.target.value.trim(); loadList(); }, 300); });
    main.addEventListener('click', async (e) => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { tab = tb.dataset.tab; $$('[data-tab]', main).forEach((x) => x.classList.toggle('on', x === tb)); loadList(); return; }
      const op = e.target.closest('[data-open]');
      if (op) { review(op.dataset.open, () => { loadStats(); loadList(); }); return; }
      const c = e.target.closest('[data-cancel]');
      if (c) {
        const reason = prompt('Reason for cancelling (shared with the guest). The guest gets a full refund.');
        if (!reason || !reason.trim()) return;
        try { await api(`/admin/bookings/${c.dataset.cancel}/cancel`, { method: 'POST', body: { reason: reason.trim() } }); TS.toast('Booking cancelled with a full refund', 'ok'); loadStats(); loadList(); } catch (err) { TS.toast(err.message, 'err'); }
      }
    });
    loadStats();
    loadList();
  };

  /* ------------------------------------------------------------ listing review */
  const review = async (id, onChange) => {
    let b;
    try { b = await api(`/admin/properties/${encodeURIComponent(id)}`); } catch (err) { TS.toast(err.message, 'err'); return; }
    const p = b.property;
    const pol = p.policies || {};
    const l = p.legal || {};
    const c = p.contact || {};
    const row = (k, v) => `<div class="adm-kv"><span>${k}</span><b>${v || '<span class="muted">–</span>'}</b></div>`;
    const am = (k) => (D.amenities.find((a) => a.key === k) || { label: k }).label;
    const body = h(`<div class="adm-review">
      <div class="row-between"><div><p class="muted small" style="margin:0">${esc(p.type)} · ${p.stars ? p.stars + '-star · ' : ''}${esc(p.category)}</p><p class="small" style="margin:2px 0 0">Partner: <b>${esc(b.owner.name)}</b> · ${esc(b.owner.email)} · +91 ${esc(b.owner.phone || '')}</p></div>${chip(p.status)}</div>
      ${p.reviewNote ? `<div class="ph-note red">${icon('info', 14)} <span>${esc(p.reviewNote)}</span></div>` : ''}
      <h4>Onboarding checklist</h4><ul class="ph-checklist">${b.checklist.items.map((i) => `<li class="${i.done ? 'ok' : ''}">${icon(i.done ? 'check' : 'x', 16)}<span>${esc(i.label)}</span></li>`).join('')}</ul>
      <h4>About</h4><p class="small">${esc(p.description) || '<span class="muted">No description</span>'}</p>
      ${p.photos.length ? `<div class="ph-photos">${p.photos.map((u) => `<div><img src="${esc(u)}" alt="" loading="lazy"></div>`).join('')}</div>` : ''}
      <div class="adm-cols"><div><h4>Location</h4>${row('Address', esc(p.address))}${row('Locality', esc(p.locality))}${row('City', esc(p.city))}${row('State / PIN', esc([p.state, p.pincode].filter(Boolean).join(' – ')))}${row('Country', esc(p.country))}${row('Landmark', esc(p.landmark))}</div>
        <div><h4>Contact</h4>${row('Manager', esc(c.managerName))}${row('Phone', c.phone ? '+91 ' + esc(c.phone) : '')}${row('Email', esc(c.email))}
          <h4>Legal &amp; bank</h4>${row('Business name', esc(l.legalName))}${row('PAN', esc(l.pan))}${row('GSTIN', esc(l.gstin))}${row('Account', esc([l.accountName, l.accountNumberMasked].filter(Boolean).join(' · ')))}${row('IFSC', esc(l.ifsc))}${row('Agreement', l.agreementAccepted ? 'Accepted' : 'Not accepted')}</div></div>
      <h4>Amenities &amp; rules</h4><p class="small">${p.amenities.map(am).map(esc).join(', ') || '–'}</p>
      <p class="small">Check-in ${fmt12(p.checkInTime)} · Check-out ${fmt12(p.checkOutTime)} · ${esc((pol.cancellation && pol.cancellation.label) || pol.cancellation || '')}${pol.coupleFriendly ? ' · couple friendly' : ''}${pol.payAtHotel ? ' · pay at hotel' : ''}${pol.petsAllowed ? ' · pets allowed' : ''}</p>
      <h4>Rooms &amp; rates</h4>${b.rooms.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Room type</th><th>Rooms</th><th>Price / night</th><th>Occupancy</th><th>Rate plans</th></tr></thead><tbody>${b.rooms.map((r) => `<tr class="${r.active ? '' : 'muted'}"><td><b>${esc(r.name)}</b>${r.active ? '' : ' (hidden)'}<br><small class="muted">${esc([r.bedType, r.view, r.sizeSqft ? r.sizeSqft + ' sq.ft' : ''].filter(Boolean).join(' · '))}</small></td><td>${r.totalRooms}</td><td>${TS.inr(r.basePrice)}${r.weekendPrice ? `<br><small class="muted">Fri/Sat ${TS.inr(r.weekendPrice)}</small>` : ''}</td><td>${r.maxAdults}A + ${r.maxChildren}C (max ${r.maxOccupancy})</td><td>${r.ratePlans.map((rp) => `${esc(rp.name)} ${rp.priceDelta ? `(${rp.priceDelta > 0 ? '+' : '–'}${TS.inr(Math.abs(rp.priceDelta))})` : ''}${rp.refundable ? '' : ' · NR'}`).join('<br>')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">No rooms added</p>'}
      <h4>History</h4><ul class="ph-timeline">${b.events.map((e) => `<li><b>${esc(e.action.replace('_', ' '))}</b> <span class="muted small">${when(e.at)}${e.by ? ' · ' + esc(e.by) : ''}</span>${e.note ? `<p>${esc(e.note)}</p>` : ''}</li>`).join('')}</ul>
      <div class="adm-actions">${{
        pending_review: `<div class="adm-act"><label class="fi" style="margin:0"><span>Commission %</span><input type="number" id="comm" min="0" max="50" value="${p.commissionPct}"></label><button type="button" class="btn-cta" data-approve ${b.checklist.complete ? '' : 'disabled'}>APPROVE &amp; GO LIVE</button></div>
          <div class="adm-act"><textarea id="why" rows="2" placeholder="What should the partner fix? (shared with them)"></textarea><button type="button" class="btn-danger" data-reject>REQUEST CHANGES</button></div>`,
        live: `<div class="adm-act"><textarea id="why" rows="2" placeholder="Reason for suspending (shared with the partner)"></textarea><button type="button" class="btn-danger" data-suspend>SUSPEND LISTING</button></div><a class="btn-out" target="_blank" rel="noopener" href="hotel.html?${TS.qs({ id: p.id, city: p.city, type: p.category === 'homestay' ? 'homestay' : '' })}">VIEW ON SITE</a>`,
        suspended: '<button type="button" class="btn-cta" data-reinstate>REINSTATE LISTING</button>',
      }[p.status] || '<p class="muted small">No actions available – the partner is still working on this listing.</p>'}</div></div>`);
    const m = TS.modal({ title: esc(p.name), body, cls: 'modal-wide' });
    const act = async (path, payload, done) => {
      try { await api(`/admin/properties/${p.id}/${path}`, { method: 'POST', body: payload }); m.close(); TS.toast(done, 'ok'); onChange(); } catch (err) { TS.toast(err.details && err.details.missing ? `${err.message}: ${err.details.missing.join('; ')}` : err.message, 'err'); }
    };
    body.addEventListener('click', (e) => {
      const why = () => ($('#why', body) ? $('#why', body).value.trim() : '');
      if (e.target.closest('[data-approve]')) act('approve', { commissionPct: Number($('#comm', body).value) }, `${p.name} is now live`);
      if (e.target.closest('[data-reject]')) { if (why().length < 10) { TS.toast('Tell the partner what to fix (at least 10 characters)', 'err'); return; } act('reject', { reason: why() }, 'Changes requested from the partner'); }
      if (e.target.closest('[data-suspend]')) { if (!why()) { TS.toast('Add a reason for suspending', 'err'); return; } act('suspend', { reason: why() }, 'Listing suspended'); }
      if (e.target.closest('[data-reinstate]')) act('reinstate', {}, 'Listing is live again');
    });
  };

  const start = () => { if (me()) consoleView(); else login(); };
  start();
})();
