(function () {
  const EN = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const WEEK = ['일','월','화','수','목','금','토'];
  const CAT = { produce:'농산물', seafood:'해산물', fruit:'과일' };
  const COLOR = ['#3E68A8','#5E9AA6','#E0608F','#4FA873','#36A85C','#129E93',
                 '#F0594B','#E84B62','#D9851F','#DA6A22','#B85436','#3A66A6'];
  // collage slots (percent box): left, top, size%, rotation
  const POS = [
    {l:-2,t:8,s:38,r:-9},{l:33,t:0,s:42,r:7},{l:67,t:6,s:40,r:-5},
    {l:14,t:30,s:46,r:4},{l:52,t:30,s:48,r:-7},{l:-4,t:54,s:40,r:8},
    {l:35,t:58,s:44,r:-4},{l:70,t:46,s:42,r:11},{l:60,t:74,s:38,r:-9},
    {l:22,t:74,s:36,r:6}
  ];
  const $ = id => document.getElementById(id);
  const SLUG = window.SLUG || {}, RECIPES = window.RECIPES || {};
  const cm = () => new Date().getMonth() + 1;
  const PAPER = [244,238,223];

  let pool = [], viewMonth = cm(), manual = false, dayKey = '';

  function hex(h){ return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }
  function setDuo(accent) {
    const d = hex(accent);
    // light end = pale tint of accent (10% accent, 90% white) → monochrome ink look
    const light = d.map(v => Math.round(v*0.12 + 255*0.88));
    const f = (lo,hi) => (lo/255).toFixed(3) + ' ' + (hi/255).toFixed(3);
    $('duoR').setAttribute('tableValues', f(d[0], light[0]));
    $('duoG').setAttribute('tableValues', f(d[1], light[1]));
    $('duoB').setAttribute('tableValues', f(d[2], light[2]));
  }

  function pickFoods(n) {
    const N = pool.length, out = [];
    const step = N / Math.min(n, N);
    for (let k = 0; k < Math.min(n, N); k++) out.push(pool[Math.floor(k*step) % N]);
    return out;
  }

  function build(m) {
    const data = window.SEASONAL[m];
    pool = [];
    for (const c of ['produce','seafood','fruit'])
      data[c].forEach(([name,emoji]) => pool.push({ cat:c, name, emoji }));
    $('card').style.setProperty('--accent', COLOR[m-1]);
    setDuo(COLOR[m-1]);
    $('mon').textContent = m + '월 · ' + EN[m-1];
    $('cnt').innerHTML = '제철 <b>' + pool.length + '</b>종';
    const d = new Date();
    if (m === cm()) {
      $('datebig').textContent = d.getDate(); $('dunit').textContent = '일';
      $('weekday').textContent = WEEK[d.getDay()] + '요일'; $('today').textContent = '제철 달력';
    } else {
      $('datebig').textContent = m; $('dunit').textContent = '월';
      $('weekday').textContent = '제철 미리보기'; $('today').textContent = '제철 달력';
    }
    // collage
    const box = $('collage'); box.innerHTML = '';
    const foods = pickFoods(POS.length);
    foods.forEach((it, i) => {
      const slug = SLUG[it.name]; if (!slug) return;
      const p = POS[i];
      const im = document.createElement('img');
      im.src = 'assets/' + slug + '.png';
      im.style.left = p.l + '%'; im.style.top = p.t + '%';
      im.style.width = p.s + '%';
      im.style.transform = 'rotate(' + p.r + 'deg)';
      im.title = it.name;
      im.onmouseenter = () => { $('caption').firstChild.textContent = it.name;
        $('capsub').textContent = CAT[it.cat]; };
      im.onmouseleave = () => { $('caption').firstChild.textContent = '이달의 제철';
        $('capsub').textContent = ''; };
      im.onclick = () => window.api && window.api.openRecipe(it.name);
      box.appendChild(im);
    });
  }

  // month slide transition
  let turning = false;
  function turn(update, dir) {
    if (turning) { update(); return; }
    turning = true;
    const card = $('card'), page = $('page');
    const ov = document.createElement('div'); ov.className = 'pageturn';
    ov.appendChild(page.cloneNode(true));
    card.appendChild(ov);
    update();
    ov.classList.add(dir === 'next' ? 'slideL' : 'slideR');
    page.classList.add(dir === 'next' ? 'inR' : 'inL');
    setTimeout(() => { page.classList.remove('inR','inL'); }, 640);
    setTimeout(() => { if (ov.parentNode) ov.remove(); turning = false; }, 700);
  }
  function setMonth(m, dir) {
    turn(() => {
      viewMonth = ((m - 1 + 12) % 12) + 1;
      manual = (viewMonth !== cm());
      build(viewMonth);
    }, dir || 'next');
  }

  function tick() {
    const k = new Date().toDateString();
    if (k !== dayKey) { dayKey = k; if (!manual) build(cm()); }
  }

  $('prev').onclick = () => setMonth(viewMonth - 1, 'prev');
  $('next').onclick = () => setMonth(viewMonth + 1, 'next');

  if (window.api) {
    window.api.getSize().then(s => { if (s) $('card').dataset.size = s; }).catch(()=>{});
    window.api.onSize(s => { $('card').dataset.size = s; });
  }

  dayKey = new Date().toDateString();
  build(viewMonth);
  setInterval(tick, 60*1000);
})();
