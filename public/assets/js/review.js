/* TripSaathi – review, traveller details, payment & confirmation */
(function () {
  const D = window.TS_DATA;
  const { $, $$, h, esc, icon, d } = TS;
  const productOf = { flight: 'flights', hotel: 'hotels', holiday: 'holidays', train: 'trains', bus: 'buses', cab: 'cabs', visa: 'visa', forex: 'forex', insurance: 'insurance' };
  const co = TS.checkout.get();
  // Hotel stays from the TripSaathi API are priced, held and paid on the server.
  const live = !!(co && co.type === 'hotel' && co.api);
  TS.mountChrome({ page: 'review', product: co ? productOf[co.type] : '' });
  const page = $('#page');

  if (!co) {
    page.innerHTML = `<div class="empty" style="margin-top:30px">${icon('bag', 44)}<h3>Nothing to review yet</h3><p class="muted">Search for flights, hotels, trains or more to start a booking.</p><a class="btn-cta" href="index.html">START SEARCHING</a></div>`;
    return;
  }

  const user = TS.auth.user();
  const pax = co.pax || { ad: 1, ch: 0, inf: 0 };
  const nTrav = pax.ad + pax.ch + pax.inf;
  const st = { addons: new Set(), coupon: null, coins: false, step: 'review' };
  const coupons = D.coupons.filter((c) => c.for.includes(co.type));
  const coinBal = TS.store.get('coins', 500);
  let quote = null; // server quote (live bookings)
  let hold = null; // server booking holding the room while the guest pays
  const icons = { flight: 'plane', hotel: 'hotel', holiday: 'holiday', train: 'train', bus: 'bus', cab: 'car', visa: 'visa', forex: 'forex', insurance: 'shield' };

  const addonsTotal = () => (co.addons || []).filter((a) => st.addons.has(a.key)).reduce((s, a) => s + a.price * (a.perPax ? Math.max(1, pax.ad + pax.ch) : 1), 0);
  const gross = () => co.base + co.taxes + (co.fees || 0) + addonsTotal();
  const couponOff = (c, g = gross()) => {
    if (live) return c && quote ? quote.price.discount : 0;
    if (!c) return 0;
    if (c.min && g < c.min) return 0;
    return Math.round(c.pct ? Math.min(c.max || Infinity, (g * c.pct) / 100) : c.flat);
  };
  const coinsOff = () => (st.coins ? Math.min(coinBal, Math.round((gross() - couponOff(st.coupon)) * 0.1)) : 0);
  const total = () => Math.max(0, gross() - couponOff(st.coupon) - coinsOff());

  /* ------------------------------------------------------------ traveller forms */
  const travLabels = [];
  for (let i = 0; i < pax.ad; i++) travLabels.push(['Adult ' + (i + 1), 'ad']);
  for (let i = 0; i < pax.ch; i++) travLabels.push(['Child ' + (i + 1), 'ch']);
  for (let i = 0; i < pax.inf; i++) travLabels.push(['Infant ' + (i + 1), 'inf']);
  const nameParts = (user && user.name !== 'Traveller' ? user.name : '').split(' ');
  const travForm = (lbl, i) => {
    const first = i === 0 ? nameParts[0] || '' : '';
    const last = i === 0 ? nameParts.slice(1).join(' ') : '';
    const seat = co.seatLabels ? ` <span class="chip blue">Seat ${co.seatLabels[i]}</span>` : '';
    return `<div class="trav" data-t="${i}"><div class="trav-h">${icon('user', 16)} ${co.primaryOnly ? 'Lead guest' : lbl[0]}${seat}</div><div class="form-grid">
      <div class="fi"><label>First &amp; middle name</label><input data-k="first" value="${esc(first)}" autocomplete="${i ? 'off' : 'given-name'}"></div>
      <div class="fi"><label>Last name</label><input data-k="last" value="${esc(last)}" autocomplete="${i ? 'off' : 'family-name'}"></div>
      <div class="fi"><label>Gender</label><div class="seg-btns" data-k="gender"><button type="button" data-v="M">MALE</button><button type="button" data-v="F">FEMALE</button></div></div>
      ${co.needAge ? '<div class="fi"><label>Age</label><input data-k="age" type="number" min="1" max="110" inputmode="numeric"></div>' : ''}
      ${co.type === 'flight' && co.intl ? '<div class="fi"><label>Passport number</label><input data-k="passport" maxlength="9" style="text-transform:uppercase"></div><div class="fi"><label>Nationality</label><select data-k="nat"><option>Indian</option><option>Other</option></select></div>' : ''}
    </div></div>`;
  };
  const policy = {
    flight: 'Cancellation and date change charges are as per the airline fare rules shown during selection. Carry a valid government photo ID. Web check-in opens 48 hours before departure.',
    hotel: 'Check-in from 2:00 PM, check-out by 12:00 PM. Valid photo ID is mandatory for all guests. Cancellation charges depend on the rate plan selected.',
    holiday: 'Package prices are per person on twin-sharing basis. Final itinerary and hotel vouchers will be shared 72 hours before departure.',
    train: 'Ticket status shown is indicative and may change until chart preparation. Waitlisted tickets that remain unconfirmed are auto-cancelled with refund.',
    bus: 'Reach the boarding point 15 minutes before departure. Operator cancellation policy applies. Carry a valid ID proof.',
    cab: 'Toll charges, state taxes and driver allowance are included unless stated. Night charges (10 PM – 6 AM) may apply.',
    visa: 'Visa issuance is at the sole discretion of the embassy. Service fee is non-refundable once documents are submitted.',
    forex: 'Rates are indicative and are locked at the time of payment. A valid passport, visa and ticket are required as per regulations.',
    insurance: 'The policy is issued instantly and sent to your email. Pre-existing conditions are not covered unless declared.',
  }[co.type];

  const showTravellers = !co.noTravellers;
  const travCount = co.primaryOnly ? 1 : nTrav;
  page.innerHTML = `
    <div class="crumbs">${co.backUrl ? `<a href="${esc(co.backUrl)}">‹ Back to results</a>` : '<a href="index.html">Home</a>'} › Review booking</div>
    <div class="res-h"><div><h1>Review your booking</h1><p>${esc(co.title)} · ${esc(co.subtitle || '')}</p></div><div class="timer" id="timer">${icon('clock', 16)} Complete booking in <b id="tleft">15:00</b></div></div>
    <div class="rv-grid" id="rv">
      <div id="rvMain">
        <section class="box" style="margin-bottom:14px"><div class="step-h"><i>1</i><h3>${{ flight: 'Flight itinerary', hotel: 'Your stay', holiday: 'Your holiday', train: 'Train journey', bus: 'Bus journey', cab: 'Your ride', visa: 'Visa application', forex: 'Forex order', insurance: 'Insurance plan' }[co.type]}</h3></div>${co.itinerary}</section>
        ${showTravellers ? `<section class="box" style="margin-bottom:14px"><div class="step-h"><i>2</i><h3>${co.primaryOnly ? 'Guest details' : 'Traveller details'}</h3></div>${!user ? `<div class="banner-strip">${icon('user', 18)} Login to prefill traveller details and earn TripCoins on this booking.<button type="button" class="btn-out" data-login>LOGIN</button></div>` : ''}<p class="tiny" style="margin:0 0 10px">Enter names exactly as on government ID.</p>${travLabels.slice(0, travCount).map(travForm).join('')}</section>` : ''}
        <section class="box" style="margin-bottom:14px"><div class="step-h"><i>${showTravellers ? 3 : 2}</i><h3>Contact details</h3></div><p class="tiny" style="margin:0 0 10px">Your ticket and updates will be sent here.</p><div class="form-grid g2">
          <div class="fi"><label>Mobile number</label><input id="cPhone" type="tel" maxlength="10" inputmode="numeric" value="${esc(user ? user.phone : '')}" autocomplete="tel-national"></div>
          <div class="fi"><label>Email</label><input id="cEmail" type="email" autocomplete="email"></div>
          ${co.pickup || co.type === 'forex' ? `<div class="fi" style="grid-column:1/-1"><label>${co.type === 'forex' ? 'Delivery address' : 'Pickup address'}</label><input id="cAddr" autocomplete="street-address"></div>` : ''}
          ${live ? '<div class="fi" style="grid-column:1/-1"><label>Special requests (optional)</label><input id="specialReq" maxlength="500" placeholder="e.g. early check-in, high floor, airport pickup"></div>' : ''}
        </div><label class="fchk" style="margin-top:10px"><input type="checkbox" checked> <span>Send me booking updates on WhatsApp</span></label></section>
        ${(co.addons || []).length ? `<section class="box" style="margin-bottom:14px"><div class="step-h"><i>${showTravellers ? 4 : 3}</i><h3>Add-ons</h3></div><div style="display:grid;gap:10px">${co.addons.map((a) => `<label class="addon" data-addon="${a.key}"><input type="checkbox"><span><b>${esc(a.label)} · ${TS.inr(a.price)}${a.perPax ? '/traveller' : ''}</b><small>${esc(a.desc)}</small></span></label>`).join('')}</div></section>` : ''}
        <section class="box" style="margin-bottom:14px"><h4>Important information</h4><p class="small muted" style="margin:0" id="policyTxt">${policy}</p></section>
        <div class="row-between" style="flex-wrap:wrap"><span class="tiny" style="margin:0">By continuing you agree to the fare rules, cancellation policy and TripSaathi's user agreement.</span><button type="button" class="btn-cta" id="toPay" style="padding:13px 34px;font-size:16px">CONTINUE TO PAYMENT</button></div>
      </div>
      <aside class="rv-side">
        <div class="box fare-sum" id="fareSum"></div>
        <div class="box"><h4>${icon('tag', 16)} Coupons &amp; offers</h4><div class="cpn-in"><input id="cpnIn" placeholder="Enter coupon code"><button type="button" class="btn-out" id="cpnApply">APPLY</button></div><div class="coupons" id="cpnList"></div></div>
        ${user && !live ? `<label class="box addon" id="coinsBox"><input type="checkbox" id="coins"><span><b>Use TripCoins</b><small>Balance ${TS.num(coinBal)} coins (1 coin = ₹1, up to 10% of fare)</small></span></label>` : ''}
        <div class="secure">${icon('lock', 14)} 100% secure payments · PCI DSS compliant</div>
      </aside>
    </div>`;

  /* ------------------------------------------------------------ fare summary & coupons */
  const drawFare = () => {
    const cOff = couponOff(st.coupon), kOff = coinsOff();
    const lbl = co.type === 'hotel' ? 'Room charges' : co.type === 'forex' ? 'Forex amount' : 'Base fare';
    $('#fareSum').innerHTML = `<h3>Fare summary</h3>
      <div class="row-between"><span>${lbl}${nTrav > 1 && !co.primaryOnly && !co.noTravellers ? ` <small class="muted">(${nTrav} travellers)</small>` : ''}</span><b>${TS.inr(co.base)}</b></div>
      <div class="row-between"><span>Taxes &amp; fees</span><b>${TS.inr(co.taxes)}</b></div>
      ${co.fees ? `<div class="row-between"><span>Convenience fee</span><b>${TS.inr(co.fees)}</b></div>` : ''}
      ${addonsTotal() ? `<div class="row-between"><span>Add-ons</span><b>${TS.inr(addonsTotal())}</b></div>` : ''}
      ${cOff ? `<div class="row-between disc"><span>Coupon ${st.coupon.code}</span><b>– ${TS.inr(cOff)}</b></div>` : ''}
      ${kOff ? `<div class="row-between disc"><span>TripCoins</span><b>– ${TS.inr(kOff)}</b></div>` : ''}
      <div class="row-between tot"><span>Total amount</span><span>${TS.inr(total())}</span></div>
      ${cOff + kOff ? `<span class="chip ok" style="margin-top:8px">You save ${TS.inr(cOff + kOff)} on this booking</span>` : ''}
      ${live ? `<p class="tiny" style="margin:8px 0 0">${quote ? `${icon(quote.policy.key === 'non_refundable' ? 'x' : 'refund', 12)} ${esc(quote.policy.label)} · Live price from the property, GST included` : 'Checking the latest price…'}</p>` : ''}`;
    const btn = $('#toPay');
    if (btn) btn.textContent = st.step === 'review' ? 'CONTINUE TO PAYMENT' : 'PAY ' + TS.inr(total());
  };
  const drawCoupons = () => {
    const g = gross();
    const list = live ? (quote ? quote.coupons : []) : coupons;
    $('#cpnList').innerHTML = list.length ? list.map((c) => {
      const ok = live ? c.eligible : !c.min || g >= c.min;
      const on = !!st.coupon && st.coupon.code === c.code;
      const why = live ? c.reason : `Min. booking ${TS.inr(c.min)}`;
      return `<label class="cpn ${on ? 'on' : ''} ${ok ? '' : 'na'}" data-cpn="${c.code}"><input type="radio" name="cpn" ${on ? 'checked' : ''} ${ok ? '' : 'disabled'}><span><b>${c.code}</b><small>${esc(c.desc)}${ok ? '' : ` · ${esc(why)}`}</small></span></label>`;
    }).join('') : `<p class="muted small">${live && !quote ? 'Loading offers…' : 'No coupons available for this booking.'}</p>`;
  };
  const soldOut = (msg) => TS.modal({ title: 'Sold out', body: `<p>${esc(msg || 'This room is no longer available for your dates.')}</p><a class="btn-cta" href="${esc(co.backUrl || 'index.html')}">CHOOSE ANOTHER ROOM</a>` });
  // Ask the server for the authoritative price, optionally with a coupon.
  const requote = async (code) => {
    try {
      const r = await TS.api('/bookings/quote', { method: 'POST', body: Object.assign({}, co.api, { coupon: code || undefined }) });
      if (code && r.quote.coupon.error) { TS.toast(r.quote.coupon.error, 'err'); return; }
      quote = r.quote;
      co.base = quote.price.roomCharges;
      co.taxes = quote.price.taxes;
      st.coupon = quote.coupon.code ? { code: quote.coupon.code } : null;
      if (st.coupon) TS.toast(`Coupon ${st.coupon.code} applied – you save ${TS.inr(quote.price.discount)}`, 'ok');
      const fmt12 = (t) => { const [H, M] = t.split(':').map(Number); return ((H + 11) % 12) + 1 + ':' + String(M).padStart(2, '0') + ' ' + (H < 12 ? 'AM' : 'PM'); };
      $('#policyTxt').textContent = `Check-in from ${fmt12(quote.property.checkInTime)}, check-out by ${fmt12(quote.property.checkOutTime)}. Valid photo ID is mandatory for all guests. Cancellation: ${quote.policy.detail}.`;
      if (quote.soldOut) soldOut();
    } catch (err) {
      if (err.status === 404) soldOut('This room option is no longer offered. Please pick another room.');
      else TS.toast(err.message, 'err');
    }
    drawCoupons();
    drawFare();
  };
  const applyCode = (code) => {
    if (live) { const c = code.trim().toUpperCase(); if (c) requote(st.coupon && st.coupon.code === c ? null : c); return; }
    const c = D.coupons.find((x) => x.code === code.trim().toUpperCase());
    if (!c) { TS.toast('Invalid coupon code', 'err'); return; }
    if (!c.for.includes(co.type)) { TS.toast(`${c.code} is not valid for this booking`, 'err'); return; }
    if (c.min && gross() < c.min) { TS.toast(`${c.code} needs a minimum booking of ${TS.inr(c.min)}`, 'err'); return; }
    st.coupon = st.coupon === c ? null : c;
    if (st.coupon) TS.toast(`Coupon ${c.code} applied – you save ${TS.inr(couponOff(c))}`, 'ok');
    drawCoupons(); drawFare();
  };
  $('#cpnList').addEventListener('click', (e) => { const l = e.target.closest('[data-cpn]'); if (l && !l.classList.contains('na')) { e.preventDefault(); applyCode(l.dataset.cpn); } });
  $('#cpnApply').addEventListener('click', () => applyCode($('#cpnIn').value));
  $('#cpnIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') applyCode($('#cpnIn').value); });
  if ($('#coins')) $('#coins').addEventListener('change', (e) => { st.coins = e.target.checked; $('#coinsBox').classList.toggle('on', st.coins); drawFare(); });
  page.addEventListener('change', (e) => {
    const a = e.target.closest('[data-addon]');
    if (a) { e.target.checked ? st.addons.add(a.dataset.addon) : st.addons.delete(a.dataset.addon); a.classList.toggle('on', e.target.checked); drawCoupons(); drawFare(); }
  });
  page.addEventListener('click', (e) => {
    const g = e.target.closest('.seg-btns button');
    if (g) { $$('button', g.parentNode).forEach((b) => b.classList.toggle('on', b === g)); g.closest('.fi').classList.remove('err'); }
    if (e.target.closest('[data-login]')) TS.openLogin(() => location.reload());
  });
  page.addEventListener('input', (e) => { const fi = e.target.closest('.fi'); if (fi) fi.classList.remove('err'); });
  drawCoupons();
  drawFare();
  if (live) requote(null);

  /* ------------------------------------------------------------ timer */
  let left = 15 * 60;
  const tick = setInterval(() => {
    left--;
    const el = $('#tleft');
    if (!el) { clearInterval(tick); return; }
    el.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
    if (left <= 0) { clearInterval(tick); TS.modal({ title: 'Session expired', body: `<p>Prices may have changed since you started. Please search again to get the latest fares.</p><a class="btn-cta" href="${esc(co.backUrl || 'index.html')}">SEARCH AGAIN</a>` }); }
  }, 1000);

  /* ------------------------------------------------------------ validation */
  const collect = () => {
    let ok = true;
    const bad = (el) => { el.closest('.fi').classList.add('err'); ok = false; };
    const travellers = $$('.trav').map((t) => {
      const v = (k) => { const el = $(`[data-k="${k}"]`, t); return el ? el.value.trim() : ''; };
      const first = $('[data-k="first"]', t), last = $('[data-k="last"]', t);
      if (!/^[A-Za-z][A-Za-z .'-]{0,40}$/.test(first.value.trim())) bad(first);
      if (!/^[A-Za-z][A-Za-z .'-]{0,40}$/.test(last.value.trim())) bad(last);
      const gBtn = $('.seg-btns .on', t);
      if (!gBtn) bad($('.seg-btns', t));
      const age = $('[data-k="age"]', t);
      if (age && !(+age.value >= 1 && +age.value <= 110)) bad(age);
      const pp = $('[data-k="passport"]', t);
      if (pp && !/^[A-Za-z][0-9]{7}$/.test(pp.value.trim())) bad(pp);
      return { name: `${v('first')} ${v('last')}`.trim(), gender: gBtn ? gBtn.dataset.v : '', age: v('age') };
    });
    const phone = $('#cPhone'), email = $('#cEmail'), addr = $('#cAddr');
    if (!/^[6-9]\d{9}$/.test(phone.value.trim())) bad(phone);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) bad(email);
    if (addr && addr.value.trim().length < 6) bad(addr);
    if (!ok) {
      TS.toast('Please fill in the highlighted details correctly', 'err');
      const first = $('.fi.err');
      if (first) window.scrollTo({ top: first.getBoundingClientRect().top + window.scrollY - 160, behavior: 'smooth' });
      if ($$('[data-k="passport"]').length) TS.toast('Passport format: 1 letter followed by 7 digits (e.g. K1234567)');
      return null;
    }
    return { travellers, contact: { phone: phone.value.trim(), email: email.value.trim(), addr: addr ? addr.value.trim() : '' } };
  };

  /* ------------------------------------------------------------ payment */
  const openPayment = (info) => {
    const amt = live ? hold.price.total : total();
    const body = h(`<div><div class="row-between" style="margin-bottom:14px"><span class="muted">${esc(co.title)}</span><b style="font-size:20px">${TS.inr(amt)}</b></div>
      <div class="pay"><div class="pay-tabs">${[['upi', 'wallet', 'UPI'], ['card', 'forex', 'Credit / Debit Card'], ['nb', 'globe', 'Net Banking'], ['later', 'clock', 'Pay Later']].map(([k, ic, l], i) => `<button type="button" data-pt="${k}" class="${i ? '' : 'on'}">${icon(ic, 16)} ${l}</button>`).join('')}</div><div class="pay-body" id="payBody"></div></div>
      <button type="button" class="btn-cta btn-block" id="payNow" style="margin-top:14px;padding:14px;font-size:16px">PAY ${TS.inr(amt)}</button><div class="secure">${icon('lock', 14)} Payments are processed securely. This is a demo – no real money is charged.</div></div>`);
    const m = TS.modal({ title: 'Complete payment', body });
    let tab = 'upi', sub = 'SaathiPay';
    const drawTab = () => {
      const pb = $('#payBody', body);
      if (tab === 'upi') pb.innerHTML = `<div class="upi-apps">${[['SaathiPay', '#f0386b'], ['QuickUPI', '#6d28d9'], ['PayNest', '#2563eb'], ['Other UPI app', '#0891b2']].map(([n, c]) => `<button type="button" data-sub="${n}" class="${sub === n ? 'on' : ''}"><i style="background:${c}"></i>${n}</button>`).join('')}</div><div class="fi"><label>Or enter UPI ID</label><input id="upiId" placeholder="yourname@bank"></div><p class="tiny">You'll receive a payment request on your UPI app.</p>`;
      else if (tab === 'card') pb.innerHTML = `<div class="form-grid g2"><div class="fi" style="grid-column:1/-1"><label>Card number</label><input id="cardNo" inputmode="numeric" maxlength="19" placeholder="XXXX XXXX XXXX XXXX"></div><div class="fi" style="grid-column:1/-1"><label>Name on card</label><input id="cardName"></div><div class="fi"><label>Expiry (MM/YY)</label><input id="cardExp" maxlength="5" placeholder="MM/YY"></div><div class="fi"><label>CVV</label><input id="cardCvv" type="password" maxlength="4" inputmode="numeric"></div></div><p class="tiny">Demo tip: use any 16-digit number and a future expiry date${live ? ' – a card ending in 0002 is declined' : ''}.</p>`;
      else if (tab === 'nb') pb.innerHTML = `<div class="banks">${['Sahyadri Bank', 'Ganga Bank', 'Harbour Bank', 'Deccan Bank', 'Lotus Bank', 'Banyan Bank'].map((n) => `<button type="button" data-sub="${n}" class="${sub === n ? 'on' : ''}">${n}</button>`).join('')}</div><p class="tiny">You'll be redirected to your bank's secure page.</p>`;
      else pb.innerHTML = `<div class="it-simple">${icon('clock', 26)}<div><b>Book now, pay in 15 days</b><small>No-cost pay later for eligible users. Approval is instant.</small></div></div>`;
    };
    drawTab();
    body.addEventListener('click', (e) => {
      const t = e.target.closest('[data-pt]');
      if (t) { tab = t.dataset.pt; sub = tab === 'nb' ? '' : 'SaathiPay'; $$('[data-pt]', body).forEach((b) => b.classList.toggle('on', b === t)); drawTab(); return; }
      const s = e.target.closest('[data-sub]');
      if (s) { sub = s.dataset.sub; $$('[data-sub]', body).forEach((b) => b.classList.toggle('on', b === s)); }
    });
    body.addEventListener('input', (e) => {
      if (e.target.id === 'cardNo') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
      if (e.target.id === 'cardExp') { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); e.target.value = v; }
      const fi = e.target.closest('.fi'); if (fi) fi.classList.remove('err');
    });
    $('#payNow', body).addEventListener('click', () => {
      let ok = true;
      const bad = (el) => { el.closest('.fi').classList.add('err'); ok = false; };
      if (tab === 'upi') { const u = $('#upiId', body); if (u.value.trim() && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(u.value.trim())) bad(u); }
      if (tab === 'card') {
        const n = $('#cardNo', body), nm = $('#cardName', body), ex = $('#cardExp', body), cv = $('#cardCvv', body);
        if (n.value.replace(/\s/g, '').length !== 16) bad(n);
        if (nm.value.trim().length < 2) bad(nm);
        const [mm, yy] = ex.value.split('/').map(Number);
        const now = new Date();
        if (!(mm >= 1 && mm <= 12 && yy >= 0) || new Date(2000 + yy, mm, 0) < new Date(now.getFullYear(), now.getMonth(), 1)) bad(ex);
        if (!/^\d{3,4}$/.test(cv.value)) bad(cv);
      }
      if (tab === 'nb' && !sub) { TS.toast('Please select your bank', 'err'); return; }
      if (!ok) { TS.toast('Please check your payment details', 'err'); return; }
      // Only the method and non-sensitive hints go to our server; card numbers never leave the browser.
      const payload = { method: { upi: 'upi', card: 'card', nb: 'netbanking', later: 'paylater' }[tab] };
      if (tab === 'upi' && $('#upiId', body).value.trim()) payload.upiId = $('#upiId', body).value.trim();
      if (tab === 'card') payload.cardLast4 = $('#cardNo', body).value.replace(/\s/g, '').slice(-4);
      if (tab === 'nb') payload.bank = sub;
      $('.modal-body', m.el).innerHTML = `<div class="processing"><div class="spinner"></div><h3>Processing your payment…</h3><p class="muted">Please do not close or refresh this window.</p></div>`;
      if (!live) { setTimeout(() => { m.close(); confirmBooking(info, amt, tab); }, 1700); return; }
      TS.api(`/bookings/${hold.id}/pay`, { method: 'POST', body: payload }).then((r) => {
        m.close();
        confirmBooking(info, r.booking.price.total, tab, r.booking);
      }, (err) => {
        m.close();
        if (err.code === 'hold_expired' || err.code === 'not_payable') {
          hold = null;
          TS.modal({ title: 'Booking window expired', body: `<p>${esc(err.message)}</p><a class="btn-cta" href="${esc(co.backUrl || 'index.html')}">SEARCH AGAIN</a>` });
        } else {
          TS.toast(err.message, 'err');
        }
      });
    });
  };

  const confirmBooking = (info, amt, method, apiBooking) => {
    clearInterval(tick);
    const id = apiBooking ? apiBooking.id : 'TS' + { flight: 'F', hotel: 'H', holiday: 'P', train: 'T', bus: 'B', cab: 'C', visa: 'V', forex: 'X', insurance: 'I' }[co.type] + String(Date.now()).slice(-8);
    const earned = Math.round(amt * 0.02);
    const member = TS.auth.user();
    if (member) TS.store.set('coins', coinBal - coinsOff() + earned);
    const b = { id, type: co.type, title: co.title, subtitle: co.subtitle, date: co.date, endDate: co.endDate || co.date, amount: amt, status: 'confirmed', createdAt: new Date().toISOString(), itinerary: co.itinerary, travellers: info.travellers.map((t) => t.name).filter(Boolean), contact: info.contact, method, coupon: st.coupon ? st.coupon.code : '' };
    // Live hotel bookings are stored on the server and listed in My Trips from there.
    if (!apiBooking) TS.bookings.add(b);
    try { sessionStorage.removeItem('ts_checkout'); } catch (e) { /* ignore */ }
    TS.store.del('checkout');
    page.innerHTML = `<div class="box confirm" style="max-width:820px;margin:20px auto">
      <div class="ok-ic">${icon('check', 40)}</div>
      <h2>Booking confirmed!</h2>
      <p class="muted">Your ${co.type === 'hotel' ? 'stay' : co.type} is booked. Confirmation sent to <b>${esc(info.contact.email)}</b> and <b>+91 ${esc(info.contact.phone)}</b>.</p>
      <span class="bid">Booking ID: ${id}</span>
      <div style="text-align:left;margin:16px 0">${co.itinerary}</div>
      ${b.travellers.length ? `<div class="box" style="text-align:left;box-shadow:none;border:1px solid var(--line)"><h4>${co.primaryOnly ? 'Guest' : 'Travellers'}</h4>${info.travellers.map((t, i) => `<div class="row-between" style="padding:4px 0"><span>${i + 1}. ${esc(t.name)}${t.age ? ', ' + esc(t.age) + ' yrs' : ''}</span><span class="muted small">${t.gender === 'M' ? 'Male' : 'Female'}${co.seatLabels ? ' · Seat ' + co.seatLabels[i] : ''}</span></div>`).join('')}</div>` : ''}
      ${apiBooking && apiBooking.specialRequests ? `<p class="small" style="text-align:left"><b>Special requests:</b> ${esc(apiBooking.specialRequests)} <span class="muted">(shared with the property)</span></p>` : ''}
      ${apiBooking ? `<p class="small muted" style="text-align:left">${icon(apiBooking.cancellationPolicy.key === 'non_refundable' ? 'x' : 'refund', 14)} ${esc(apiBooking.cancellationPolicy.detail)}</p>` : ''}
      <div class="row-between" style="margin:16px 0 4px;flex-wrap:wrap"><span>Amount paid <b style="font-size:20px">${TS.inr(amt)}</b> <span class="muted small">via ${{ upi: 'UPI', card: 'Card', nb: 'Net Banking', later: 'Pay Later' }[method]}</span></span>${member ? `<span class="chip ok">+${earned} TripCoins earned</span>` : ''}</div>
      <div class="row" style="justify-content:center;margin-top:18px;flex-wrap:wrap"><a class="btn-cta" href="mytrips.html">VIEW MY TRIPS</a><a class="btn-out" href="index.html">BOOK ANOTHER TRIP</a></div>
    </div>`;
    window.scrollTo({ top: 0 });
    TS.toast('Booking confirmed – ' + id, 'ok');
  };

  // Live hotels: log in, then hold the room on the server before taking payment.
  const holdRoom = async (info) => {
    if (!TS.auth.user()) { TS.openLogin(() => holdRoom(info)); return; }
    if (hold && new Date(hold.holdExpiresAt) > new Date()) { openPayment(info); return; }
    const btn = $('#toPay');
    btn.disabled = true;
    btn.textContent = 'HOLDING YOUR ROOM…';
    const lead = $('.trav');
    const val = (k) => $(`[data-k="${k}"]`, lead).value.trim();
    const g = $('.seg-btns .on', lead);
    try {
      const r = await TS.api('/bookings', {
        method: 'POST',
        body: Object.assign({}, co.api, {
          coupon: st.coupon ? st.coupon.code : undefined,
          guest: { firstName: val('first'), lastName: val('last'), gender: g ? g.dataset.v : undefined, email: info.contact.email, phone: info.contact.phone },
          specialRequests: $('#specialReq') ? $('#specialReq').value.trim() : '',
        }),
      });
      hold = r.booking;
      left = Math.max(1, Math.round((new Date(hold.holdExpiresAt) - Date.now()) / 1000));
      st.step = 'pay';
      if (hold.price.total !== total()) TS.toast(`The price was updated to ${TS.inr(hold.price.total)}`, 'err');
      openPayment(info);
    } catch (err) {
      if (err.code === 'sold_out') soldOut(err.message);
      else if (err.status === 401) TS.openLogin(() => holdRoom(info));
      else TS.toast(err.message, 'err');
    } finally {
      btn.disabled = false;
      drawFare();
    }
  };

  $('#toPay').addEventListener('click', () => {
    const info = collect();
    if (!info) return;
    if (live) { holdRoom(info); return; }
    st.step = 'pay';
    drawFare();
    openPayment(info);
  });
})();
