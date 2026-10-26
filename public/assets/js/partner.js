/* TripSaathi Partner Hub – list a property, manage rooms, rates & inventory, and see bookings */
(function () {
  const D = window.TS_DATA;
  const { $, $$, h, esc, icon, d } = TS;
  const app = $('#app');
  const api = (path, opts = {}) => TS.api(path, Object.assign({}, opts, { realm: 'partner' }));
  const me = () => (TS.store.get('ptoken', null) ? TS.store.get('puser', null) : null);
  const fmt12 = (t) => { const [H, M] = String(t || '00:00').split(':').map(Number); return ((H + 11) % 12) + 1 + ':' + String(M).padStart(2, '0') + ' ' + (H < 12 ? 'AM' : 'PM'); };
  const STATUS = { draft: ['Draft', ''], pending_review: ['Under review', 'amber'], live: ['Live', 'ok'], rejected: ['Changes needed', 'red'], suspended: ['Suspended', 'red'] };
  const chip = (s) => `<span class="chip ${STATUS[s][1]}">${STATUS[s][0]}</span>`;
  const seedOf = (id) => TS.hash(id) % 100000;
  const art = (p) => (p.photos && p.photos[0] ? `<img src="${esc(p.photos[0])}" alt="" loading="lazy">` : TS.scene(p.scene || 'city', seedOf(p.id)));
  let meta = null;
  const loadMeta = async () => meta || (meta = await api('/meta'));

  /* ================================================================ chrome */
  const render = (content) => {
    const u = me();
    app.innerHTML = `<header class="ph-hdr"><div class="container ph-hdr-in">${TS.logo('light')}<a class="ph-badge" href="#/">Partner Hub</a>
        <nav class="ph-nav">${u
          ? `<a href="#/dashboard">${icon('briefcase', 18)}<span>Dashboard</span></a><a href="#/bookings">${icon('bag', 18)}<span>Bookings</span></a><a href="#/property/new" class="btn-cta ph-add">${icon('plus', 16)}<span>Add property</span></a><button type="button" class="ph-out" data-logout title="Log out">${icon('logout', 18)}<span>Log out</span></button>`
          : `<a href="index.html">${icon('arrowL', 16)}<span>TripSaathi.com</span></a><a href="#/login" class="btn-out">LOGIN</a>`}</nav></div></header>
      <main class="container ph-main">${content}</main>
      <footer class="ph-ftr"><div class="container">© ${new Date().getFullYear()} ${TS.brand.legal} · Partner support: partners@tripsaathi.example · <a href="index.html">Go to TripSaathi.com</a></div></footer>`;
    const out = $('[data-logout]', app);
    if (out) out.addEventListener('click', () => { TS.store.del('ptoken'); TS.store.del('puser'); TS.toast('You have been logged out'); location.hash = '#/'; });
    window.scrollTo(0, 0);
    return $('.ph-main', app);
  };
  const loading = (msg) => `<div class="box skel-box"><div class="spinner"></div><p class="muted">${esc(msg)}</p></div>`;

  /* ================================================================ form helpers */
  const fi = (name, label, value = '', { type = 'text', attrs = '', hint = '', full = false } = {}) =>
    `<div class="fi${full ? ' full' : ''}"><label for="f_${name}">${label}</label><input id="f_${name}" name="${name}" type="${type}" value="${esc(value == null ? '' : value)}" ${attrs}>${hint ? `<small class="hint">${hint}</small>` : ''}</div>`;
  const sel = (name, label, options, value, { full = false, attrs = '' } = {}) =>
    `<div class="fi${full ? ' full' : ''}"><label for="f_${name}">${label}</label><select id="f_${name}" name="${name}" ${attrs}>${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  const tick = (name, label, checked, value = 'on') => `<label class="fchk"><input type="checkbox" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;

  /** Read a form into an object. "a.b" names nest, data-type="int|list|lines" converts values. */
  const readForm = (form) => {
    const out = {};
    const set = (name, v) => {
      const path = name.split('.');
      let o = out;
      path.slice(0, -1).forEach((k) => { o = o[k] = o[k] || {}; });
      o[path[path.length - 1]] = v;
    };
    const lists = {};
    $$('[name]', form).forEach((el) => {
      const t = el.dataset.type;
      if (el.type === 'radio') { if (el.checked) set(el.name, el.value); return; }
      if (el.type === 'checkbox') {
        if (t === 'list') { lists[el.name] = lists[el.name] || []; if (el.checked) lists[el.name].push(el.value); } else set(el.name, el.checked);
        return;
      }
      const v = el.value.trim();
      if (t === 'int') set(el.name, v === '' ? null : Number(v));
      else if (t === 'lines') set(el.name, v.split('\n').map((x) => x.trim()).filter(Boolean));
      else if (t === 'skip-empty') { if (v) set(el.name, v); }
      else set(el.name, v);
    });
    Object.entries(lists).forEach(([k, v]) => set(k, v));
    return out;
  };

  /** Highlight the fields named in a 400 response and show its message. */
  const showErrors = (form, err) => {
    $$('.fi.err', form).forEach((x) => x.classList.remove('err'));
    if (err.details && typeof err.details === 'object' && !Array.isArray(err.details)) {
      Object.entries(err.details).forEach(([k, msg]) => {
        let el = form.querySelector(`[name="${k}"]`);
        if (!el && typeof msg === 'string') el = form.querySelector(`[name="${k}.${msg.split(' ')[0]}"]`);
        if (el && el.closest('.fi')) el.closest('.fi').classList.add('err');
      });
      const first = $('.fi.err', form);
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    TS.toast(err.message, 'err');
  };

  const busy = async (btn, label, fn) => {
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = label;
    try { return await fn(); } finally { btn.disabled = false; btn.textContent = old; }
  };

  /* ================================================================ landing & auth */
  const landing = async () => {
    if (me()) { location.hash = '#/dashboard'; return; }
    const main = render(`<section class="ph-hero">
        <div><span class="ph-kicker">For hotels, homestays &amp; villas</span><h1>List your property on TripSaathi</h1>
          <p>Put your rooms in front of travellers who plan and book their stays on TripSaathi. Listing is free – you pay a commission only on confirmed stays.</p>
          <div class="row ph-cta"><a class="btn-cta" href="#/signup">GET STARTED – IT'S FREE</a><a class="btn-out" href="#/login">PARTNER LOGIN</a></div>
          <div id="demoCreds"></div></div>
        <div class="ph-hero-art">${TS.scene('beach', 11)}</div></section>
      <section class="ph-sec"><h2>How it works</h2><div class="ph-steps">${[
        ['user', 'Create your account', 'Sign up with your work email in under a minute.'],
        ['hotel', 'Add property, rooms & prices', 'Describe your property, add room types, meal plans and nightly rates.'],
        ['shield', 'Get verified', 'Our team checks your details and bank account, usually within 48 hours.'],
        ['trophy', 'Go live & get bookings', 'Manage rates and availability from the calendar and see every booking.'],
      ].map(([ic, t, s], i) => `<div class="ph-step"><span class="ph-step-n">${i + 1}</span>${icon(ic, 28)}<b>${t}</b><p>${s}</p></div>`).join('')}</div></section>
      <section class="ph-sec"><h2>Why partner with TripSaathi</h2><div class="ph-why">${[
        ['tag', 'No listing fee', 'Commission is charged only on room revenue from confirmed stays.'],
        ['calendar', 'You control rates & inventory', 'Set weekend prices, close dates and change room counts any time.'],
        ['wallet', 'Clear payouts', 'Every booking shows the guest price, commission and your payout.'],
        ['headset', 'Partner support', 'A dedicated team to help with onboarding and guest issues.'],
      ].map(([ic, t, s]) => `<div class="ph-why-i">${icon(ic, 24)}<div><b>${t}</b><p>${s}</p></div></div>`).join('')}</div></section>`);
    const health = await api('/health').catch(() => null);
    if (health && health.ephemeral && $('#demoCreds', main)) {
      $('#demoCreds', main).innerHTML = `<div class="ph-demo">${icon('info', 16)}<span><b>Demo accounts</b> – partner: <code>partner@tripsaathi.dev</code> / <code>partner123</code> · admin: <code>admin@tripsaathi.dev</code> / <code>admin123</code> (<a href="admin.html">admin console</a>). The demo database resets from time to time.</span></div>`;
    }
  };

  const authView = (mode) => {
    if (me()) { location.hash = '#/dashboard'; return; }
    const signup = mode === 'signup';
    const main = render(`<div class="ph-narrow box"><h2>${signup ? 'Create your partner account' : 'Partner login'}</h2><p class="muted">${signup ? 'You can add your property right after signing up.' : 'Manage your properties, rates and bookings.'}</p>
      <form id="authForm" novalidate>
        ${signup ? fi('name', 'Your full name', '', { attrs: 'autocomplete="name" maxlength="80"' }) + fi('phone', 'Mobile number', '', { type: 'tel', attrs: 'autocomplete="tel-national" maxlength="10" inputmode="numeric"' }) : ''}
        ${fi('email', 'Work email', '', { type: 'email', attrs: 'autocomplete="email"' })}
        ${fi('password', 'Password', '', { type: 'password', attrs: `autocomplete="${signup ? 'new-password' : 'current-password'}"`, hint: signup ? 'At least 8 characters with a letter and a number' : '' })}
        <button class="btn-cta btn-block" type="submit">${signup ? 'CREATE ACCOUNT' : 'LOGIN'}</button>
      </form>
      <p class="small" style="text-align:center;margin:14px 0 0">${signup ? 'Already registered? <a href="#/login">Log in</a>' : 'New to TripSaathi? <a href="#/signup">Create a partner account</a>'}</p>
      <p class="tiny" style="text-align:center">TripSaathi staff? <a href="admin.html">Open the admin console</a></p></div>`);
    const form = $('#authForm', main);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      busy($('button[type=submit]', form), 'PLEASE WAIT…', async () => {
        try {
          const r = await api(signup ? '/auth/partner/signup' : '/auth/login', { method: 'POST', body: readForm(form) });
          TS.store.set('ptoken', r.token);
          TS.store.set('puser', r.user);
          if (r.user.role === 'admin') { location.href = 'admin.html'; return; }
          TS.toast(signup ? 'Welcome to TripSaathi! Let’s add your property.' : `Welcome back, ${r.user.name.split(' ')[0]}`, 'ok');
          location.hash = signup ? '#/property/new' : '#/dashboard';
        } catch (err) { showErrors(form, err); }
      });
    });
  };

  /* ================================================================ dashboard */
  const stageChip = (b) => ({ upcoming: '<span class="chip ok">Upcoming</span>', in_house: '<span class="chip blue">In-house</span>', completed: '<span class="chip">Completed</span>', cancelled: '<span class="chip red">Cancelled</span>', held: '<span class="chip amber">Awaiting payment</span>', expired: '<span class="chip">Expired</span>' })[b.stage] || '';
  const bookingTable = (list) => `<div class="tbl-wrap"><table class="tbl ph-tbl"><thead><tr><th>Booking</th><th>Guest</th><th>Property &amp; room</th><th>Stay</th><th>Guest paid</th><th>Your payout</th><th>Status</th></tr></thead><tbody>${list.map((b) => `<tr>
      <td><b>${esc(b.id)}</b><br><small class="muted">Booked ${d.short(b.createdAt.slice(0, 10))}</small></td>
      <td>${esc(b.guest.firstName)} ${esc(b.guest.lastName)}<br><small class="muted">+91 ${esc(b.guest.phone)}</small></td>
      <td>${esc(b.property.name)}<br><small class="muted">${b.rooms} × ${esc(b.room.name)} · ${esc(b.plan.name)}</small></td>
      <td>${d.short(b.checkIn)} – ${d.short(b.checkOut)}<br><small class="muted">${b.nights}N · ${b.adults} adult${b.adults > 1 ? 's' : ''}${b.children ? `, ${b.children} child` : ''}</small></td>
      <td>${TS.inr(b.price.total)}${b.price.discount ? `<br><small class="muted">coupon ${TS.inr(b.price.discount)} (TripSaathi-funded)</small>` : ''}</td>
      <td><b>${TS.inr(b.status === 'cancelled' ? 0 : b.payout)}</b><br><small class="muted">${b.commissionPct}% commission</small></td>
      <td>${stageChip(b)}${b.specialRequests ? `<br><small class="muted" title="${esc(b.specialRequests)}">${icon('info', 12)} ${esc(b.specialRequests.slice(0, 40))}</small>` : ''}</td></tr>`).join('')}</tbody></table></div>`;

  const propCard = (p) => `<article class="ph-prop">
      <div class="ph-prop-img">${art(p)}</div>
      <div class="ph-prop-b"><div class="row-between"><h3>${esc(p.name)}</h3>${chip(p.status)}</div>
        <p class="muted small">${esc(p.type)} · ${esc([p.locality, p.city].filter(Boolean).join(', ') || 'Location not added yet')}</p>
        <p class="small">${p.roomTypes} room type${p.roomTypes === 1 ? '' : 's'} · ${p.rooms} rooms · ${p.upcomingBookings} upcoming booking${p.upcomingBookings === 1 ? '' : 's'}</p>
        ${p.status === 'rejected' && p.reviewNote ? `<div class="ph-note red">${icon('info', 14)} <span><b>Changes requested:</b> ${esc(p.reviewNote)}</span></div>` : ''}
        ${p.status === 'suspended' && p.reviewNote ? `<div class="ph-note red">${icon('info', 14)} <span><b>Suspended:</b> ${esc(p.reviewNote)}</span></div>` : ''}
        ${p.status === 'pending_review' ? `<div class="ph-note">${icon('clock', 14)} <span>Our team is reviewing your listing – usually within 48 hours.</span></div>` : ''}
        <div class="row ph-prop-act"><a class="btn-out" href="#/property/${esc(p.id)}">${['draft', 'rejected'].includes(p.status) ? 'CONTINUE SETUP' : 'EDIT LISTING'}</a>${p.roomTypes ? `<a class="btn-out" href="#/calendar/${esc(p.id)}">RATES &amp; INVENTORY</a>` : ''}${p.status === 'live' ? `<a class="link-btn" href="hotel.html?${TS.qs({ id: p.id, city: p.city, type: p.category === 'homestay' ? 'homestay' : '' })}" target="_blank" rel="noopener">View on TripSaathi ${icon('arrowR', 14)}</a>` : ''}</div></div></article>`;

  const dashboard = async () => {
    render(loading('Loading your dashboard…'));
    const r = await api('/partner/dashboard');
    const t = r.totals;
    const live = r.properties.filter((p) => p.status === 'live').length;
    const kpi = (label, value, sub = '') => `<div class="kpi"><small>${label}</small><b>${value}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
    render(`<div class="res-h"><div><h1>Namaste, ${esc(me().name.split(' ')[0])}</h1><p>Here's how your properties are doing.</p></div><a class="btn-cta" href="#/property/new">${icon('plus', 16)} ADD A PROPERTY</a></div>
      <div class="kpis">${kpi('Live properties', `${live} <small>of ${r.properties.length}</small>`)}${kpi('Upcoming stays', TS.num(t.upcoming))}${kpi('Room revenue', TS.inr(t.gross), `${TS.num(t.room_nights)} room nights`)}${kpi('Your payout', TS.inr(t.payout), `after ${TS.inr(t.commission)} commission`)}${kpi('Occupancy', `${t.occupancyNext30}%`, 'next 30 days')}</div>
      <section class="ph-sec"><h2>Your properties</h2>${r.properties.length ? `<div class="ph-props">${r.properties.map(propCard).join('')}</div>` : `<div class="empty">${icon('property', 40)}<h3>You haven't added a property yet</h3><p class="muted">It takes about 10 minutes to list a property with its rooms and prices.</p><a class="btn-cta" href="#/property/new">LIST YOUR FIRST PROPERTY</a></div>`}</section>
      <section class="ph-sec"><div class="row-between"><h2>Upcoming arrivals</h2><a href="#/bookings" class="link-btn">All bookings ${icon('chevR', 14)}</a></div>${r.arrivals.length ? bookingTable(r.arrivals) : '<p class="muted">No upcoming arrivals yet. Bookings appear here as soon as guests pay.</p>'}</section>`);
  };

  /* ================================================================ create property */
  const cityOptions = (current) => {
    const names = D.hotelCities.map((c) => c.name);
    if (current && !names.includes(current)) names.unshift(current);
    return names.map((n) => [n, n]);
  };

  const newProperty = async () => {
    await loadMeta();
    const main = render(`<div class="ph-narrow box"><h2>Add a new property</h2><p class="muted">Start with the basics – you'll fill in rooms, prices and documents step by step.</p>
      <form id="npForm" novalidate>
        ${fi('name', 'Property name', '', { attrs: 'maxlength="120" placeholder="e.g. Seabreeze Courtyard"' })}
        <div class="fi"><label>What are you listing?</label><div class="ph-cat">${[['hotel', 'Hotel, resort or guest house', 'hotel'], ['homestay', 'Homestay, villa or apartment', 'villa']].map(([k, l, ic], i) => `<label class="ph-opt"><input type="radio" name="category" value="${k}" ${i ? '' : 'checked'}><span>${icon(ic, 26)}<b>${l}</b></span></label>`).join('')}</div></div>
        <div class="form-grid g2"><div class="fi"><label for="f_propertyType">Property type</label><select id="f_propertyType" name="propertyType"></select></div>${sel('city', 'City', cityOptions(''), 'Goa')}</div>
        <button class="btn-cta btn-block" type="submit" style="margin-top:16px">CREATE &amp; CONTINUE</button>
      </form></div>`);
    const form = $('#npForm', main);
    const types = () => { const cat = $('[name=category]:checked', form).value; $('#f_propertyType', form).innerHTML = meta.propertyTypes[cat].map((t) => `<option>${esc(t)}</option>`).join(''); };
    types();
    $$('[name=category]', form).forEach((r) => r.addEventListener('change', types));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const body = readForm(form);
      const c = TS.hotelCity(body.city);
      if (c) Object.assign(body, { country: c.country, scene: c.kind });
      busy($('button[type=submit]', form), 'CREATING…', async () => {
        try {
          const r = await api('/partner/properties', { method: 'POST', body });
          TS.toast('Property created – let’s add the details', 'ok');
          location.hash = `#/property/${r.property.id}/basics`;
        } catch (err) { showErrors(form, err); }
      });
    });
  };

  /* ================================================================ property editor */
  const STEPS = [
    ['basics', 'Basic info', ['basics']],
    ['location', 'Location', ['location']],
    ['amenities', 'Amenities & rules', ['amenities', 'policies']],
    ['photos', 'Photos', []],
    ['rooms', 'Rooms & rates', ['rooms']],
    ['finance', 'Contact, legal & bank', ['contact', 'legal', 'bank', 'agreement']],
    ['review', 'Review & submit', []],
  ];
  const STEP_OF = { basics: 'basics', location: 'location', amenities: 'amenities', policies: 'amenities', rooms: 'rooms', contact: 'finance', legal: 'finance', bank: 'finance', agreement: 'finance' };
  const nextStep = (step) => STEPS[Math.min(STEPS.length - 1, STEPS.findIndex((s) => s[0] === step) + 1)][0];

  const statusBanner = (p) => ({
    draft: '',
    pending_review: `<div class="ph-banner amber">${icon('clock', 18)}<span><b>Under review.</b> Our team is verifying your listing. You can keep improving it while you wait.</span></div>`,
    live: `<div class="ph-banner ok">${icon('check', 18)}<span><b>Live on TripSaathi.</b> Changes you save show on the website straight away.</span></div>`,
    rejected: `<div class="ph-banner red">${icon('info', 18)}<span><b>Changes requested:</b> ${esc(p.reviewNote || 'Please review your details.')} Update the listing and submit it again.</span></div>`,
    suspended: `<div class="ph-banner red">${icon('lock', 18)}<span><b>Suspended:</b> ${esc(p.reviewNote || '')} Contact partner support to reactivate this listing.</span></div>`,
  })[p.status];

  const formFoot = (label = 'SAVE & CONTINUE') => `<div class="ph-form-foot"><button class="btn-cta" type="submit">${label}</button></div>`;

  const stepViews = {
    basics: (b) => {
      const p = b.property;
      return `<h3>Basic information</h3><form data-save novalidate><div class="form-grid g2">
        ${fi('name', 'Property name', p.name, { full: true, attrs: 'maxlength="120"' })}
        ${sel('category', 'Listing category', [['hotel', 'Hotel / resort'], ['homestay', 'Homestay / villa']], p.category)}
        <div class="fi"><label for="f_propertyType">Property type</label><select id="f_propertyType" name="propertyType">${meta.propertyTypes[p.category].map((t) => `<option ${t === p.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
        ${sel('starRating', 'Star rating', [[0, 'Not rated'], [1, '1 star'], [2, '2 star'], [3, '3 star'], [4, '4 star'], [5, '5 star']], p.stars, { attrs: 'data-type="int"' })}
        ${sel('scene', 'Setting (used for artwork until you add photos)', meta.scenes.map((s) => [s, s[0].toUpperCase() + s.slice(1)]), p.scene)}
        <div class="fi full"><label for="f_description">Description</label><textarea id="f_description" name="description" rows="7" maxlength="4000" placeholder="What makes your property special? Mention the rooms, food, views and what's nearby.">${esc(p.description)}</textarea><small class="hint"><span data-count>${p.description.length}</span> characters · at least 50 needed</small></div>
      </div>${formFoot()}</form>`;
    },
    location: (b) => {
      const p = b.property;
      const c = TS.hotelCity(p.city);
      return `<h3>Location</h3><p class="muted small">Guests see the full address after booking. Search uses the city, so choose it carefully.</p><form data-save novalidate><div class="form-grid g2">
        ${fi('address', 'Street address', p.address, { full: true, attrs: 'maxlength="300" placeholder="Building, street"' })}
        ${sel('city', 'City', cityOptions(p.city), p.city)}
        <div class="fi"><label for="f_locality">Locality / area</label><input id="f_locality" name="locality" value="${esc(p.locality)}" list="localities" maxlength="80"><datalist id="localities">${(c ? c.localities : []).map((l) => `<option value="${esc(l)}">`).join('')}</datalist></div>
        ${fi('state', 'State', p.state, { attrs: 'maxlength="80"' })}
        ${fi('pincode', 'PIN code', p.pincode, { attrs: 'maxlength="12" inputmode="numeric"' })}
        ${fi('country', 'Country', p.country || 'India', { attrs: 'maxlength="80"' })}
        ${fi('landmark', 'Nearby landmark', p.landmark, { attrs: 'maxlength="160" placeholder="e.g. 600 m from Candolim Beach"' })}
        ${fi('latitude', 'Latitude (optional)', p.location ? p.location.lat : '', { attrs: 'data-type="int" inputmode="decimal"' })}
        ${fi('longitude', 'Longitude (optional)', p.location ? p.location.lon : '', { attrs: 'data-type="int" inputmode="decimal"' })}
      </div>${formFoot()}</form>`;
    },
    amenities: (b) => {
      const p = b.property;
      const pol = p.policies || {};
      return `<form data-save novalidate><h3>Amenities</h3><div class="ph-checks">${D.amenities.map((a) => `<label class="ph-check"><input type="checkbox" name="amenities" data-type="list" value="${a.key}" ${p.amenities.includes(a.key) ? 'checked' : ''}><span>${icon(a.icon, 18)} ${a.label}</span></label>`).join('')}</div>
        <h3>Check-in &amp; check-out</h3><div class="form-grid g2">${fi('checkInTime', 'Check-in from', p.checkInTime, { type: 'time' })}${fi('checkOutTime', 'Check-out by', p.checkOutTime, { type: 'time' })}</div>
        <h3>Cancellation policy</h3><p class="muted small">Applies to refundable rate plans. Non-refundable plans are always non-refundable.</p><div class="ph-radios">${meta.cancellationPolicies.map((c) => `<label class="ph-radio"><input type="radio" name="policies.cancellation" value="${c.key}" ${pol.cancellation === c.key ? 'checked' : ''}><span><b>${esc(c.label)}</b><small>${esc(c.after)}</small></span></label>`).join('')}</div>
        <h3>House rules</h3><div class="ph-checks">${tick('policies.coupleFriendly', 'Unmarried couples welcome', pol.coupleFriendly)}${tick('policies.localIdsAllowed', 'Local IDs accepted', pol.localIdsAllowed)}${tick('policies.payAtHotel', 'Pay at hotel available', pol.payAtHotel)}${tick('policies.petsAllowed', 'Pets allowed', pol.petsAllowed)}${tick('policies.smokingAllowed', 'Smoking allowed in designated areas', pol.smokingAllowed)}</div>
        <div class="fi" style="margin-top:12px"><label for="f_rules">Other rules (one per line)</label><textarea id="f_rules" name="policies.extraRules" data-type="lines" rows="3" placeholder="e.g. Quiet hours after 10 PM">${esc((pol.extraRules || []).join('\n'))}</textarea></div>
        ${formFoot()}</form>`;
    },
    photos: (b) => {
      const p = b.property;
      return `<h3>Photos</h3><p class="muted small">Paste links to your photos (https), one per line – the first one is your cover photo. Until you add photos, travellers see illustrated artwork for your listing.</p>
        <form data-save novalidate><div class="fi"><label for="f_photos">Photo links</label><textarea id="f_photos" name="photos" data-type="lines" rows="6" placeholder="https://example.com/front.jpg">${esc(p.photos.join('\n'))}</textarea></div>
        <div class="ph-photos">${p.photos.length ? p.photos.map((u) => `<div><img src="${esc(u)}" alt="" loading="lazy"></div>`).join('') : `<div>${TS.scene(p.scene, seedOf(p.id))}<small>Preview without photos</small></div>`}</div>${formFoot()}</form>`;
    },
    rooms: (b) => {
      const rooms = b.rooms.filter((r) => r.active);
      return `<div class="row-between"><h3>Rooms &amp; rates</h3><button type="button" class="btn-cta" data-room-add>${icon('plus', 16)} ADD ROOM TYPE</button></div>
        <p class="muted small">Add each kind of room you sell (e.g. Standard, Deluxe, Suite) with how many you have and the price per night. Rate plans add options like breakfast on top of the room price.</p>
        ${rooms.length ? rooms.map((r) => `<div class="ph-room"><div><h4>${esc(r.name)}</h4>
            <p class="small muted">${[r.bedType, r.sizeSqft ? r.sizeSqft + ' sq.ft' : '', r.view, `sleeps ${r.maxOccupancy} (max ${r.maxAdults} adults)`].filter(Boolean).map(esc).join(' · ')}</p>
            <p class="small"><b>${r.totalRooms}</b> rooms · <b>${TS.inr(r.basePrice)}</b>/night${r.weekendPrice ? ` · ${TS.inr(r.weekendPrice)} on Fri &amp; Sat` : ''}${r.extraAdultPrice ? ` · extra adult ${TS.inr(r.extraAdultPrice)}` : ''}</p>
            <div class="ph-plans">${r.ratePlans.map((rp) => `<span class="chip ${rp.refundable ? 'blue' : ''}">${esc(rp.name)} · ${rp.priceDelta ? (rp.priceDelta > 0 ? '+' : '–') + TS.inr(Math.abs(rp.priceDelta)) : 'base price'}${rp.refundable ? '' : ' · non-refundable'}</span>`).join('')}</div></div>
            <div class="ph-room-act"><button type="button" class="btn-out" data-room-edit="${esc(r.id)}">EDIT</button><button type="button" class="btn-ghost" data-room-del="${esc(r.id)}">REMOVE</button></div></div>`).join('')
          : `<div class="empty" style="box-shadow:none;border:1px dashed var(--line-2)">${icon('hotel', 36)}<h3>No rooms yet</h3><p class="muted">Add at least one room type to go live.</p></div>`}
        <div class="ph-form-foot"><a class="btn-cta" href="#/property/${esc(b.property.id)}/finance">CONTINUE</a></div>`;
    },
    finance: (b) => {
      const p = b.property;
      const c = p.contact || {};
      const l = p.legal || {};
      return `<form data-save novalidate><h3>Property contact</h3><p class="muted small">Shared with guests after they book.</p><div class="form-grid g2">
          ${fi('contact.managerName', 'Manager name', c.managerName, { attrs: 'maxlength="80"' })}${fi('contact.phone', 'Front desk mobile', c.phone, { type: 'tel', attrs: 'maxlength="10" inputmode="numeric"' })}${fi('contact.email', 'Reservations email', c.email, { type: 'email' })}</div>
        <h3>Legal entity</h3><div class="form-grid g2">
          ${fi('legal.legalName', 'Registered business name', l.legalName, { full: true, attrs: 'maxlength="160"' })}${fi('legal.pan', 'PAN', l.pan, { attrs: 'maxlength="10" style="text-transform:uppercase" placeholder="ABCDE1234F"' })}${fi('legal.gstin', 'GSTIN (optional)', l.gstin, { attrs: 'maxlength="15" style="text-transform:uppercase"' })}</div>
        <h3>Bank account for payouts</h3><div class="form-grid g2">
          ${fi('legal.accountName', 'Account holder name', l.accountName, { full: true, attrs: 'maxlength="160"' })}
          <div class="fi"><label for="f_acc">Account number</label><input id="f_acc" name="legal.accountNumber" data-type="skip-empty" inputmode="numeric" maxlength="18" placeholder="${l.accountNumberMasked ? 'Saved: ' + esc(l.accountNumberMasked) : '9–18 digits'}" autocomplete="off">${l.accountNumberMasked ? '<small class="hint">Leave blank to keep the saved account</small>' : ''}</div>
          ${fi('legal.ifsc', 'IFSC', l.ifsc, { attrs: 'maxlength="11" style="text-transform:uppercase" placeholder="SBIN0001234"' })}</div>
        <label class="fchk ph-agree"><input type="checkbox" name="legal.agreementAccepted" ${l.agreementAccepted ? 'checked' : ''}><span>I confirm these details are correct and accept the TripSaathi partner agreement: a ${p.commissionPct}% commission on room revenue from confirmed stays, with payouts to the account above.</span></label>
        ${formFoot()}</form>`;
    },
    review: (b) => {
      const p = b.property;
      const cl = b.checklist;
      const canSubmit = ['draft', 'rejected'].includes(p.status);
      return `<h3>Review &amp; submit</h3>
        <ul class="ph-checklist">${cl.items.map((i) => `<li class="${i.done ? 'ok' : ''}">${icon(i.done ? 'check' : 'x', 16)}<span>${esc(i.label)}</span>${i.done ? '' : `<a href="#/property/${esc(p.id)}/${STEP_OF[i.key]}">Fix</a>`}</li>`).join('')}</ul>
        ${canSubmit ? `<div class="ph-submit"><button type="button" class="btn-cta" data-submit ${cl.complete ? '' : 'disabled'}>SUBMIT FOR REVIEW</button><span class="small muted">${cl.complete ? 'Our team will verify your listing, usually within 48 hours.' : 'Complete the steps above to submit.'}</span></div>` : ''}
        ${p.status === 'live' ? `<div class="row" style="margin:14px 0"><a class="btn-out" href="hotel.html?${TS.qs({ id: p.id, city: p.city, type: p.category === 'homestay' ? 'homestay' : '' })}" target="_blank" rel="noopener">VIEW ON TRIPSAATHI</a><a class="btn-out" href="#/calendar/${esc(p.id)}">RATES &amp; INVENTORY</a></div>` : ''}
        <h3 style="margin-top:20px">History</h3><ul class="ph-timeline">${b.events.map((e) => `<li><b>${esc(e.action.replace('_', ' '))}</b> <span class="muted small">${new Date(e.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}${e.by ? ' · ' + esc(e.by) : ''}</span>${e.note ? `<p>${esc(e.note)}</p>` : ''}</li>`).join('')}</ul>
        ${canSubmit ? '<div class="ph-danger"><button type="button" class="btn-ghost" data-delete>Delete this listing</button></div>' : ''}`;
    },
  };

  // Turn the raw form into the API payload for each step.
  const shape = {
    location: (v) => Object.assign(v, { latitude: v.latitude === '' ? null : v.latitude, longitude: v.longitude === '' ? null : v.longitude }),
    finance: (v) => { if (v.legal) { v.legal.pan = (v.legal.pan || '').toUpperCase(); v.legal.gstin = (v.legal.gstin || '').toUpperCase(); v.legal.ifsc = (v.legal.ifsc || '').toUpperCase(); } return v; },
  };

  const editor = async (id, step = 'basics') => {
    if (!stepViews[step]) { location.hash = `#/property/${id}/basics`; return; }
    render(loading('Loading your property…'));
    await loadMeta();
    const b = await api(`/partner/properties/${encodeURIComponent(id)}`);
    const p = b.property;
    const done = (keys) => keys.length > 0 && keys.every((k) => (b.checklist.items.find((i) => i.key === k) || {}).done);
    const main = render(`<div class="crumbs"><a href="#/dashboard">Dashboard</a> › ${esc(p.name)}</div>
      <div class="ph-ed-h"><div><h1>${esc(p.name)}</h1><p class="muted">${esc(p.type)}${p.city ? ' · ' + esc(p.city) : ''} ${chip(p.status)}</p></div>
        <div class="ph-progress"><span><b>${b.checklist.done}/${b.checklist.total}</b> onboarding steps complete</span><div class="bar"><i style="width:${Math.round((b.checklist.done / b.checklist.total) * 100)}%"></i></div></div></div>
      ${statusBanner(p)}
      <div class="ph-ed"><nav class="ph-stepper" aria-label="Listing steps">${STEPS.map(([k, l, keys], i) => `<a href="#/property/${esc(p.id)}/${k}" class="${k === step ? 'on' : ''} ${done(keys) ? 'done' : ''}"><i>${done(keys) ? icon('check', 13) : i + 1}</i><span>${l}</span></a>`).join('')}</nav>
      <section class="box ph-form">${stepViews[step](b)}</section></div>`);
    wireStep(main, b, step);
  };

  const wireStep = (main, b, step) => {
    const p = b.property;
    const form = $('form[data-save]', main);
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        let body = readForm(form);
        if (shape[step]) body = shape[step](body);
        busy($('button[type=submit]', form), 'SAVING…', async () => {
          try {
            await api(`/partner/properties/${p.id}`, { method: 'PATCH', body });
            TS.toast('Saved', 'ok');
            location.hash = `#/property/${p.id}/${nextStep(step)}`;
          } catch (err) { showErrors(form, err); }
        });
      });
      form.addEventListener('input', (e) => { const f = e.target.closest('.fi'); if (f) f.classList.remove('err'); if (e.target.name === 'description') $('[data-count]', form).textContent = e.target.value.trim().length; });
    }
    if (step === 'basics') {
      $('[name=category]', form).addEventListener('change', (e) => { $('[name=propertyType]', form).innerHTML = meta.propertyTypes[e.target.value].map((t) => `<option>${esc(t)}</option>`).join(''); });
    }
    if (step === 'location') {
      $('[name=city]', form).addEventListener('change', (e) => {
        const c = TS.hotelCity(e.target.value);
        if (!c) return;
        $('#localities', form).innerHTML = c.localities.map((l) => `<option value="${esc(l)}">`).join('');
        $('[name=country]', form).value = c.country;
      });
    }
    if (step === 'rooms') {
      main.addEventListener('click', async (e) => {
        if (e.target.closest('[data-room-add]')) { roomModal(p, null); return; }
        const ed = e.target.closest('[data-room-edit]');
        if (ed) { roomModal(p, b.rooms.find((r) => r.id === ed.dataset.roomEdit)); return; }
        const del = e.target.closest('[data-room-del]');
        if (del) {
          const r = b.rooms.find((x) => x.id === del.dataset.roomDel);
          if (!confirm(`Remove "${r.name}"? Rooms with past bookings are hidden instead of deleted.`)) return;
          try { await api(`/partner/rooms/${r.id}`, { method: 'DELETE' }); TS.toast('Room type removed', 'ok'); editor(p.id, 'rooms'); } catch (err) { TS.toast(err.message, 'err'); }
        }
      });
    }
    if (step === 'review') {
      main.addEventListener('click', async (e) => {
        const s = e.target.closest('[data-submit]');
        if (s && !s.disabled) {
          busy(s, 'SUBMITTING…', async () => {
            try { await api(`/partner/properties/${p.id}/submit`, { method: 'POST' }); TS.toast('Submitted! We’ll review your listing shortly.', 'ok'); editor(p.id, 'review'); } catch (err) { TS.toast(err.details && err.details.missing ? `${err.message}: ${err.details.missing.join('; ')}` : err.message, 'err'); }
          });
          return;
        }
        if (e.target.closest('[data-delete]')) {
          if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
          try { await api(`/partner/properties/${p.id}`, { method: 'DELETE' }); TS.toast('Listing deleted', 'ok'); location.hash = '#/dashboard'; } catch (err) { TS.toast(err.message, 'err'); }
        }
      });
    }
  };

  /* ---------------------------------------------------------------- room type modal */
  const planRow = (rp = {}) => `<div class="ph-plan-row"><input type="hidden" data-k="id" value="${esc(rp.id || '')}">
      <div class="fi"><label>Plan name</label><input data-k="name" value="${esc(rp.name || '')}" maxlength="60" placeholder="e.g. Room with Breakfast"></div>
      <div class="fi"><label>Meals</label><select data-k="mealPlan">${meta.mealPlans.map((m) => `<option value="${m.key}" ${(rp.mealPlan || 'EP') === m.key ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select></div>
      <div class="fi"><label>Price change / night (₹)</label><input data-k="priceDelta" type="number" step="10" value="${rp.priceDelta || 0}"></div>
      <label class="fchk"><input type="checkbox" data-k="refundable" ${rp.refundable === false ? '' : 'checked'}><span>Refundable</span></label>
      <button type="button" class="ph-plan-x" data-plan-del aria-label="Remove plan">${icon('x', 16)}</button></div>`;

  const roomModal = (p, r) => {
    const v = r || { baseOccupancy: 2, maxAdults: 2, maxChildren: 1, maxOccupancy: 3, amenities: [], ratePlans: [{ name: 'Room Only', mealPlan: 'EP', priceDelta: 0, refundable: true }] };
    const body = h(`<form class="ph-room-form" novalidate><div class="form-grid g2">
        ${fi('name', 'Room type name', v.name, { full: true, attrs: 'maxlength="80" placeholder="e.g. Deluxe Room"' })}
        ${fi('bedType', 'Bed type', v.bedType, { attrs: 'maxlength="60" placeholder="e.g. King Bed"' })}${fi('view', 'View', v.view, { attrs: 'maxlength="60" placeholder="e.g. Garden View"' })}
        ${fi('sizeSqft', 'Size (sq.ft)', v.sizeSqft, { type: 'number', attrs: 'data-type="int" min="50"' })}${fi('totalRooms', 'Number of rooms of this type', v.totalRooms, { type: 'number', attrs: 'data-type="int" min="1"' })}
        ${fi('basePrice', 'Price per night (₹)', v.basePrice, { type: 'number', attrs: 'data-type="int" min="300" step="10"', hint: 'Room-only price for the base number of guests' })}${fi('weekendPrice', 'Friday & Saturday price (₹, optional)', v.weekendPrice, { type: 'number', attrs: 'data-type="int" min="300" step="10"' })}
        ${fi('baseOccupancy', 'Guests included in price', v.baseOccupancy, { type: 'number', attrs: 'data-type="int" min="1"' })}${fi('extraAdultPrice', 'Extra adult charge / night (₹)', v.extraAdultPrice || 0, { type: 'number', attrs: 'data-type="int" min="0" step="10"' })}
        ${fi('maxAdults', 'Max adults per room', v.maxAdults, { type: 'number', attrs: 'data-type="int" min="1"' })}${fi('maxChildren', 'Max children per room', v.maxChildren, { type: 'number', attrs: 'data-type="int" min="0"' })}
        ${fi('maxOccupancy', 'Max guests per room', v.maxOccupancy, { type: 'number', attrs: 'data-type="int" min="1"' })}
        <div class="fi full"><label for="f_rdesc">Description (optional)</label><textarea id="f_rdesc" name="description" rows="2" maxlength="1000">${esc(v.description || '')}</textarea></div>
      </div>
      <h4 style="margin-top:14px">Room amenities</h4><div class="ph-checks">${meta.roomAmenities.map((a) => `<label class="ph-check"><input type="checkbox" name="amenities" data-type="list" value="${esc(a)}" ${v.amenities.includes(a) ? 'checked' : ''}><span>${esc(a)}</span></label>`).join('')}</div>
      <h4 style="margin-top:14px">Rate plans</h4><p class="tiny" style="margin:0 0 8px">Each plan is sold at the room price plus the change you set (use a negative number for discounts, e.g. a non-refundable saver).</p>
      <div class="ph-plan-list">${v.ratePlans.map(planRow).join('')}</div><button type="button" class="link-btn" data-plan-add>${icon('plus', 14)} Add rate plan</button>
      <div class="ph-form-foot"><button class="btn-cta" type="submit">${r ? 'SAVE ROOM TYPE' : 'ADD ROOM TYPE'}</button></div></form>`);
    const m = TS.modal({ title: r ? `Edit ${esc(r.name)}` : 'Add a room type', body, cls: 'modal-wide' });
    body.addEventListener('click', (e) => {
      if (e.target.closest('[data-plan-add]')) { $('.ph-plan-list', body).insertAdjacentHTML('beforeend', planRow()); return; }
      const x = e.target.closest('[data-plan-del]');
      if (x) { if ($$('.ph-plan-row', body).length > 1) x.closest('.ph-plan-row').remove(); else TS.toast('Keep at least one rate plan', 'err'); }
    });
    body.addEventListener('submit', (e) => {
      e.preventDefault();
      // Rate plan inputs use data-k instead of name, so readForm only picks up room fields.
      const payload = Object.assign(readForm(body), {
        ratePlans: $$('.ph-plan-row', body).map((row) => {
          const g = (k) => $(`[data-k="${k}"]`, row);
          const plan = { name: g('name').value.trim(), mealPlan: g('mealPlan').value, priceDelta: Number(g('priceDelta').value || 0), refundable: g('refundable').checked };
          if (g('id').value) plan.id = g('id').value;
          return plan;
        }),
      });
      busy($('button[type=submit]', body), 'SAVING…', async () => {
        try {
          if (r) await api(`/partner/rooms/${r.id}`, { method: 'PATCH', body: payload });
          else await api(`/partner/properties/${p.id}/rooms`, { method: 'POST', body: payload });
          m.close();
          TS.toast(r ? 'Room type updated' : 'Room type added', 'ok');
          editor(p.id, 'rooms');
        } catch (err) { showErrors(body, err); }
      });
    });
  };

  /* ================================================================ rates & inventory calendar */
  const calendar = async (id) => {
    render(loading('Loading rates & inventory…'));
    const b = await api(`/partner/properties/${encodeURIComponent(id)}`);
    const p = b.property;
    const rooms = b.rooms.filter((r) => r.active);
    if (!rooms.length) {
      render(`<div class="crumbs"><a href="#/dashboard">Dashboard</a> › ${esc(p.name)} › Rates &amp; inventory</div><div class="empty">${icon('calendar', 40)}<h3>Add a room type first</h3><a class="btn-cta" href="#/property/${esc(p.id)}/rooms">ADD ROOMS</a></div>`);
      return;
    }
    const today = d.iso(d.today());
    let roomId = rooms[0].id;
    let from = today;
    const DAYS = 28;
    const main = render(`<div class="crumbs"><a href="#/dashboard">Dashboard</a> › <a href="#/property/${esc(p.id)}">${esc(p.name)}</a> › Rates &amp; inventory</div>
      <div class="res-h"><div><h1>Rates &amp; inventory</h1><p>${esc(p.name)} ${chip(p.status)}</p></div></div>
      <div class="tabs-line ph-room-tabs">${rooms.map((r, i) => `<button type="button" data-rt="${esc(r.id)}" class="${i ? '' : 'on'}">${esc(r.name)}</button>`).join('')}</div>
      <div class="ph-cal-wrap"><section class="box"><div class="row-between ph-cal-nav"><button type="button" class="btn-ghost" data-prev>${icon('chevL', 16)} Earlier</button><b id="calRange"></b><button type="button" class="btn-ghost" data-next>Later ${icon('chevR', 16)}</button></div>
          <div class="ph-cal" id="cal"></div>
          <div class="ph-legend"><span><i class="lg-open"></i>Open</span><span><i class="lg-low"></i>3 or fewer left</span><span><i class="lg-full"></i>Sold out</span><span><i class="lg-closed"></i>Closed (stop sell)</span><span><i class="lg-ovr"></i>Custom price</span></div></section>
        <aside class="box ph-bulk"><h3>Update dates</h3><p class="tiny">Click a date to select it, shift-click to select a range.</p>
          <form id="bulk" novalidate><div class="form-grid g2">${fi('from', 'From', today, { type: 'date', attrs: `min="${today}"` })}${fi('to', 'To', today, { type: 'date', attrs: `min="${today}"` })}</div>
            <div class="fi"><label>Days of the week</label><div class="ph-wd">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w, i) => `<label><input type="checkbox" data-wd="${(i + 1) % 7}" checked><span>${w}</span></label>`).join('')}</div></div>
            <div class="fi"><label for="f_bprice">Price per night (₹)</label><input id="f_bprice" type="number" min="300" step="10" placeholder="Leave blank to keep"><label class="fchk"><input type="checkbox" id="resetPrice"><span>Reset to standard price</span></label></div>
            <div class="fi"><label for="f_btotal">Rooms to sell</label><input id="f_btotal" type="number" min="0" placeholder="Leave blank to keep"><label class="fchk"><input type="checkbox" id="resetTotal"><span>Reset to all rooms of this type</span></label></div>
            <div class="fi"><label for="f_bstop">Availability</label><select id="f_bstop"><option value="">No change</option><option value="open">Open for sale</option><option value="close">Stop sell (close dates)</option></select></div>
            <button class="btn-cta btn-block" type="submit">APPLY</button></form></aside></div>`);

    const room = () => rooms.find((r) => r.id === roomId);
    const draw = async () => {
      const cal = $('#cal', main);
      cal.innerHTML = '<div class="spinner" style="margin:30px auto"></div>';
      try {
        const r = await api(`/partner/rooms/${roomId}/calendar?${TS.qs({ from, days: DAYS })}`);
        const lead = (d.parse(r.from).getDay() + 6) % 7; // Monday first
        $('#calRange', main).textContent = `${d.mid(r.from)} – ${d.mid(r.days[r.days.length - 1].date)}`;
        $('[data-prev]', main).disabled = from <= today;
        cal.innerHTML = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => `<span class="ph-cal-h">${w}</span>`).join('') + '<span></span>'.repeat(lead) +
          r.days.map((x) => {
            const cls = x.stopSell ? 'closed' : x.available === 0 ? 'full' : x.available <= 3 ? 'low' : '';
            const dt = d.parse(x.date);
            return `<button type="button" class="ph-day ${cls}" data-date="${x.date}"><span class="dn">${dt.getDate()}${dt.getDate() === 1 || x.date === r.from ? ' ' + d.MONTHS[dt.getMonth()] : ''}</span><b class="${x.priceOverride ? 'ovr' : ''}">${TS.inr(x.rate)}</b><small>${x.stopSell ? 'Closed' : `${x.available}/${x.total} left`}</small>${x.sold ? `<em>${x.sold} sold</em>` : ''}</button>`;
          }).join('');
      } catch (err) { cal.innerHTML = `<p class="muted">${esc(err.message)}</p>`; }
    };
    let anchor = null;
    main.addEventListener('click', (e) => {
      const t = e.target.closest('[data-rt]');
      if (t) { roomId = t.dataset.rt; $$('[data-rt]', main).forEach((x) => x.classList.toggle('on', x === t)); $('#f_btotal', main).placeholder = `Leave blank to keep (${room().totalRooms} rooms)`; draw(); return; }
      if (e.target.closest('[data-prev]')) { const f = d.iso(d.add(d.parse(from), -DAYS)); from = f < today ? today : f; draw(); return; }
      if (e.target.closest('[data-next]')) { from = d.iso(d.add(d.parse(from), DAYS)); draw(); return; }
      const day = e.target.closest('[data-date]');
      if (day) {
        const dt = day.dataset.date;
        if (e.shiftKey && anchor) { const [a, z] = [anchor, dt].sort(); $('#f_from', main).value = a; $('#f_to', main).value = z; } else { anchor = dt; $('#f_from', main).value = dt; $('#f_to', main).value = dt; }
        $$('.ph-day', main).forEach((x) => x.classList.toggle('sel', x.dataset.date >= $('#f_from', main).value && x.dataset.date <= $('#f_to', main).value));
      }
    });
    $('#f_btotal', main).placeholder = `Leave blank to keep (${room().totalRooms} rooms)`;
    const form = $('#bulk', main);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const body = { from: $('#f_from', main).value, to: $('#f_to', main).value, weekdays: $$('[data-wd]', main).filter((x) => x.checked).map((x) => +x.dataset.wd) };
      if (!body.weekdays.length) { TS.toast('Pick at least one day of the week', 'err'); return; }
      if ($('#resetPrice', main).checked) body.price = null; else if ($('#f_bprice', main).value) body.price = Number($('#f_bprice', main).value);
      if ($('#resetTotal', main).checked) body.total = null; else if ($('#f_btotal', main).value !== '') body.total = Number($('#f_btotal', main).value);
      const stop = $('#f_bstop', main).value;
      if (stop) body.stopSell = stop === 'close';
      busy($('button[type=submit]', form), 'APPLYING…', async () => {
        try {
          const r = await api(`/partner/rooms/${roomId}/calendar`, { method: 'PUT', body });
          TS.toast(`Updated ${r.updated} date${r.updated === 1 ? '' : 's'}`, 'ok');
          ['#f_bprice', '#f_btotal'].forEach((s) => { $(s, main).value = ''; });
          ['#resetPrice', '#resetTotal'].forEach((s) => { $(s, main).checked = false; });
          $('#f_bstop', main).value = '';
          draw();
        } catch (err) { TS.toast(err.message, 'err'); }
      });
    });
    draw();
  };

  /* ================================================================ bookings */
  const bookings = async () => {
    render(loading('Loading bookings…'));
    const props = (await api('/partner/properties')).properties;
    const f = { propertyId: '', status: '' };
    const main = render(`<div class="res-h"><div><h1>Bookings</h1><p>Every booking across your properties, with guest details and payouts.</p></div></div>
      <div class="row ph-filters">${sel('propertyId', 'Property', [['', 'All properties']].concat(props.map((p) => [p.id, p.name])), '')}${sel('status', 'Status', [['', 'All'], ['upcoming', 'Upcoming'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['held', 'Awaiting payment']], '')}</div>
      <div id="bkList"></div>`);
    const load = async () => {
      const box = $('#bkList', main);
      box.innerHTML = loading('Loading…');
      try {
        const r = await api('/partner/bookings?' + TS.qs(f));
        const live = r.bookings.filter((b) => b.status === 'confirmed');
        box.innerHTML = r.bookings.length
          ? `<p class="small muted">${r.bookings.length} booking${r.bookings.length === 1 ? '' : 's'} · payout on confirmed stays <b>${TS.inr(live.reduce((s, b) => s + b.payout, 0))}</b></p>${bookingTable(r.bookings)}`
          : `<div class="empty">${icon('bag', 40)}<h3>No bookings here yet</h3><p class="muted">${props.some((p) => p.status === 'live') ? 'Bookings show up as soon as guests pay.' : 'Bookings start once a property is live.'}</p></div>`;
      } catch (err) { box.innerHTML = `<p class="muted">${esc(err.message)}</p>`; }
    };
    main.addEventListener('change', (e) => { if (e.target.name in f) { f[e.target.name] = e.target.value; load(); } });
    load();
  };

  /* ================================================================ router */
  const routes = [
    [/^\/$/, landing, false],
    [/^\/login$/, () => authView('login'), false],
    [/^\/signup$/, () => authView('signup'), false],
    [/^\/dashboard$/, dashboard, true],
    [/^\/bookings$/, bookings, true],
    [/^\/property\/new$/, newProperty, true],
    [/^\/property\/([\w-]+)(?:\/([a-z]+))?$/, editor, true],
    [/^\/calendar\/([\w-]+)$/, calendar, true],
  ];
  const fail = (err) => {
    if (err.status === 401) { TS.toast('Please log in again', 'err'); location.hash = '#/login'; return; }
    render(`<div class="empty">${icon('info', 40)}<h3>${err.status === 404 ? 'Not found' : 'Something went wrong'}</h3><p class="muted">${esc(err.message)}</p><a class="btn-out" href="#/dashboard">BACK TO DASHBOARD</a></div>`);
  };
  const route = () => {
    TS.closePopover();
    $$('.modal-wrap').forEach((m) => m.remove());
    document.body.classList.remove('no-scroll');
    const path = (location.hash || '#/').slice(1) || '/';
    const u = me();
    if (u && u.role === 'admin') { location.href = 'admin.html'; return; }
    for (const [re, view, needsAuth] of routes) {
      const m = re.exec(path);
      if (!m) continue;
      if (needsAuth && !u) { location.hash = '#/login'; return; }
      Promise.resolve().then(() => view(...m.slice(1).filter((x) => x !== undefined))).catch(fail);
      return;
    }
    location.hash = '#/';
  };
  window.addEventListener('hashchange', route);
  route();
})();
