/* TripSaathi – home page */
(function () {
  const D = window.TS_DATA;
  const { $, $$, h, esc, icon, d } = TS;
  TS.mountChrome({ page: 'home' });

  /* hero backdrop */
  $('#heroBg').innerHTML = TS.scene('mountain', 11);

  /* product tabs + search widget */
  const params = TS.params();
  let tab = TS.products.some((p) => p.key === params.tab) ? params.tab : (location.hash.slice(1) || 'flights');
  if (!TS.products.some((p) => p.key === tab)) tab = 'flights';
  const tabs = $('#swTabs');
  const sw = $('#sw');
  const drawTabs = () => {
    tabs.innerHTML = TS.products.map((p) => `<button type="button" class="sw-tab ${p.key === tab ? 'on' : ''}" data-tab="${p.key}">${icon(p.icon, 26)}<span>${p.label}</span></button>`).join('');
  };
  const mount = () => {
    const last = TS.store.get('last_' + tab, {});
    if (tab === 'flights') TS.Search.mount(sw, 'flights', TS.Search.flightsFromParams(last));
    else if (tab === 'hotels' || tab === 'homestays') TS.Search.mount(sw, tab, last.city ? TS.Search.hotelsFromParams(last) : {});
    else TS.Search.mount(sw, tab, {});
  };
  drawTabs();
  mount();
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b || b.dataset.tab === tab) return;
    tab = b.dataset.tab;
    TS.closePopover();
    history.replaceState(null, '', 'index.html?tab=' + tab);
    drawTabs();
    mount();
    b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  });

  /* quick links */
  const quick = [
    { t: 'Offers', s: 'Coupons & deals', ic: 'tag', c: '#f0386b', href: 'offers.html' },
    { t: 'Holiday Ideas', s: 'Plan by theme', ic: 'holiday', c: '#0891b2', href: 'holidays.html' },
    { t: 'My Trips', s: 'Manage bookings', ic: 'bag', c: '#7c3aed', href: 'mytrips.html' },
    { t: 'Gift Cards', s: 'Gift a getaway', ic: 'gift', c: '#ea580c', demo: 1 },
    { t: 'TripCoins', s: 'Earn & redeem', ic: 'wallet', c: '#059669', demo: 1 },
    { t: '24×7 Support', s: 'We are here', ic: 'headset', c: '#1a6cf0', demo: 1 },
  ];
  $('#quick').innerHTML = quick.map((q) => `<a href="${q.href || '#'}" ${q.demo ? `data-demo="${q.t}"` : ''}><span class="qi" style="background:${q.c}">${icon(q.ic, 20)}</span><span>${q.t}<small>${q.s}</small></span></a>`).join('');
  $$('#quick [data-demo]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); TS.toast(a.dataset.demo + ' – coming soon in this demo'); }));

  /* offers */
  const cats = ['All Offers', 'Bank Offers', 'Flights', 'Hotels', 'Holidays', 'Trains', 'Cabs', 'Bus'];
  let cat = 'All Offers';
  const target = { Flights: 'index.html?tab=flights', Hotels: 'index.html?tab=hotels', Holidays: 'holidays.html', Trains: 'index.html?tab=trains', Cabs: 'index.html?tab=cabs', Bus: 'index.html?tab=buses', 'Bank Offers': 'offers.html' };
  TS.offerCard = (o, i) => `<article class="oc"><div class="oc-img">${TS.scene(o.kind, i + 3)}</div><div class="oc-body"><span class="oc-tag">${o.tag}</span><h4>${esc(o.title)}</h4><p>${esc(o.desc)}</p><div class="oc-foot"><button type="button" class="code-pill" data-copy="${o.code}" title="Copy code">${icon('copy', 13)} ${o.code}</button><a href="${target[o.cat] || 'offers.html'}">BOOK NOW</a></div><div class="oc-foot" style="border:0;margin:0;padding:0"><span>T&amp;C's Apply</span></div></div></article>`;
  const drawOffers = () => {
    $('#offerTabs').innerHTML = cats.map((c) => `<button type="button" class="${c === cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('');
    const list = D.offers.filter((o) => cat === 'All Offers' || o.cat === cat);
    $('#offerTrack').innerHTML = list.map(TS.offerCard).join('');
    $('#offerTrack').scrollLeft = 0;
  };
  drawOffers();
  $('#offerTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { cat = b.dataset.cat; drawOffers(); } });
  $$('#offers .arrows button').forEach((b) => b.addEventListener('click', () => { const tr = $('#offerTrack'); tr.scrollBy({ left: +b.dataset.dir * tr.clientWidth * 0.9, behavior: 'smooth' }); }));
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-copy]');
    if (!c) return;
    const code = c.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => TS.toast(`Code ${code} copied`, 'ok'), () => TS.toast(`Use code ${code} at checkout`));
  });

  /* app banner */
  const qr = () => {
    const r = TS.rng(TS.hash('tripsaathi-app'));
    const n = 21, s = 100 / n;
    let cells = '';
    const finder = (x, y) => `<rect x="${x * s}" y="${y * s}" width="${7 * s}" height="${7 * s}" fill="#0b1437"/><rect x="${(x + 1) * s}" y="${(y + 1) * s}" width="${5 * s}" height="${5 * s}" fill="#fff"/><rect x="${(x + 2) * s}" y="${(y + 2) * s}" width="${3 * s}" height="${3 * s}" fill="#0b1437"/>`;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!inF && r() > 0.52) cells += `<rect x="${x * s}" y="${y * s}" width="${s + 0.2}" height="${s + 0.2}" fill="#0b1437"/>`;
    }
    return `<svg viewBox="0 0 100 100" width="100%" height="100%">${cells}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}<rect x="40" y="40" width="20" height="20" rx="4" fill="#fff"/><g transform="translate(42 42) scale(.333)">${TS.logoMark(48).replace(/<svg[^>]*>|<\/svg>/g, '')}</g></svg>`;
  };
  $('#qr').innerHTML = qr();
  $('#phoneMock').innerHTML = `${TS.logoMark(40)}<span>tripsaathi</span>`;
  $('#appGet').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#appGet input').value.trim();
    if (!/^[6-9]\d{9}$/.test(v)) { TS.toast('Please enter a valid 10-digit mobile number', 'err'); return; }
    TS.toast('App download link sent to +91 ' + v, 'ok');
    $('#appGet input').value = '';
  });

  /* popular routes */
  const dep = d.iso(d.add(d.today(), 7));
  $('#routes').innerHTML = D.popularRoutes.slice(0, 8).map(([a, b], i) => {
    const A = TS.airport(a), B = TS.airport(b);
    const kind = (TS.hotelCity(B.city) || { kind: B.intl ? 'city' : 'heritage' }).kind;
    return `<a class="route" href="flights.html?${TS.qs({ from: a, to: b, dep })}"><span class="rt-im">${TS.scene(kind, i + 20)}</span><span><b>${A.city} → ${B.city}</b><small>${d.short(dep)} · from <b style="display:inline">${TS.inr(TS.gen.minFare(a, b, dep, 'E'))}</b></small></span></a>`;
  }).join('');

  /* collections */
  $('#collections').innerHTML = D.collections.map((c, i) => `<a class="coll" href="${c.link}">${TS.scene(c.kind, i + 40)}<div class="coll-t"><span>${c.tag}</span><h4>${esc(c.title)}</h4></div></a>`).join('');

  /* packages */
  $('#pkgRow').innerHTML = ['p3', 'p10', 'p5', 'p8'].map((id, i) => {
    const p = D.packages.find((x) => x.id === id);
    const n = p.cities.reduce((a, c) => a + c[1], 0);
    return `<a class="pkg-mini" href="holidays.html?pkg=${p.id}"><div class="im">${TS.scene(p.kind, i + 60)}<span>${n}N/${n + 1}D</span></div><div class="bd"><h4>${esc(p.name)}</h4><small>${p.cities.map((c) => c[1] + 'N ' + c[0]).join(' · ')}</small><div class="pr">${TS.inr(p.price)} <small class="muted">per person</small></div></div></a>`;
  }).join('');

  /* hidden gems */
  $('#gems').innerHTML = D.hiddenGems.map((g, i) => `<a class="gem" href="hotels.html?city=${encodeURIComponent(g.name)}"><div class="gem-img">${TS.scene(g.kind, i + 80)}</div><div class="gem-b"><h4>${g.name}</h4><small>${g.state}</small><p>${esc(g.tag)}</p></div></a>`).join('');

  /* trust */
  $('#trust').innerHTML = [
    ['trophy', '10 Million+', 'Happy travellers'],
    ['shield', 'Secure payments', '256-bit encryption'],
    ['refund', 'Instant refunds', 'On eligible cancellations'],
    ['headset', '24×7 support', 'Call, chat or email'],
  ].map(([ic, b, s]) => `<div><span class="ti">${icon(ic, 22)}</span><span><b>${b}</b><small>${s}</small></span></div>`).join('');
})();
