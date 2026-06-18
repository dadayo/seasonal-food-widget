(function () {
  const EN = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const WEEK = ['일','월','화','수','목','금','토'];
  const CAT = { produce:'농산물', seafood:'해산물', fruit:'과일' };
  const COLOR = ['#3E68A8','#5E9AA6','#E0608F','#4FA873','#36A85C','#129E93',
                 '#F0594B','#E84B62','#D9851F','#DA6A22','#B85436','#3A66A6'];
  const PSIZE = { s:50, m:66, l:82 };
  const SMALL_CAP = 10;          // small frame shows fewer
  const MAXV = 8, MINV = 0.55, DAMP = 0.992;
  const $ = id => document.getElementById(id);
  const SLUG = window.SLUG || {}, RECIPES = window.RECIPES || {};
  const cm = () => new Date().getMonth() + 1;
  const rnd = (a,b) => a + Math.random()*(b-a);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

  let pool = [], viewMonth = cm(), manual = false, dayKey = '';
  let parts = [], stageW = 0, stageH = 0, raf = null, selected = null, drag = null;
  let fx0 = 0, fx1 = 0, fy0 = 0, fy1 = 0;  // simulation field (extends beyond visible frame)

  function header(m) {
    $('card').style.setProperty('--accent', COLOR[m-1]);
    $('mon').innerHTML = m + '월 제철 재료<small>' + EN[m-1] + ' · SEASONAL</small>';
    $('cnt').innerHTML = '제철 <b>' + pool.length + '</b>종';
    const d = new Date();
    if (m === cm()) { $('datebig').textContent = d.getDate(); $('dunit').textContent = '일'; $('weekday').textContent = WEEK[d.getDay()]; }
    else { $('datebig').textContent = m; $('dunit').textContent = '월'; $('weekday').textContent = '미리보기'; }
    deselect();
  }
  // big-name display (separate spot) — shows on hover, sticks with recipe on click
  function showName(it, withRecipe) {
    $('namebig').textContent = it.name; $('namebig').classList.add('active');
    if (withRecipe) { const r = RECIPES[it.name];
      $('namerec').innerHTML = r ? (r.join(' · ') + ' <span class="go-r">레시피 →</span>') : '<span class="go-r">레시피 검색 →</span>'; }
    else $('namerec').textContent = '';
  }
  function revertName() {
    if (selected) { showName(selected.it, true); return; }
    $('namebig').textContent = '이달의 제철 ' + pool.length + '종'; $('namebig').classList.remove('active');
    $('namerec').textContent = '';
  }
  function deselect() { selected = null; parts.forEach(p => p.el.classList.remove('sel')); revertName(); }
  function select(p) {
    selected = p; parts.forEach(q => q.el.classList.toggle('sel', q === p));
    showName(p.it, true);
  }

  function stageRect(){ return $('collage').getBoundingClientRect(); }

  function makePim(it, size) {
    const im = document.createElement('img'); im.className = 'pim';
    im.src = 'assets/' + SLUG[it.name] + '.png'; im.style.width = size + 'px'; im.title = it.name;
    im.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const p = parts.find(q => q.el === im); if (!p) return;
      const r = stageRect();
      drag = { p, offx:(e.clientX-r.left)-p.x, offy:(e.clientY-r.top)-p.y, vx:0, vy:0, sx:e.clientX, sy:e.clientY, moved:false };
      p.grabbed = true; im.style.cursor = 'grabbing';
    });
    im.addEventListener('pointerenter', () => { const p = parts.find(q => q.el === im); if (p && p !== selected) showName(p.it, false); });
    im.addEventListener('pointerleave', () => revertName());
    return im;
  }

  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = stageRect(), p = drag.p;
    let nx = clamp((e.clientX-r.left)-drag.offx, fx0+p.r, fx1-p.r);
    let ny = clamp((e.clientY-r.top)-drag.offy, fy0+p.r, fy1-p.r);
    drag.vx = nx - p.x; drag.vy = ny - p.y; p.x = nx; p.y = ny;
    if (Math.hypot(e.clientX-drag.sx, e.clientY-drag.sy) > 4) drag.moved = true;
    render();
  });
  document.addEventListener('pointerup', () => {
    if (!drag) return;
    const p = drag.p; p.grabbed = false; p.el.style.cursor = ''; p.el.style.zIndex = '';
    if (!drag.moved) select(p);
    else { p.vx = clamp(drag.vx, -MAXV, MAXV); p.vy = clamp(drag.vy, -MAXV, MAXV); }
    drag = null;
  });

  function build(m) {
    const data = window.SEASONAL[m];
    pool = [];
    for (const c of ['produce','seafood','fruit']) data[c].forEach(([name,emoji]) => pool.push({ cat:c, name, emoji }));
    pool = pool.filter(it => SLUG[it.name]);
    header(m);
    const size = PSIZE[$('card').dataset.size] || PSIZE.m;
    const box = $('collage'); box.innerHTML = '';
    const rect = box.getBoundingClientRect(); stageW = rect.width || 280; stageH = rect.height || 160;
    // field extends beyond the visible frame so foods swim in and out
    const mx = stageW * 0.35, my = stageH * 0.35;
    fx0 = -mx; fx1 = stageW + mx; fy0 = -my; fy1 = stageH + my;
    // all of the month's foods become particles (small frame caps for space)
    let chosen = pool.slice();
    for (let i = chosen.length-1; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [chosen[i],chosen[j]]=[chosen[j],chosen[i]]; }
    if ($('card').dataset.size === 's') chosen = chosen.slice(0, SMALL_CAP);
    drag = null;
    parts = chosen.map((it) => {
      const im = makePim(it, size); box.appendChild(im);
      const r = size * 0.44, ang = rnd(0, Math.PI*2), sp = rnd(0.7, 1.2);
      return { el:im, size, it, r, x: rnd(fx0+r, fx1-r), y: rnd(fy0+r, fy1-r),
        vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp, rot: rnd(-6,6), vr: rnd(-0.25,0.25), grabbed:false };
    });
    render();
    if (!raf) raf = requestAnimationFrame(step);
  }

  function render() {
    for (const p of parts)
      p.el.style.transform = 'translate(' + (p.x - p.size/2) + 'px,' + (p.y - p.size/2) + 'px) rotate(' + p.rot + 'deg)';
  }

  function step() {
    for (const p of parts) {
      if (p.grabbed) continue;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.x - p.r < fx0) { p.x = fx0 + p.r; p.vx = Math.abs(p.vx); }
      if (p.x + p.r > fx1) { p.x = fx1 - p.r; p.vx = -Math.abs(p.vx); }
      if (p.y - p.r < fy0) { p.y = fy0 + p.r; p.vy = Math.abs(p.vy); }
      if (p.y + p.r > fy1) { p.y = fy1 - p.r; p.vy = -Math.abs(p.vy); }
      p.vx *= DAMP; p.vy *= DAMP;
      let s = Math.hypot(p.vx, p.vy);
      if (s > MAXV) { p.vx *= MAXV/s; p.vy *= MAXV/s; }
      else if (s < MINV) { if (s < 1e-3) { const a = rnd(0,6.28); p.vx = Math.cos(a)*MINV; p.vy = Math.sin(a)*MINV; } else { p.vx *= MINV/s; p.vy *= MINV/s; } }
    }
    for (let i = 0; i < parts.length; i++)
      for (let j = i+1; j < parts.length; j++) {
        const a = parts[i], b = parts[j];
        const dx = b.x-a.x, dy = b.y-a.y, d = Math.hypot(dx,dy) || 0.001, min = a.r + b.r;
        if (d < min) {
          const nx = dx/d, ny = dy/d, ov = min - d;
          if (!a.grabbed && !b.grabbed) {
            a.x -= nx*ov/2; a.y -= ny*ov/2; b.x += nx*ov/2; b.y += ny*ov/2;
            const va = a.vx*nx + a.vy*ny, vb = b.vx*nx + b.vy*ny, diff = vb - va;
            a.vx += diff*nx; a.vy += diff*ny; b.vx -= diff*nx; b.vy -= diff*ny;
          } else {
            const free = a.grabbed ? b : a, sgn = a.grabbed ? 1 : -1;
            free.x += nx*ov*sgn; free.y += ny*ov*sgn;
            const gv = (drag ? drag.vx : 0)*nx*sgn + (drag ? drag.vy : 0)*ny*sgn;
            if (gv > 0) { free.vx += nx*sgn*gv*1.2; free.vy += ny*sgn*gv*1.2; }
          }
        }
      }
    render();
    raf = requestAnimationFrame(step);
  }

  // month slide
  let turning = false;
  function turn(update, dir) {
    if (turning) { update(); return; }
    turning = true;
    const card = $('card'), page = $('page');
    const ov = document.createElement('div'); ov.className = 'pageturn'; ov.appendChild(page.cloneNode(true)); card.appendChild(ov);
    update();
    ov.classList.add(dir === 'next' ? 'slideL' : 'slideR'); page.classList.add(dir === 'next' ? 'inR' : 'inL');
    setTimeout(() => page.classList.remove('inR','inL'), 640);
    setTimeout(() => { if (ov.parentNode) ov.remove(); turning = false; }, 700);
  }
  function setMonth(m, dir) { turn(() => { viewMonth = ((m-1+12)%12)+1; manual = (viewMonth !== cm()); build(viewMonth); }, dir || 'next'); }
  function tick() { const k = new Date().toDateString(); if (k !== dayKey) { dayKey = k; if (!manual) build(cm()); } }

  $('prev').onclick = () => setMonth(viewMonth - 1, 'prev');
  $('next').onclick = () => setMonth(viewMonth + 1, 'next');
  $('namerec').onclick = () => { if (selected && window.api) window.api.openRecipe(selected.it.name); };
  document.querySelector('.stage').addEventListener('pointerdown', (e) => { if (!e.target.closest('.pim')) deselect(); });

  if (window.api) {
    window.api.getSize().then(s => { if (s) { $('card').dataset.size = s; build(viewMonth); } }).catch(()=>{});
    window.api.onSize(s => { $('card').dataset.size = s; build(viewMonth); });
  }

  dayKey = new Date().toDateString();
  build(viewMonth);
  setInterval(tick, 60*1000);
})();
