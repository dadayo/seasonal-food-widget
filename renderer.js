(function () {
  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const SEASON = { 12:'WINTER',1:'WINTER',2:'WINTER',3:'SPRING',4:'SPRING',5:'SPRING',6:'SUMMER',7:'SUMMER',8:'SUMMER',9:'AUTUMN',10:'AUTUMN',11:'AUTUMN' };
  const CAT = { produce:'농산물', seafood:'해산물', fruit:'과일' };
  // per-month point color (winter blues → spring pink/green → summer teal/coral → autumn amber)
  const COLOR = ['#4071B6','#5E9AA6','#F26BA0','#57B27A','#3FAE63','#16A89C',
                 '#FF6B5C','#F0556B','#E0902B','#E2722B','#BE5A3C','#3F6FB0'];
  const $ = id => document.getElementById(id);
  const SLUG = window.SLUG || {}, RECIPES = window.RECIPES || {};
  const cm = () => new Date().getMonth() + 1;

  let pool = [], cur = 0, viewMonth = cm(), manual = false, dayKey = '', timer = null;

  function build(m) {
    const data = window.SEASONAL[m];
    pool = [];
    for (const c of ['produce','seafood','fruit'])
      data[c].forEach(([name,emoji]) => pool.push({ cat:c, name, emoji }));
    $('card').style.setProperty('--accent', COLOR[m-1]);
    $('mon').textContent = MONTHS[m-1] + ' 제철';
    $('season').textContent = SEASON[m];
    $('bignum').textContent = m;
    $('cnt').innerHTML = '제철 <b>' + pool.length + '</b>종';
    $('today').textContent = manual ? '다른 달 미리보기' : '오늘의 제철';
    const peek = $('peek'); peek.innerHTML = '';
    pool.forEach((it, i) => {
      const p = document.createElement('div'); p.className = 'p'; p.dataset.i = i;
      const slug = SLUG[it.name];
      if (slug) { const im = document.createElement('img'); im.src = 'assets/'+slug+'.png';
        im.onerror = () => { p.textContent=''; const s=document.createElement('span'); s.textContent=it.emoji; p.appendChild(s); };
        p.appendChild(im); }
      else { const s=document.createElement('span'); s.textContent=it.emoji; p.appendChild(s); }
      p.onclick = () => goto(i);
      peek.appendChild(p);
    });
  }

  function paint(i) {
    const it = pool[i]; if (!it) return;
    $('fcat').textContent = CAT[it.cat];
    $('fname').textContent = it.name;
    const em = $('femoji'), fimg = $('fimg'), slug = SLUG[it.name];
    const tilt = ((it.name.length * 7 + i * 13) % 9) - 4; // -4..4°, organic placement
    fimg.style.transform = 'rotate(' + tilt + 'deg)';
    em.style.transform = 'rotate(' + tilt + 'deg)';
    const showEmoji = () => { fimg.style.display='none'; em.style.display='inline'; em.textContent = it.emoji; };
    if (slug) { fimg.onload = () => { em.style.display='none'; fimg.style.display='inline'; };
      fimg.onerror = showEmoji; fimg.src = 'assets/'+slug+'.png'; }
    else showEmoji();
    const r = RECIPES[it.name];
    $('recipe').innerHTML = r ? ('추천 <b>'+r.join(' · ')+'</b> &nbsp;<span class="go-r">레시피 →</span>')
                              : '<span class="go-r">레시피 검색 →</span>';
    document.querySelectorAll('.peek .p.on').forEach(p=>p.classList.remove('on'));
    const pp = document.querySelector('.peek .p[data-i="'+i+'"]'); if (pp) pp.classList.add('on');
  }

  // clone current page as an overlay, run update underneath, then animate overlay away.
  // mode 'tear'  = diagonal tear-off (food change)
  // mode 'slide' = horizontal swipe (month change); dir 'next'|'prev'
  let turning = false;
  function turn(update, mode, dir) {
    if (turning) { update(); return; }
    turning = true;
    const card = $('card'), page = $('page');
    const ov = document.createElement('div'); ov.className = 'pageturn';
    ov.appendChild(page.cloneNode(true));
    card.appendChild(ov);
    update();
    let dur;
    if (mode === 'slide') {
      dur = 700;
      ov.classList.add(dir === 'next' ? 'slideL' : 'slideR');     // old page swipes aside
      page.classList.add(dir === 'next' ? 'inR' : 'inL');         // new page eases in
      setTimeout(() => { page.classList.remove('inR','inL'); }, 640);
    } else {
      dur = 1120;
      requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('go')));
    }
    setTimeout(() => { if (ov.parentNode) ov.remove(); turning = false; }, dur);
  }
  function flipTo(i){ turn(() => { cur = (i + pool.length) % pool.length; paint(cur); }, 'tear'); }
  function goto(i){ flipTo(i); restart(); }
  function next(){ flipTo(cur + 1); }

  function setMonth(m, dir) {
    turn(() => {
      viewMonth = ((m - 1 + 12) % 12) + 1;
      manual = (viewMonth !== cm());
      build(viewMonth);
      cur = manual ? 0 : (new Date().getDate() % pool.length);
      paint(cur);
    }, 'slide', dir || 'next');
    restart();
  }

  let hover = false;
  function stop(){ if (timer) { clearInterval(timer); timer = null; } }
  function arm(){ stop(); if (!hover) timer = setInterval(next, 9000); } // idempotent + hover-aware
  function restart(){ arm(); }

  function tick() {
    const k = new Date().toDateString();
    if (k !== dayKey) { dayKey = k; if (!manual) setMonth(cm()); } // resync daily / on month change
  }

  // interactions
  $('imgwrap').onclick = () => goto(cur + 1);
  $('recipe').onclick = () => window.api && window.api.openRecipe(pool[cur].name);
  $('prev').onclick = () => setMonth(viewMonth - 1, 'prev');
  $('next').onclick = () => setMonth(viewMonth + 1, 'next');
  const card = $('card');
  card.addEventListener('mouseenter', () => { hover = true; stop(); });
  card.addEventListener('mouseleave', () => { hover = false; arm(); });

  if (window.api) {
    window.api.getSize().then(s => { if (s) card.dataset.size = s; }).catch(()=>{});
    window.api.onSize(s => { card.dataset.size = s; });
  }

  // init
  dayKey = new Date().toDateString();
  build(viewMonth);
  cur = new Date().getDate() % pool.length;
  paint(cur);
  arm();
  setInterval(tick, 60*1000);
})();
