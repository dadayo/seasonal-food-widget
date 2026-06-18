(function () {
  const EN = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const WEEK = ['일','월','화','수','목','금','토'];
  const CAT = { produce:'농산물', seafood:'해산물', fruit:'과일' };
  const COLOR = ['#3E68A8','#5E9AA6','#E0608F','#4FA873','#36A85C','#129E93',
                 '#F0594B','#E84B62','#D9851F','#DA6A22','#B85436','#3A66A6'];
  // collage slots per size (percent box): left, top, size%, base rotation
  const POS_BY = {
    s: [ {l:5,t:12,s:30,r:-6},{l:37,t:4,s:34,r:5},{l:68,t:16,s:30,r:-5} ],
    m: [ {l:4,t:5,s:27,r:-5},{l:38,t:1,s:30,r:5},{l:71,t:7,s:26,r:-4},
         {l:7,t:50,s:28,r:4},{l:40,t:52,s:30,r:-6},{l:70,t:48,s:26,r:7} ],
    l: [ {l:2,t:5,s:30,r:-6},{l:37,t:0,s:33,r:5},{l:71,t:7,s:29,r:-4},
         {l:4,t:50,s:31,r:4},{l:38,t:53,s:33,r:-6},{l:70,t:49,s:29,r:7} ]
  };
  const $ = id => document.getElementById(id);
  const SLUG = window.SLUG || {}, RECIPES = window.RECIPES || {};
  const cm = () => new Date().getMonth() + 1;

  let pool = [], viewMonth = cm(), manual = false, dayKey = '';

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
    // collage (count/layout per current size)
    const POS = POS_BY[$('card').dataset.size] || POS_BY.m;
    const box = $('collage'); box.innerHTML = '';
    const foods = pickFoods(POS.length);
    foods.forEach((it, i) => {
      const slug = SLUG[it.name]; if (!slug) return;
      const p = POS[i];
      const slot = document.createElement('div'); slot.className = 'slot';
      slot.style.left = p.l + '%'; slot.style.top = p.t + '%'; slot.style.width = p.s + '%';
      slot.style.transform = 'rotate(' + p.r + 'deg)';
      const im = document.createElement('img');
      im.src = 'assets/' + slug + '.png'; im.title = it.name;
      im.style.setProperty('--dur', (3.4 + Math.random()*2.8).toFixed(2) + 's');
      im.style.setProperty('--del', (-Math.random()*3).toFixed(2) + 's');
      im.onmouseenter = () => { $('caption').firstChild.textContent = it.name; $('capsub').textContent = CAT[it.cat]; };
      im.onmouseleave = () => { $('caption').firstChild.textContent = '이달의 제철'; $('capsub').textContent = ''; };
      im.onclick = () => window.api && window.api.openRecipe(it.name);
      slot.appendChild(im); box.appendChild(slot);
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
    window.api.getSize().then(s => { if (s) { $('card').dataset.size = s; build(viewMonth); } }).catch(()=>{});
    window.api.onSize(s => { $('card').dataset.size = s; build(viewMonth); });
  }

  dayKey = new Date().toDateString();
  build(viewMonth);
  setInterval(tick, 60*1000);
})();
