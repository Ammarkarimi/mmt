/* TripSaathi – search widgets for all products (used on home & results pages) */
(function () {
  const D = window.TS_DATA;
  const { $, $$, h, esc, icon, d } = TS;
  const S = (TS.Search = {});

  /* ---------------------------------------------------------------- shared helpers */
  const radio = (name, v, label, on) => `<label class="rd ${on ? 'on' : ''}"><input type="radio" name="${name}" value="${v}" ${on ? 'checked' : ''}><i></i>${label}</label>`;
  const fld = (key, label, val, cls = '') =>
    `<div class="fld ${cls}" data-f="${key}" role="button" tabindex="0"><span class="fld-l">${label} ${icon('chevD', 14)}</span>${val.empty ? `<span class="fld-empty">${val.empty}</span>` : `<span class="fld-v">${val.v}</span><span class="fld-s">${val.s || '&nbsp;'}</span>`}${val.clear ? `<button type="button" class="fld-x" data-clear="${key}" aria-label="Clear">${icon('x', 14)}</button>` : ''}</div>`;
  const dateParts = (iso) => {
    const x = d.parse(iso);
    return { v: `<b>${x.getDate()}</b> <span class="mo">${d.MONTHS[x.getMonth()]}${d.yy(x)}</span>`, s: d.DAYS[x.getDay()] };
  };
  const timeOpts = () => { const a = []; for (let m = 0; m < 1440; m += 30) a.push(TS.hm(m)); return a; };
  const fmt12 = (hm) => { const [H, M] = hm.split(':').map(Number); return ((H + 11) % 12) + 1 + ':' + String(M).padStart(2, '0') + ' ' + (H < 12 ? 'AM' : 'PM'); };
  const searchBtn = (label = 'SEARCH') => `<div class="sw-go"><button type="submit" class="btn-search">${label}</button></div>`;
  const wire = (root, onClick, onSubmit) => {
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.fld')) { e.preventDefault(); e.target.click(); } });
    root.addEventListener('change', (e) => { if (e.target.matches('input[type=radio]')) onClick({ target: e.target, radio: true }); });
    root.addEventListener('submit', (e) => { e.preventDefault(); onSubmit(); });
  };
  const counterRow = (key, label, sub, val, min, max) =>
    `<div class="ctr"><div><b>${label}</b><small>${sub}</small></div><div class="ctr-btns"><button type="button" data-dec="${key}" ${val <= min ? 'disabled' : ''} aria-label="Decrease">${icon('minus', 16)}</button><span>${val}</span><button type="button" data-inc="${key}" ${val >= max ? 'disabled' : ''} aria-label="Increase">${icon('plus', 16)}</button></div></div>`;
  const listPop = (anchor, options, current, onPick, width = 240) => {
    const el = h(`<div class="opt-list">${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<button type="button" data-v="${esc(v)}" class="${String(v) === String(current) ? 'on' : ''}">${esc(l)}</button>`; }).join('')}</div>`);
    el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { TS.closePopover(); onPick(b.dataset.v); } });
    TS.popover(anchor, el, { cls: 'pop-opts', width });
    const on = $('.on', el); if (on) on.scrollIntoView({ block: 'center' });
  };
  S.fmt12 = fmt12;

  /* ---------------------------------------------------------------- item lists */
  const airportItems = () => D.airports.map((a) => ({ title: `${a.city}, ${a.country}`, sub: a.name, code: a.code, data: a, icon: 'plane', search: `${a.city} ${a.country} ${a.name} ${a.code}`.toLowerCase(), popular: a.popular }));
  const hotelCityItems = () => D.hotelCities.map((c) => ({ title: c.name, sub: c.country === 'India' ? 'City in India' : c.country, data: c, icon: 'pin', search: `${c.name} ${c.country} ${c.localities.join(' ')}`.toLowerCase() }));
  const stationItems = () => D.stations.map((s) => ({ title: s.name, sub: s.city, code: s.code, data: s, icon: 'train', search: `${s.name} ${s.city} ${s.code}`.toLowerCase() }));
  const roadItems = () => D.roadCities.map((c) => ({ title: c.city, sub: c.state, data: c, icon: 'pin', search: `${c.city} ${c.state}`.toLowerCase() }));

  /* ================================================================ FLIGHTS */
  S.flights = function (root, init = {}, opts = {}) {
    const t = d.today();
    const st = Object.assign({ trip: 'oneway', from: 'DEL', to: 'BOM', dep: d.iso(d.add(t, 1)), ret: '', ad: 1, ch: 0, inf: 0, cls: 'E', fare: 'regular', legs: null }, init);
    if (!st.legs || st.legs.length < 2) st.legs = [{ from: st.from, to: st.to, dep: st.dep }, { from: st.to, to: st.to === 'BLR' ? 'GOI' : 'BLR', dep: d.iso(d.add(d.parse(st.dep), 2)) }];
    const items = airportItems();
    const ap = (code) => { const a = TS.airport(code); return a ? { v: esc(a.city), s: `${a.code}, ${esc(a.name)}` } : { v: '<span class="ph">Select</span>', s: '' }; };
    const pax = () => st.ad + st.ch + st.inf;
    const paxVal = () => ({ v: `<b>${pax()}</b> <span class="mo">Traveller${pax() > 1 ? 's' : ''}</span>`, s: TS.cabin(st.cls).label });
    const priceFn = (from, to) => (dt) => TS.gen.minFare(from, to, dt, st.cls);

    const render = () => {
      let html = `<div class="sw-top"><div class="trip-types">${[['oneway', 'One Way'], ['round', 'Round Trip'], ['multi', 'Multi City']].map(([k, l]) => radio('trip', k, l, st.trip === k)).join('')}</div>${opts.compact ? '' : '<span class="sw-note">Book International and Domestic Flights</span>'}</div>`;
      if (st.trip !== 'multi') {
        html += `<div class="flds flds-flight">
          ${fld('from', 'From', ap(st.from))}
          <button class="swap" type="button" aria-label="Swap cities">${icon('swap', 18)}</button>
          ${fld('to', 'To', ap(st.to))}
          ${fld('dep', 'Departure', dateParts(st.dep))}
          ${fld('ret', 'Return', st.ret ? Object.assign(dateParts(st.ret), { clear: true }) : { empty: 'Tap to add a return date for bigger discounts' })}
          ${fld('pax', 'Travellers & Class', paxVal())}
        </div>`;
      } else {
        html += `<div class="multi">${st.legs.map((l, i) => `<div class="flds flds-multi" data-leg="${i}">
            ${fld('lfrom', 'From', ap(l.from))}${fld('lto', 'To', ap(l.to))}${fld('ldep', 'Departure', dateParts(l.dep))}
            ${i === 0 ? fld('pax', 'Travellers & Class', paxVal()) : i === st.legs.length - 1 ? `<div class="multi-act">${st.legs.length < 5 ? '<button type="button" class="btn-ghost" data-act="addleg">+ ADD ANOTHER CITY</button>' : ''}${i > 1 ? `<button type="button" class="multi-x" data-act="rmleg" aria-label="Remove">${icon('x', 18)}</button>` : ''}</div>` : `<div class="multi-act">${i > 1 ? `<button type="button" class="multi-x" data-act="rmleg" aria-label="Remove">${icon('x', 18)}</button>` : ''}</div>`}
          </div>`).join('')}</div>`;
      }
      html += `<div class="sw-bottom"><div class="fares"><span class="fares-l">${opts.compact ? 'Fare type:' : 'SELECT A<br>SPECIAL FARE'}</span>${D.specialFares.map((f) => `<button type="button" class="fare ${st.fare === f.key ? 'on' : ''}" data-fare="${f.key}"><b>${f.label}</b>${opts.compact ? '' : `<small>${f.sub}</small>`}</button>`).join('')}</div>${opts.compact ? '' : '<div class="sw-extra"><span class="badge-new">NEW</span> Zero cancellation fee on select fares</div>'}</div>`;
      html += searchBtn();
      root.innerHTML = html;
    };

    const openPax = (anchor) => {
      const el = h('<div class="pax"></div>');
      const nums = (key, max, min) => { let s = ''; for (let i = min; i <= max; i++) s += `<button type="button" data-k="${key}" data-n="${i}" class="${st[key] === i ? 'on' : ''}">${i}</button>`; return s + `<button type="button" disabled>&gt;${max}</button>`; };
      const draw = () => {
        el.innerHTML = `<div class="pax-row"><div class="pax-g"><b>ADULTS (12y +)</b><small>on the day of travel</small><div class="nums">${nums('ad', 9, 1)}</div></div></div>
          <div class="pax-row two"><div class="pax-g"><b>CHILDREN (2y – 12y)</b><small>on the day of travel</small><div class="nums">${nums('ch', 6, 0)}</div></div><div class="pax-g"><b>INFANTS (below 2y)</b><small>on the day of travel</small><div class="nums">${nums('inf', 6, 0)}</div></div></div>
          <div class="pax-g"><b>CHOOSE TRAVEL CLASS</b><div class="nums cls">${D.cabinClasses.map((c) => `<button type="button" data-cls="${c.key}" class="${st.cls === c.key ? 'on' : ''}">${c.label}</button>`).join('')}</div></div>
          <div class="pax-foot"><span class="muted small">Planning a trip for more than 9 travellers? <a href="#" data-group>Create Group Booking</a></span><button type="button" class="btn-cta" data-apply>APPLY</button></div>`;
      };
      draw();
      el.addEventListener('click', (e) => {
        const b = e.target.closest('button,[data-group]');
        if (!b) return;
        if (b.hasAttribute('data-group')) { e.preventDefault(); TS.toast('Group bookings: our team will call you back'); return; }
        if (b.dataset.k) {
          const k = b.dataset.k, n = +b.dataset.n;
          const next = Object.assign({}, st, { [k]: n });
          if (next.ad + next.ch + next.inf > 9) { TS.toast('Maximum 9 travellers allowed per booking', 'err'); return; }
          if (next.inf > next.ad) { TS.toast('Number of infants cannot exceed adults', 'err'); return; }
          st[k] = n; draw();
        } else if (b.dataset.cls) { st.cls = b.dataset.cls; draw(); }
        else if (b.hasAttribute('data-apply')) { TS.closePopover(); render(); }
      });
      TS.popover(anchor, el, { cls: 'pop-pax', width: 560, align: 'right', onClose: render });
    };

    const fieldEl = (sel) => $(sel, root);
    const pickAirport = (anchor, cb, ph) => TS.pickList(anchor, { items, placeholder: ph, groupTitle: 'POPULAR CITIES', popularFilter: (i) => i.popular, onPick: (it) => cb(it.code) });

    wire(root, (e) => {
      const tgt = e.target;
      if (e.radio && tgt.name === 'trip') {
        st.trip = tgt.value;
        if (st.trip === 'round' && !st.ret) st.ret = d.iso(d.add(d.parse(st.dep), 3));
        if (st.trip === 'oneway') st.ret = '';
        render(); return;
      }
      const clr = tgt.closest('[data-clear]');
      if (clr) { st.ret = ''; st.trip = 'oneway'; render(); return; }
      if (tgt.closest('.swap')) { [st.from, st.to] = [st.to, st.from]; render(); return; }
      const fare = tgt.closest('[data-fare]');
      if (fare) { st.fare = fare.dataset.fare; render(); if (st.fare !== 'regular') TS.toast('Please carry a valid ID proof for ' + D.specialFares.find((f) => f.key === st.fare).label + ' fares'); return; }
      const act = tgt.closest('[data-act]');
      if (act) {
        if (act.dataset.act === 'addleg') { const last = st.legs[st.legs.length - 1]; st.legs.push({ from: last.to, to: last.to === 'DEL' ? 'BOM' : 'DEL', dep: d.iso(d.add(d.parse(last.dep), 2)) }); }
        if (act.dataset.act === 'rmleg') st.legs.splice(+act.closest('[data-leg]').dataset.leg, 1);
        render(); return;
      }
      const f = tgt.closest('[data-f]');
      if (!f) return;
      const key = f.dataset.f;
      const legRow = f.closest('[data-leg]');
      const li = legRow ? +legRow.dataset.leg : -1;
      if (key === 'from') pickAirport(f, (c) => { st.from = c; render(); setTimeout(() => fieldEl('[data-f="to"]').click(), 30); }, 'From');
      else if (key === 'to') pickAirport(f, (c) => { st.to = c; render(); setTimeout(() => fieldEl('[data-f="dep"]').click(), 30); }, 'To');
      else if (key === 'dep') TS.pickDate(f, { value: st.dep, priceFn: priceFn(st.from, st.to), title: 'Departure – prices shown are lowest one-way fares (₹)', onPick: (v) => { st.dep = v; if (st.ret && st.ret < v) st.ret = d.iso(d.add(d.parse(v), 2)); render(); } });
      else if (key === 'ret') TS.pickDate(f, { value: st.ret, min: d.parse(st.dep), start: st.dep, priceFn: priceFn(st.to, st.from), title: 'Return – prices shown are lowest one-way fares (₹)', onPick: (v) => { st.ret = v; st.trip = 'round'; render(); } });
      else if (key === 'pax') openPax(f);
      else if (key === 'lfrom') pickAirport(f, (c) => { st.legs[li].from = c; render(); }, 'From');
      else if (key === 'lto') pickAirport(f, (c) => { st.legs[li].to = c; if (st.legs[li + 1]) st.legs[li + 1].from = c; render(); }, 'To');
      else if (key === 'ldep') TS.pickDate(f, { value: st.legs[li].dep, min: li ? d.parse(st.legs[li - 1].dep) : d.today(), onPick: (v) => { st.legs[li].dep = v; for (let k = li + 1; k < st.legs.length; k++) if (st.legs[k].dep < v) st.legs[k].dep = v; render(); } });
    }, () => {
      const base = { trip: st.trip, ad: st.ad, ch: st.ch, inf: st.inf, cls: st.cls, fare: st.fare };
      if (st.trip === 'multi') {
        if (st.legs.some((l) => l.from === l.to)) { TS.toast('From and To cities cannot be the same', 'err'); return; }
        location.href = 'flights.html?' + TS.qs(Object.assign(base, { legs: st.legs.map((l) => `${l.from}.${l.to}.${l.dep}`).join(',') }));
      } else {
        if (st.from === st.to) { TS.toast('From and To cities cannot be the same', 'err'); return; }
        location.href = 'flights.html?' + TS.qs(Object.assign(base, { from: st.from, to: st.to, dep: st.dep, ret: st.trip === 'round' ? st.ret : '' }));
      }
    });
    render();
  };
  S.flightsFromParams = (p) => {
    const t = d.today();
    const o = { trip: p.trip || (p.ret ? 'round' : 'oneway'), from: TS.airport(p.from) ? p.from : 'DEL', to: TS.airport(p.to) ? p.to : 'BOM', dep: d.validFuture(p.dep, 1), ret: p.ret ? d.validFuture(p.ret, 4) : '', ad: TS.clamp(+p.ad || 1, 1, 9), ch: TS.clamp(+p.ch || 0, 0, 6), inf: TS.clamp(+p.inf || 0, 0, 6), cls: ['E', 'PE', 'B', 'F'].includes(p.cls) ? p.cls : 'E', fare: p.fare || 'regular' };
    if (o.ret && o.ret < o.dep) o.ret = d.iso(d.add(d.parse(o.dep), 2));
    if (o.trip === 'round' && !o.ret) o.ret = d.iso(d.add(d.parse(o.dep), 3));
    if (p.legs) {
      o.legs = p.legs.split(',').map((s) => { const [a, b, dt] = s.split('.'); return { from: TS.airport(a) ? a : 'DEL', to: TS.airport(b) ? b : 'BOM', dep: d.validFuture(dt, 1) }; });
      o.trip = 'multi';
    } else if (o.trip === 'multi') o.trip = 'oneway';
    if (!o.legs && t) o.legs = null;
    return o;
  };

  /* ================================================================ HOTELS / HOMESTAYS */
  const priceBands = [['', 'Any price'], ['0-1500', '₹0 – ₹1,500'], ['1500-2500', '₹1,500 – ₹2,500'], ['2500-5000', '₹2,500 – ₹5,000'], ['5000-10000', '₹5,000 – ₹10,000'], ['10000-', '₹10,000+']];
  S.priceBands = priceBands;
  S.hotels = function (root, init = {}, opts = {}) {
    const type = opts.type || init.type || 'hotel';
    const t = d.today();
    const st = Object.assign({ city: type === 'homestay' ? 'Manali' : 'Goa', in: d.iso(d.add(t, 1)), out: d.iso(d.add(t, 2)), rooms: 1, ad: 2, ch: 0, price: '', mode: 'upto4' }, init);
    const nights = () => Math.max(1, d.diff(st.out, st.in));
    const city = () => { const c = TS.hotelCity(st.city); return { v: esc(st.city), s: c ? esc(c.country) : 'India' }; };
    const guests = () => ({ v: `<b>${st.rooms}</b> <span class="mo">Room${st.rooms > 1 ? 's' : ''}</span> <b>${st.ad + st.ch}</b> <span class="mo">${st.ch ? 'Guests' : 'Adult' + (st.ad > 1 ? 's' : '')}</span>`, s: st.ch ? `${st.ad} Adults, ${st.ch} Child${st.ch > 1 ? 'ren' : ''}` : '&nbsp;' });
    const render = () => {
      const band = priceBands.find((b) => b[0] === st.price) || priceBands[0];
      root.innerHTML = `<div class="sw-top"><div class="trip-types">${radio('hmode', 'upto4', 'Upto 4 Rooms', st.mode === 'upto4')}${radio('hmode', 'group', 'Group Deals <span class="badge-new">new</span>', st.mode === 'group')}</div>${opts.compact ? '' : `<span class="sw-note">Book Domestic and International ${type === 'homestay' ? 'Homestays & Villas' : 'Property'} Online. To list your property <a href="#" data-list>click here</a></span>`}</div>
        <div class="flds flds-hotel">
          ${fld('city', type === 'homestay' ? 'City, Area or Property' : 'City, Property Name Or Location', city())}
          ${fld('in', 'Check-In', dateParts(st.in))}
          ${fld('out', 'Check-Out', dateParts(st.out))}
          ${fld('guests', 'Rooms & Guests', guests())}
          ${fld('price', 'Price Per Night', { v: `<span class="sm">${band[1]}</span>`, s: `${nights()} Night${nights() > 1 ? 's' : ''}` })}
        </div>
        ${opts.compact ? '' : `<div class="sw-bottom"><div class="trending"><span>Trending Searches:</span>${D.trending.slice(0, 5).map((c) => `<button type="button" data-trend="${c}">${c}, ${TS.hotelCity(c).country}</button>`).join('')}</div></div>`}
        ${searchBtn()}`;
    };
    const openGuests = (anchor) => {
      const el = h('<div class="guests"></div>');
      st.ages = st.ages || [];
      const draw = () => {
        el.innerHTML = counterRow('rooms', 'Rooms', '', st.rooms, 1, 8) + counterRow('ad', 'Adults', '(12+ Years)', st.ad, st.rooms, st.rooms * 4) + counterRow('ch', 'Children', '(0 – 12 Years)', st.ch, 0, 4) +
          (st.ch ? `<div class="ages">${Array.from({ length: st.ch }, (_, i) => `<label>Age of Child ${i + 1}<select data-age="${i}">${Array.from({ length: 13 }, (_, a) => `<option ${+(st.ages[i] ?? 5) === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>`).join('')}</div><p class="tiny">Please provide the right number of children along with their age for the best options and prices.</p>` : '') +
          '<div class="pax-foot"><span></span><button type="button" class="btn-cta" data-apply>APPLY</button></div>';
      };
      draw();
      el.addEventListener('change', (e) => { if (e.target.dataset.age) st.ages[+e.target.dataset.age] = +e.target.value; });
      el.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.inc) { st[b.dataset.inc]++; if (b.dataset.inc === 'rooms' && st.ad < st.rooms) st.ad = st.rooms; draw(); }
        else if (b.dataset.dec) { st[b.dataset.dec]--; if (st.ad > st.rooms * 4) st.ad = st.rooms * 4; draw(); }
        else if (b.hasAttribute('data-apply')) TS.closePopover();
      });
      TS.popover(anchor, el, { cls: 'pop-guests', width: 330, onClose: render });
    };
    wire(root, (e) => {
      const tgt = e.target;
      if (e.radio && tgt.name === 'hmode') { if (tgt.value === 'group') { TS.toast('Group deals: book 5+ rooms at special prices – our team will reach out'); } st.mode = tgt.value; render(); return; }
      if (tgt.closest('[data-list]')) { e.preventDefault && e.preventDefault(); TS.toast('List your property – coming soon in this demo'); return; }
      const tr = tgt.closest('[data-trend]');
      if (tr) { st.city = tr.dataset.trend; render(); return; }
      const f = tgt.closest('[data-f]');
      if (!f) return;
      const k = f.dataset.f;
      if (k === 'city') TS.pickList(f, { items: hotelCityItems(), placeholder: 'Where do you want to stay?', groupTitle: 'POPULAR DESTINATIONS', popularFilter: (i) => D.trending.includes(i.title), onPick: (it) => { st.city = it.title; render(); setTimeout(() => $('[data-f="in"]', root).click(), 30); } });
      else if (k === 'in') TS.pickDate(f, { value: st.in, start: st.in, end: st.out, title: 'Select check-in date', onPick: (v) => { st.in = v; if (st.out <= v) st.out = d.iso(d.add(d.parse(v), 1)); render(); setTimeout(() => $('[data-f="out"]', root).click(), 30); } });
      else if (k === 'out') TS.pickDate(f, { value: st.out, min: d.add(d.parse(st.in), 1), max: d.add(d.parse(st.in), 30), start: st.in, end: st.out, title: 'Select check-out date', onPick: (v) => { st.out = v; render(); } });
      else if (k === 'guests') openGuests(f);
      else if (k === 'price') listPop(f, priceBands, st.price, (v) => { st.price = v; render(); });
    }, () => {
      location.href = 'hotels.html?' + TS.qs({ city: st.city, in: st.in, out: st.out, rooms: st.rooms, ad: st.ad, ch: st.ch, price: st.price, type: type === 'homestay' ? 'homestay' : '' });
    });
    render();
  };
  S.hotelsFromParams = (p) => {
    const inD = d.validFuture(p.in, 1);
    let out = d.validFuture(p.out, 2);
    if (out <= inD) out = d.iso(d.add(d.parse(inD), 1));
    return { city: p.city || 'Goa', in: inD, out, rooms: TS.clamp(+p.rooms || 1, 1, 8), ad: TS.clamp(+p.ad || 2, 1, 32), ch: TS.clamp(+p.ch || 0, 0, 4), price: p.price || '', type: p.type === 'homestay' ? 'homestay' : 'hotel' };
  };

  /* ================================================================ HOLIDAYS */
  S.holidays = function (root, init = {}, opts = {}) {
    const t = d.today();
    const st = Object.assign({ from: 'New Delhi', to: '', date: d.iso(d.add(t, 14)), rooms: 1, ad: 2, budget: '' }, init);
    const dests = Array.from(new Set(D.packages.map((p) => p.dest)));
    const render = () => {
      root.innerHTML = `<div class="sw-top"><div class="trip-types">${radio('hl', 'pkg', 'Holiday Packages', true)}</div>${opts.compact ? '' : '<span class="sw-note">Customisable packages with flights, stays & sightseeing</span>'}</div>
        <div class="flds flds-holiday">
          ${fld('from', 'From City', { v: esc(st.from), s: 'India' })}
          ${fld('to', 'To City/Country/Category', st.to ? { v: esc(st.to), s: (D.packages.find((p) => p.dest === st.to) || {}).country || 'Theme' } : { v: '<span class="ph">Anywhere</span>', s: 'All destinations' })}
          ${fld('date', 'Departure Date', dateParts(st.date))}
          ${fld('guests', 'Rooms & Guests', { v: `<b>${st.rooms}</b> <span class="mo">Room</span> <b>${st.ad}</b> <span class="mo">Adults</span>`, s: '&nbsp;' })}
          ${fld('budget', 'Filters', { v: `<span class="sm">${st.budget ? { 0: 'Under ₹20,000', 1: '₹20,000 – ₹50,000', 2: '₹50,000+' }[st.budget] : 'Budget / Duration'}</span>`, s: 'Optional' })}
        </div>
        ${opts.compact ? '' : `<div class="sw-bottom"><div class="trending"><span>Themes:</span>${D.holidayThemes.slice(0, 6).map((c) => `<button type="button" data-theme="${c}">${c}</button>`).join('')}</div></div>`}
        ${searchBtn()}`;
    };
    wire(root, (e) => {
      const th = e.target.closest('[data-theme]');
      if (th) { location.href = 'holidays.html?' + TS.qs({ theme: th.dataset.theme, from: st.from }); return; }
      const f = e.target.closest('[data-f]');
      if (!f) return;
      const k = f.dataset.f;
      if (k === 'from') TS.pickList(f, { items: D.holidayFromCities.map((c) => ({ title: c, sub: 'India', icon: 'pin' })), placeholder: 'Starting city', onPick: (it) => { st.from = it.title; render(); } });
      else if (k === 'to') TS.pickList(f, { items: [{ title: 'Anywhere', sub: 'All destinations', icon: 'globe' }].concat(dests.map((x) => ({ title: x, sub: D.packages.find((p) => p.dest === x).country, icon: 'holiday' })), D.holidayThemes.map((th) => ({ title: th, sub: 'Theme', icon: 'sparkle' }))), placeholder: 'Destination or theme', groupTitle: 'TOP DESTINATIONS', onPick: (it) => { st.to = it.title === 'Anywhere' ? '' : it.title; render(); } });
      else if (k === 'date') TS.pickDate(f, { value: st.date, onPick: (v) => { st.date = v; render(); } });
      else if (k === 'guests') listPop(f, [['1-1', '1 Room, 1 Adult'], ['1-2', '1 Room, 2 Adults'], ['1-3', '1 Room, 3 Adults'], ['2-4', '2 Rooms, 4 Adults'], ['3-6', '3 Rooms, 6 Adults']], `${st.rooms}-${st.ad}`, (v) => { [st.rooms, st.ad] = v.split('-').map(Number); render(); });
      else if (k === 'budget') listPop(f, [['', 'Any budget'], ['0', 'Under ₹20,000'], ['1', '₹20,000 – ₹50,000'], ['2', '₹50,000+']], st.budget, (v) => { st.budget = v; render(); });
    }, () => {
      const isTheme = D.holidayThemes.includes(st.to);
      location.href = 'holidays.html?' + TS.qs({ from: st.from, to: isTheme ? '' : st.to, theme: isTheme ? st.to : '', date: st.date, rooms: st.rooms, ad: st.ad, budget: st.budget });
    });
    render();
  };

  /* ================================================================ TRAINS */
  S.trains = function (root, init = {}, opts = {}) {
    const t = d.today();
    const st = Object.assign({ mode: 'book', from: 'NDLS', to: 'BCT', date: d.iso(d.add(t, 1)), cls: 'ALL', pnr: '', train: '' }, init);
    const stv = (c) => { const s = TS.station(c); return { v: esc(s.city), s: `${s.code}, ${esc(s.name)}` }; };
    const render = () => {
      let body = '';
      if (st.mode === 'book') {
        body = `<div class="flds flds-train">${fld('from', 'From', stv(st.from))}<button class="swap" type="button" aria-label="Swap">${icon('swap', 18)}</button>${fld('to', 'To', stv(st.to))}${fld('date', 'Travel Date', dateParts(st.date))}${fld('cls', 'Class', { v: `<span class="sm">${st.cls}</span>`, s: D.trainClasses.find((c) => c.key === st.cls).label })}</div>`;
      } else if (st.mode === 'pnr') {
        body = `<div class="flds flds-one"><label class="fld fld-input"><span class="fld-l">PNR Number</span><input name="pnr" inputmode="numeric" maxlength="10" placeholder="Enter 10-digit PNR number" value="${esc(st.pnr)}"></label></div>`;
      } else {
        body = `<div class="flds flds-two"><label class="fld fld-input"><span class="fld-l">Train Number / Name</span><input name="train" placeholder="e.g. 12951" value="${esc(st.train)}"></label>${fld('day', 'Journey Start Day', { v: `<span class="sm">${st.day || 'Today'}</span>`, s: 'Starting station' })}</div>`;
      }
      root.innerHTML = `<div class="sw-top"><div class="trip-types">${radio('tmode', 'book', 'Book Train Tickets', st.mode === 'book')}${radio('tmode', 'pnr', 'Check PNR Status', st.mode === 'pnr')}${radio('tmode', 'live', 'Live Train Status', st.mode === 'live')}</div>${opts.compact ? '' : '<span class="sw-note">Train Ticket Booking – IRCTC-style booking demo</span>'}</div>${body}${opts.compact ? '' : '<div class="sw-bottom"><div class="sw-extra">' + icon('check', 16) + ' Free cancellation on select trains &nbsp; ' + icon('check', 16) + ' Instant refunds &nbsp; ' + icon('check', 16) + ' Zero gateway fee on UPI</div></div>'}${searchBtn(st.mode === 'book' ? 'SEARCH' : st.mode === 'pnr' ? 'CHECK STATUS' : 'CHECK LIVE STATUS')}`;
    };
    wire(root, (e) => {
      const tgt = e.target;
      if (e.radio && tgt.name === 'tmode') { st.mode = tgt.value; render(); return; }
      if (tgt.closest('.swap')) { [st.from, st.to] = [st.to, st.from]; render(); return; }
      const f = tgt.closest('[data-f]');
      if (!f) return;
      const k = f.dataset.f;
      if (k === 'from' || k === 'to') TS.pickList(f, { items: stationItems(), placeholder: 'Station or city', groupTitle: 'POPULAR STATIONS', popularFilter: (i) => ['NDLS', 'BCT', 'SBC', 'MAS', 'HWH', 'SC', 'JP', 'PUNE'].includes(i.code), onPick: (it) => { st[k] = it.code; render(); } });
      else if (k === 'date') TS.pickDate(f, { value: st.date, max: d.add(d.today(), 120), title: 'Bookings open up to 120 days in advance', onPick: (v) => { st.date = v; render(); } });
      else if (k === 'cls') listPop(f, D.trainClasses.map((c) => [c.key, `${c.key === 'ALL' ? '' : c.key + ' – '}${c.label}`]), st.cls, (v) => { st.cls = v; render(); });
      else if (k === 'day') listPop(f, ['Yesterday', 'Today', 'Tomorrow'], st.day || 'Today', (v) => { st.day = v; render(); });
    }, () => {
      if (st.mode === 'book') {
        if (st.from === st.to) { TS.toast('Source and destination stations cannot be the same', 'err'); return; }
        location.href = 'trains.html?' + TS.qs({ from: st.from, to: st.to, date: st.date, cls: st.cls });
      } else if (st.mode === 'pnr') {
        st.pnr = $('[name=pnr]', root).value.trim();
        if (!/^\d{10}$/.test(st.pnr)) { TS.toast('Please enter a valid 10-digit PNR number', 'err'); return; }
        S.showPnr(st.pnr);
      } else {
        st.train = $('[name=train]', root).value.trim();
        if (!st.train) { TS.toast('Please enter a train number or name', 'err'); return; }
        S.showLive(st.train, st.day || 'Today');
      }
    });
    render();
  };
  S.showPnr = (pnr) => {
    const r = TS.rng(TS.hash(pnr));
    const a = TS.pick(r, D.stations), b = TS.pick(r, D.stations.filter((x) => x !== a));
    const pax = 1 + Math.floor(r() * 3);
    const cls = TS.pick(r, ['3A', '2A', 'SL']);
    const dt = d.add(d.today(), 1 + Math.floor(r() * 20));
    const rows = Array.from({ length: pax }, (_, i) => { const ok = r() > 0.3; return `<tr><td>Passenger ${i + 1}</td><td>${ok ? 'CNF' : 'WL ' + (3 + Math.floor(r() * 30))}</td><td class="${ok ? 'ok' : 'wl'}">${ok ? `CNF / ${cls === 'SL' ? 'S' : cls === '3A' ? 'B' : 'A'}${1 + Math.floor(r() * 8)} / ${1 + Math.floor(r() * 64)}` : 'RAC ' + (1 + Math.floor(r() * 20))}</td></tr>`; }).join('');
    TS.modal({ title: 'PNR Status – ' + pnr, body: `<div class="pnr"><div class="pnr-h"><div><b>${String(12000 + Math.floor(r() * 9999))} – ${b.city.split(' ').pop()} Superfast Express</b><small>${d.nice(dt)} · Class ${cls}</small></div><span class="chip ok">Chart not prepared</span></div><div class="pnr-route"><div><b>${a.code}</b><small>${a.name}</small></div>${icon('arrowR', 20)}<div><b>${b.code}</b><small>${b.name}</small></div></div><table class="tbl"><thead><tr><th>Passenger</th><th>Booking Status</th><th>Current Status</th></tr></thead><tbody>${rows}</tbody></table><p class="tiny">Demo data generated for illustration only.</p></div>` });
  };
  S.showLive = (train, day) => {
    const r = TS.rng(TS.hash(train + day));
    const route = TS.shuffle(r, D.stations).slice(0, 6);
    const cur = 1 + Math.floor(r() * 4);
    let tm = 360 + Math.floor(r() * 300);
    const rows = route.map((s, i) => { tm += 90 + Math.floor(r() * 120); const late = Math.floor(r() * 25); return `<li class="${i < cur ? 'done' : i === cur ? 'now' : ''}"><i></i><div><b>${s.name}</b><small>${s.code}</small></div><div class="tr">${TS.hm(tm)}<small class="${late > 10 ? 'late' : 'ontime'}">${late > 10 ? late + ' min late' : 'On time'}</small></div></li>`; }).join('');
    TS.modal({ title: `Live Status – ${esc(train)}`, body: `<p class="muted">Journey started ${esc(day.toLowerCase())}. Last updated 2 mins ago.</p><ul class="live">${rows}</ul><p class="tiny">Demo data generated for illustration only.</p>` });
  };

  /* ================================================================ BUSES */
  S.buses = function (root, init = {}, opts = {}) {
    const t = d.today();
    const st = Object.assign({ from: 'New Delhi', to: 'Manali', date: d.iso(d.add(t, 1)) }, init);
    const cv = (c) => { const x = TS.roadCity(c); return { v: esc(c), s: x ? esc(x.state) : '' }; };
    const render = () => {
      root.innerHTML = `<div class="sw-top"><div class="trip-types">${radio('bm', 'bus', 'Bus Tickets', true)}</div>${opts.compact ? '' : '<span class="sw-note">Bus Ticket Booking. Travelling with a group? <a href="#" data-hire>Hire a bus</a></span>'}</div>
        <div class="flds flds-bus">${fld('from', 'From', cv(st.from))}<button class="swap" type="button" aria-label="Swap">${icon('swap', 18)}</button>${fld('to', 'To', cv(st.to))}${fld('date', 'Travel Date', dateParts(st.date))}</div>
        ${opts.compact ? '' : `<div class="sw-bottom"><div class="trending"><span>Quick dates:</span><button type="button" data-q="0">Today</button><button type="button" data-q="1">Tomorrow</button><button type="button" data-q="2">Day after</button></div></div>`}
        ${searchBtn()}`;
    };
    wire(root, (e) => {
      const tgt = e.target;
      if (tgt.closest('[data-hire]')) { TS.toast('Bus hire – our team will call you back'); return; }
      if (tgt.closest('.swap')) { [st.from, st.to] = [st.to, st.from]; render(); return; }
      const q = tgt.closest('[data-q]');
      if (q) { st.date = d.iso(d.add(d.today(), +q.dataset.q)); render(); return; }
      const f = tgt.closest('[data-f]');
      if (!f) return;
      const k = f.dataset.f;
      if (k === 'from' || k === 'to') TS.pickList(f, { items: roadItems(), placeholder: 'Enter city', groupTitle: 'POPULAR CITIES', popularFilter: (i) => ['New Delhi', 'Manali', 'Mumbai', 'Pune', 'Bengaluru', 'Goa', 'Jaipur', 'Hyderabad'].includes(i.title), onPick: (it) => { st[k] = it.title; render(); } });
      else if (k === 'date') TS.pickDate(f, { value: st.date, onPick: (v) => { st.date = v; render(); } });
    }, () => {
      if (st.from === st.to) { TS.toast('From and To cities cannot be the same', 'err'); return; }
      location.href = 'buses.html?' + TS.qs({ from: st.from, to: st.to, date: st.date });
    });
    render();
  };

  /* ================================================================ CABS */
  S.cabs = function (root, init = {}, opts = {}) {
    const t = d.today();
    const st = Object.assign({ mode: 'oneway', from: 'New Delhi', to: 'Agra', date: d.iso(d.add(t, 1)), ret: d.iso(d.add(t, 2)), time: '10:00', pkg: D.rentalPackages[2], dir: 'to', airport: 'DEL' }, init);
    const cv = (c) => { const x = TS.roadCity(c); return { v: esc(c), s: x ? esc(x.state) : '' }; };
    const render = () => {
      let f = '';
      const tm = fld('time', 'Pickup Time', { v: `<span class="sm">${fmt12(st.time)}</span>`, s: '&nbsp;' });
      if (st.mode === 'oneway') f = fld('from', 'From', cv(st.from)) + `<button class="swap" type="button" aria-label="Swap">${icon('swap', 18)}</button>` + fld('to', 'To', cv(st.to)) + fld('date', 'Departure', dateParts(st.date)) + tm;
      else if (st.mode === 'round') f = fld('from', 'From', cv(st.from)) + fld('to', 'To', cv(st.to)) + fld('date', 'Departure', dateParts(st.date)) + fld('ret', 'Return', dateParts(st.ret)) + tm;
      else if (st.mode === 'airport') { const a = TS.airport(st.airport); f = fld('dir', 'Transfer Type', { v: `<span class="sm">${st.dir === 'to' ? 'Drop to Airport' : 'Pickup from Airport'}</span>`, s: '&nbsp;' }) + fld('airport', 'Airport', { v: esc(a.city), s: a.code + ', ' + esc(a.name) }) + fld('from', st.dir === 'to' ? 'Pickup Location' : 'Drop Location', cv(st.from)) + fld('date', 'Date', dateParts(st.date)) + tm; }
      else f = fld('from', 'Pickup City', cv(st.from)) + fld('pkg', 'Package', { v: `<span class="sm">${st.pkg}</span>`, s: 'Extra km/hr charged separately' }) + fld('date', 'Pickup Date', dateParts(st.date)) + tm;
      root.innerHTML = `<div class="sw-top"><div class="trip-types">${[['oneway', 'Outstation One-Way'], ['round', 'Outstation Round-Trip'], ['airport', 'Airport Transfers'], ['hourly', 'Hourly Rentals']].map(([k, l]) => radio('cmode', k, l, st.mode === k)).join('')}</div>${opts.compact ? '' : '<span class="sw-note">Online Cab Booking</span>'}</div><div class="flds flds-cab flds-${st.mode}">${f}</div>${searchBtn()}`;
    };
    wire(root, (e) => {
      const tgt = e.target;
      if (e.radio && tgt.name === 'cmode') { st.mode = tgt.value; if (st.mode === 'airport' && !D.airports.some((a) => a.city === st.from)) st.airport = 'DEL'; render(); return; }
      if (tgt.closest('.swap')) { [st.from, st.to] = [st.to, st.from]; render(); return; }
      const f = tgt.closest('[data-f]');
      if (!f) return;
      const k = f.dataset.f;
      if (k === 'from' || k === 'to') TS.pickList(f, { items: roadItems(), placeholder: 'Enter city', groupTitle: 'POPULAR CITIES', popularFilter: (i) => ['New Delhi', 'Agra', 'Jaipur', 'Mumbai', 'Pune', 'Bengaluru', 'Chandigarh', 'Shimla'].includes(i.title), onPick: (it) => { st[k] = it.title; render(); } });
      else if (k === 'date') TS.pickDate(f, { value: st.date, onPick: (v) => { st.date = v; if (st.ret < v) st.ret = v; render(); } });
      else if (k === 'ret') TS.pickDate(f, { value: st.ret, min: d.parse(st.date), start: st.date, onPick: (v) => { st.ret = v; render(); } });
      else if (k === 'time') listPop(f, timeOpts().map((x) => [x, fmt12(x)]), st.time, (v) => { st.time = v; render(); }, 180);
      else if (k === 'pkg') listPop(f, D.rentalPackages, st.pkg, (v) => { st.pkg = v; render(); });
      else if (k === 'dir') listPop(f, [['to', 'Drop to Airport'], ['from', 'Pickup from Airport']], st.dir, (v) => { st.dir = v; render(); });
      else if (k === 'airport') TS.pickList(f, { items: airportItems().filter((i) => !i.data.intl), placeholder: 'Airport', onPick: (it) => { st.airport = it.code; render(); } });
    }, () => {
      if ((st.mode === 'oneway' || st.mode === 'round') && st.from === st.to) { TS.toast('Pickup and drop cities cannot be the same', 'err'); return; }
      location.href = 'cabs.html?' + TS.qs({ mode: st.mode, from: st.from, to: st.mode === 'oneway' || st.mode === 'round' ? st.to : '', date: st.date, ret: st.mode === 'round' ? st.ret : '', time: st.time, pkg: st.mode === 'hourly' ? st.pkg : '', airport: st.mode === 'airport' ? st.airport : '', dir: st.mode === 'airport' ? st.dir : '' });
    });
    render();
  };

  /* ================================================================ VISA */
  S.visa = function (root) {
    const st = { country: 'United Arab Emirates', from: d.iso(d.add(d.today(), 20)), to: d.iso(d.add(d.today(), 27)), pax: 1 };
    const render = () => {
      root.innerHTML = `<div class="sw-top"><div class="trip-types">${radio('vm', 'tour', 'Tourist Visa', true)}</div><span class="sw-note">99% visa approval rate · Doorstep document pickup</span></div>
        <div class="flds flds-visa">${fld('country', 'Destination', { v: esc(st.country), s: 'Tourist visa' })}${fld('from', 'Travel Date', dateParts(st.from))}${fld('to', 'Return Date', dateParts(st.to))}${fld('pax', 'Travellers', { v: `<b>${st.pax}</b> <span class="mo">Traveller${st.pax > 1 ? 's' : ''}</span>`, s: '&nbsp;' })}</div>
        ${searchBtn('CHECK VISA')}`;
    };
    wire(root, (e) => {
      const f = e.target.closest('[data-f]');
      if (!f) return;
      const k = f.dataset.f;
      if (k === 'country') TS.pickList(f, { items: D.visaCountries.map((c) => ({ title: c, sub: 'Tourist visa', icon: 'visa' })), placeholder: 'Where are you going?', groupTitle: 'POPULAR VISAS', onPick: (it) => { st.country = it.title; render(); } });
      else if (k === 'from') TS.pickDate(f, { value: st.from, onPick: (v) => { st.from = v; if (st.to < v) st.to = d.iso(d.add(d.parse(v), 5)); render(); } });
      else if (k === 'to') TS.pickDate(f, { value: st.to, min: d.parse(st.from), start: st.from, onPick: (v) => { st.to = v; render(); } });
      else if (k === 'pax') listPop(f, [1, 2, 3, 4, 5, 6], st.pax, (v) => { st.pax = +v; render(); }, 160);
    }, () => {
      const r = TS.rng(TS.hash(st.country));
      const fee = Math.round((2500 + r() * 9000) / 100) * 100 - 1;
      const days = 3 + Math.floor(r() * 10);
      const m = TS.modal({ title: `${esc(st.country)} – Tourist Visa`, body: `<div class="visa-q"><div class="vq-row"><div><small>Processing time</small><b>${days} working days</b></div><div><small>Stay validity</small><b>${r() > 0.5 ? 30 : 60} days</b></div><div><small>Fee per traveller</small><b>${TS.inr(fee)}</b></div></div><h5>Documents required</h5><ul class="ticks"><li>${icon('check', 16)} Passport valid for 6+ months with 2 blank pages</li><li>${icon('check', 16)} Recent passport-size photograph (white background)</li><li>${icon('check', 16)} Confirmed return flight tickets</li><li>${icon('check', 16)} Hotel booking / invitation letter</li><li>${icon('check', 16)} Last 3 months' bank statement</li></ul><div class="row-between"><div><small class="muted">Total for ${st.pax} traveller${st.pax > 1 ? 's' : ''}</small><div class="price-lg">${TS.inr(fee * st.pax)}</div></div><button class="btn-cta" data-apply>APPLY NOW</button></div></div>` });
      $('[data-apply]', m.el).addEventListener('click', () => {
        m.close();
        TS.checkout.go({ type: 'visa', title: `${st.country} Tourist Visa`, subtitle: `${d.nice(st.from)} – ${d.nice(st.to)}`, date: st.from, pax: { ad: st.pax, ch: 0, inf: 0 }, base: fee * st.pax, taxes: Math.round(fee * st.pax * 0.18), fees: 0, itinerary: `<div class="it-simple">${icon('visa', 28)}<div><b>${esc(st.country)} – Tourist Visa</b><small>${st.pax} traveller(s) · Processing ${days} working days · Travel ${d.nice(st.from)}</small></div></div>` });
      });
    });
    render();
  };

  /* ================================================================ FOREX */
  S.forex = function (root) {
    const st = { product: 'card', city: 'New Delhi', cur: 'USD', amt: 1000 };
    const render = () => {
      const c = D.currencies.find((x) => x.code === st.cur);
      root.innerHTML = `<div class="sw-top"><div class="trip-types">${radio('fx', 'card', 'Forex Card', st.product === 'card')}${radio('fx', 'cash', 'Currency Notes', st.product === 'cash')}</div><span class="sw-note">Zero markup on forex card · Free doorstep delivery</span></div>
        <div class="flds flds-forex">${fld('city', 'Delivery City', { v: esc(st.city), s: 'India' })}${fld('cur', 'Currency', { v: `<span class="sm">${c.code}</span>`, s: c.name })}<label class="fld fld-input"><span class="fld-l">Amount (${c.code})</span><input name="amt" type="number" min="100" step="50" value="${st.amt}"></label><div class="fld fld-static"><span class="fld-l">You Pay (approx.)</span><span class="fld-v"><span class="sm fx-out">${TS.inr(st.amt * c.rate)}</span></span><span class="fld-s">1 ${c.code} = ₹${c.rate}</span></div></div>
        ${searchBtn('BOOK FOREX')}`;
    };
    wire(root, (e) => {
      const tgt = e.target;
      if (e.radio && tgt.name === 'fx') { st.product = tgt.value; render(); return; }
      const f = tgt.closest('[data-f]');
      if (!f) return;
      if (f.dataset.f === 'city') TS.pickList(f, { items: D.holidayFromCities.map((x) => ({ title: x, sub: 'India', icon: 'pin' })), placeholder: 'City', onPick: (it) => { st.city = it.title; render(); } });
      else if (f.dataset.f === 'cur') listPop(f, D.currencies.map((x) => [x.code, `${x.code} – ${x.name}`]), st.cur, (v) => { st.cur = v; render(); });
    }, () => {
      st.amt = Math.max(100, +$('[name=amt]', root).value || 0);
      const c = D.currencies.find((x) => x.code === st.cur);
      const inrAmt = Math.round(st.amt * c.rate);
      TS.checkout.go({ type: 'forex', title: `${st.product === 'card' ? 'Forex Card' : 'Currency Notes'} – ${st.amt} ${c.code}`, subtitle: `Delivery in ${st.city}`, date: d.iso(d.add(d.today(), 2)), pax: { ad: 1, ch: 0, inf: 0 }, base: inrAmt, taxes: Math.round(inrAmt * 0.0018) + 45, fees: st.product === 'card' ? 0 : 99, noTravellers: true, itinerary: `<div class="it-simple">${icon('forex', 28)}<div><b>${st.amt} ${c.code} ${st.product === 'card' ? 'loaded on Forex Card' : 'in currency notes'}</b><small>Rate 1 ${c.code} = ₹${c.rate} · Doorstep delivery in ${esc(st.city)} within 48 hours</small></div></div>` });
    });
    root.addEventListener('input', (e) => {
      if (e.target.name !== 'amt') return;
      const c = D.currencies.find((x) => x.code === st.cur);
      st.amt = +e.target.value || 0;
      $('.fx-out', root).textContent = TS.inr(st.amt * c.rate);
    });
    render();
  };

  /* ================================================================ INSURANCE */
  S.insurance = function (root) {
    const st = { region: 'Asia (excluding Japan)', from: d.iso(d.add(d.today(), 10)), to: d.iso(d.add(d.today(), 17)), pax: 1 };
    const regions = ['India (Domestic)', 'Asia (excluding Japan)', 'Europe (Schengen)', 'USA & Canada', 'Worldwide'];
    const render = () => {
      root.innerHTML = `<div class="sw-top"><div class="trip-types">${radio('ins', 'single', 'Single Trip', true)}</div><span class="sw-note">Covers medical emergencies, trip delays, baggage loss and more</span></div>
        <div class="flds flds-ins">${fld('region', 'Destination', { v: `<span class="sm">${esc(st.region)}</span>`, s: 'Region' })}${fld('from', 'Trip Start', dateParts(st.from))}${fld('to', 'Trip End', dateParts(st.to))}${fld('pax', 'Travellers', { v: `<b>${st.pax}</b> <span class="mo">Traveller${st.pax > 1 ? 's' : ''}</span>`, s: 'Age up to 70 years' })}</div>
        ${searchBtn('VIEW PLANS')}`;
    };
    wire(root, (e) => {
      const f = e.target.closest('[data-f]');
      if (!f) return;
      const k = f.dataset.f;
      if (k === 'region') listPop(f, regions, st.region, (v) => { st.region = v; render(); }, 260);
      else if (k === 'from') TS.pickDate(f, { value: st.from, onPick: (v) => { st.from = v; if (st.to < v) st.to = d.iso(d.add(d.parse(v), 5)); render(); } });
      else if (k === 'to') TS.pickDate(f, { value: st.to, min: d.parse(st.from), start: st.from, onPick: (v) => { st.to = v; render(); } });
      else if (k === 'pax') listPop(f, [1, 2, 3, 4, 5, 6], st.pax, (v) => { st.pax = +v; render(); }, 160);
    }, () => {
      const days = Math.max(1, d.diff(st.to, st.from) + 1);
      const rf = [0.4, 1, 1.6, 2.4, 2.8][regions.indexOf(st.region)];
      const plans = [
        { n: 'Essential', cover: st.region.startsWith('India') ? '₹5 Lakh' : '$50,000', p: Math.round((60 + days * 28) * rf) },
        { n: 'Smart', cover: st.region.startsWith('India') ? '₹10 Lakh' : '$1,00,000', p: Math.round((90 + days * 41) * rf), best: 1 },
        { n: 'Premium', cover: st.region.startsWith('India') ? '₹25 Lakh' : '$5,00,000', p: Math.round((140 + days * 66) * rf) },
      ];
      const m = TS.modal({ title: `Travel insurance plans · ${days} day${days > 1 ? 's' : ''}`, body: `<div class="plans">${plans.map((p, i) => `<div class="plan ${p.best ? 'best' : ''}">${p.best ? '<span class="plan-tag">MOST POPULAR</span>' : ''}<h5>${p.n}</h5><div class="plan-cover">Medical cover <b>${p.cover}</b></div><ul class="ticks">${['Medical emergencies & hospitalisation', 'Trip delay & cancellation', i ? 'Baggage loss & delay' : 'Passport loss', i > 1 ? 'Adventure sports cover' : 'Personal accident'].map((x) => `<li>${icon('check', 14)} ${x}</li>`).join('')}</ul><div class="plan-p">${TS.inr(p.p * st.pax)}<small>for ${st.pax} traveller${st.pax > 1 ? 's' : ''} (incl. GST)</small></div><button class="btn-cta btn-block" data-plan="${i}">BUY NOW</button></div>`).join('')}</div>` });
      m.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-plan]');
        if (!b) return;
        const p = plans[+b.dataset.plan];
        const total = p.p * st.pax;
        m.close();
        TS.checkout.go({ type: 'insurance', title: `${p.n} Travel Insurance`, subtitle: `${st.region} · ${d.nice(st.from)} – ${d.nice(st.to)}`, date: st.from, pax: { ad: st.pax, ch: 0, inf: 0 }, base: Math.round(total / 1.18), taxes: total - Math.round(total / 1.18), fees: 0, itinerary: `<div class="it-simple">${icon('shield', 28)}<div><b>${p.n} plan · Medical cover ${p.cover}</b><small>${esc(st.region)} · ${days} days · ${st.pax} traveller(s)</small></div></div>` });
      });
    });
    render();
  };

  /* ================================================================ Mount a search form */
  S.mount = (root, product, init = {}, opts = {}) => {
    root.innerHTML = '';
    const form = h('<form class="sw-form" novalidate></form>');
    root.appendChild(form);
    const map = { flights: S.flights, hotels: S.hotels, homestays: (r, i, o) => S.hotels(r, i, Object.assign({}, o, { type: 'homestay' })), holidays: S.holidays, trains: S.trains, buses: S.buses, cabs: S.cabs, visa: S.visa, forex: S.forex, insurance: S.insurance };
    (map[product] || S.flights)(form, init, opts);
    const band = opts.compact && root.closest('.srch-band');
    if (band && !$('.srch-toggle', band)) {
      const tg = h(`<button type="button" class="srch-toggle" aria-expanded="false"><b>Modify search</b><span>${icon('edit', 14)} EDIT</span></button>`);
      tg.addEventListener('click', () => { const o = band.classList.toggle('open'); tg.setAttribute('aria-expanded', o); $('span', tg).innerHTML = o ? icon('x', 14) + ' CLOSE' : icon('edit', 14) + ' EDIT'; });
      band.firstElementChild.prepend(tg);
    }
    return form;
  };
})();
