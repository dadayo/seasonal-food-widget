(function () {
  const EN = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const WEEK = ['일','월','화','수','목','금','토'];
  const CAT = { produce:'농산물', seafood:'해산물', fruit:'과일' };
  const COLOR = ['#3E68A8','#5E9AA6','#E0608F','#4FA873','#36A85C','#129E93',
                 '#F0594B','#E84B62','#D9851F','#DA6A22','#B85436','#3A66A6'];
  const COUNT = { s:5, m:8, l:9 };
  const PSIZE = { s:42, m:58, l:76 };
  const $ = id => document.getElementById(id);
  const SLUG = window.SLUG || {}, RECIPES = window.RECIPES || {};
  const cm = () => new Date().getMonth() + 1;
  const rnd = (a,b) => a + Math.random()*(b-a);

  let pool = [], viewMonth = cm(), manual = false, dayKey = '';
  let parts = [], paused = false, stageW = 0, stageH = 0, raf = null, selected = null;

  function header(m) {
    $('card').style.setProperty('--accent', COLOR[m-1]);
    $('mon').textContent = m + '월 · ' + EN[m-1];
    $('cnt').innerHTML = '제철 <b>' + pool.length + '</b>종';
    const d = new Date();
    if (m === cm()) {
      $('datebig').textContent = d.getDate(); $('dunit').textContent = '일';
      $('weekday').textContent = WEEK[d.getDay()] + '요일';
    } else {
      $('datebig').textContent = m; $('dunit').textContent = '월';
      $('weekday').textContent = '제철 미리보기';
    }
    deselect();
  }

  function deselect() {
    selected = null;
    parts.forEach(p => p.el.classList.remove('sel'));
    $('caption').firstChild.textContent = '이달의 제철';
    $('capsub').textContent = pool.length + '종';
    $('today').textContent = '제철 달력'; $('today').onclick = null;
  }
  function select(p) {
    selected = p;
    parts.forEach(q => q.el.classList.toggle('sel', q === p));
    $('caption').firstChild.textContent = p.it.name;
    $('capsub').textContent = CAT[p.it.cat];
    const r = RECIPES[p.it.name];
    $('today').innerHTML = r ? ('추천 <b>' + r.join(' · ') + '</b> <span class="go-r">레시피 →</span>')
                             : '<span class="go-r">레시피 검색 →</span>';
    $('today').onclick = () => window.api && window.api.openRecipe(p.it.name);
  }

  function imgEl(it, size) {
    const im = document.createElement('img');
    im.className = 'pim'; im.src = 'assets/' + SLUG[it.name] + '.png';
    im.style.width = size + 'px'; im.title = it.name;
    im.onclick = (e) => { e.stopPropagation(); select(parts.find(p => p.el === im)); };
    return im;
  }

  function build(m) {
    const data = window.SEASONAL[m];
    pool = [];
    for (const c of ['produce','seafood','fruit'])
      data[c].forEach(([name,emoji]) => pool.push({ cat:c, name, emoji }));
    pool = pool.filter(it => SLUG[it.name]);
    header(m);

    const size = PSIZE[$('card').dataset.size] || PSIZE.m;
    const n = Math.min(COUNT[$('card').dataset.size] || COUNT.m, pool.length);
    const box = $('collage'); box.innerHTML = '';
    const rect = box.getBoundingClientRect(); stageW = rect.width || 280; stageH = rect.height || 160;
    // choose a spread of foods
    const chosen = []; const step = pool.length / n;
    for (let k = 0; k < n; k++) chosen.push(pool[Math.floor(k*step) % pool.length]);

    parts = chosen.map((it, i) => {
      const im = imgEl(it, size); box.appendChild(im);
      const r = size/2;
      const ang = rnd(0, Math.PI*2), sp = rnd(0.18, 0.42);
      return { el:im, it, r,
        x: rnd(r, Math.max(r, stageW-r)), y: rnd(r, Math.max(r, stageH-r)),
        vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp, rot: rnd(-6,6), vr: rnd(-0.15,0.15) };
    });
    render();
    if (!raf) raf = requestAnimationFrame(step);
  }

  function render() {
    for (const p of parts) p.el.style.transform =
      'translate(' + (p.x-p.r) + 'px,' + (p.y-p.r) + 'px) rotate(' + p.rot + 'deg)';
  }

  function step() {
    if (!paused && parts.length) {
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.x - p.r < 0) { p.x = p.r; p.vx = Math.abs(p.vx); }
        if (p.x + p.r > stageW) { p.x = stageW - p.r; p.vx = -Math.abs(p.vx); }
        if (p.y - p.r < 0) { p.y = p.r; p.vy = Math.abs(p.vy); }
        if (p.y + p.r > stageH) { p.y = stageH - p.r; p.vy = -Math.abs(p.vy); }
      }
      for (let i = 0; i < parts.length; i++)
        for (let j = i+1; j < parts.length; j++) {
          const a = parts[i], b = parts[j];
          const dx = b.x-a.x, dy = b.y-a.y; const d = Math.hypot(dx,dy) || 0.001;
          const min = (a.r + b.r) * 0.82;
          if (d < min) {
            const nx = dx/d, ny = dy/d, ov = (min-d)/2;
            a.x -= nx*ov; a.y -= ny*ov; b.x += nx*ov; b.y += ny*ov;
            const va = a.vx*nx + a.vy*ny, vb = b.vx*nx + b.vy*ny, diff = vb - va;
            a.vx += diff*nx; a.vy += diff*ny; b.vx -= diff*nx; b.vy -= diff*ny;
          }
        }
      render();
    }
    raf = requestAnimationFrame(step);
  }

  // periodically swap one drifting food for another not currently shown → over time you see all
  function swapOne() {
    if (paused || parts.length === 0 || pool.length <= parts.length) return;
    const shown = new Set(parts.map(p => p.it.name));
    const fresh = pool.filter(it => !shown.has(it.name));
    if (!fresh.length) return;
    const p = parts[Math.floor(Math.random()*parts.length)];
    if (p === selected) return;
    const it = fresh[Math.floor(Math.random()*fresh.length)];
    p.el.style.opacity = '0';
    setTimeout(() => { p.it = it; p.el.src = 'assets/' + SLUG[it.name] + '.png'; p.el.title = it.name; p.el.style.opacity = '1'; }, 350);
  }

  // month slide
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
    turn(() => { viewMonth = ((m-1+12)%12)+1; manual = (viewMonth !== cm()); build(viewMonth); }, dir || 'next');
  }

  function tick() {
    const k = new Date().toDateString();
    if (k !== dayKey) { dayKey = k; if (!manual) build(cm()); }
  }

  $('prev').onclick = () => setMonth(viewMonth - 1, 'prev');
  $('next').onclick = () => setMonth(viewMonth + 1, 'next');
  $('caption').onclick = () => { if (selected && window.api) window.api.openRecipe(selected.it.name); };
  const card = $('card');
  card.addEventListener('mouseenter', () => { paused = true; });
  card.addEventListener('mouseleave', () => { paused = false; });
  // click empty area deselects
  document.querySelector('.stage').addEventListener('click', (e) => { if (e.target.classList.contains('pim')) return; deselect(); });

  if (window.api) {
    window.api.getSize().then(s => { if (s) { card.dataset.size = s; build(viewMonth); } }).catch(()=>{});
    window.api.onSize(s => { card.dataset.size = s; build(viewMonth); });
  }

  dayKey = new Date().toDateString();
  build(viewMonth);
  setInterval(tick, 60*1000);
  setInterval(swapOne, 8000);
})();
