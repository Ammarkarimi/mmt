/* TripSaathi – offers page */
(function () {
  const D = window.TS_DATA;
  const { $, h, esc, icon } = TS;
  TS.mountChrome({ page: 'offers' });
  const hero = h(`<div class="page-hero"><div class="container"><h1>Offers for you</h1><p>Handpicked deals on flights, hotels, holidays, trains, buses and cabs. Copy a code and apply it at checkout.</p></div></div>`);
  $('#page').before(hero);
  const cats = ['All Offers', 'Bank Offers', 'Flights', 'Hotels', 'Holidays', 'Trains', 'Cabs', 'Bus'];
  const target = { Flights: 'index.html?tab=flights', Hotels: 'index.html?tab=hotels', Holidays: 'holidays.html', Trains: 'index.html?tab=trains', Cabs: 'index.html?tab=cabs', Bus: 'index.html?tab=buses', 'Bank Offers': 'index.html' };
  let cat = TS.params().cat || 'All Offers';
  const draw = () => {
    const list = D.offers.filter((o) => cat === 'All Offers' || o.cat === cat);
    $('#page').innerHTML = `<div class="sec-card" style="margin-top:8px"><div class="tabs-line" style="margin-bottom:16px">${cats.map((c) => `<button type="button" data-cat="${c}" class="${c === cat ? 'on' : ''}">${c}</button>`).join('')}</div>
      <div class="offer-grid">${list.map((o, i) => `<article class="oc"><div class="oc-img">${TS.scene(o.kind, i + 3)}</div><div class="oc-body"><span class="oc-tag">${o.tag}</span><h4>${esc(o.title)}</h4><p>${esc(o.desc)}</p><div class="oc-foot"><button type="button" class="code-pill" data-copy="${o.code}">${icon('copy', 13)} ${o.code}</button><a href="${target[o.cat]}">BOOK NOW</a></div><span class="tiny">T&amp;C's apply · Valid till ${TS.d.nice(TS.d.add(TS.d.today(), 30 + i * 3))}</span></div></article>`).join('')}</div></div>
      <section class="sec sec-card"><div class="sec-h"><h2>All coupon codes</h2></div><table class="tbl"><thead><tr><th>Code</th><th>Valid on</th><th>Benefit</th></tr></thead><tbody>${D.coupons.map((c) => `<tr><td><button type="button" class="code-pill" data-copy="${c.code}">${c.code}</button></td><td>${c.for.map((x) => x[0].toUpperCase() + x.slice(1)).join(', ')}</td><td>${esc(c.desc)}${c.min ? ` <span class="muted">(min. ${TS.inr(c.min)})</span>` : ''}</td></tr>`).join('')}</tbody></table></section>`;
  };
  $('#page').addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]');
    if (c) { cat = c.dataset.cat; draw(); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp) { const code = cp.dataset.copy; (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => TS.toast(`Code ${code} copied`, 'ok'), () => TS.toast(`Use code ${code} at checkout`)); }
  });
  draw();
})();
