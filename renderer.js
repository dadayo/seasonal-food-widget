(function () {
  const WEEK = ['일','월','화','수','목','금','토'];
  const CAT = { produce:'농산물', seafood:'해산물', fruit:'과일' };
  // per-month point color — seasonal wheel (winter blue → spring pink/green → summer teal/coral → autumn amber)
  const COLOR = ['#5C7FB0','#6E9BA8','#E58AAE','#7FB97E','#4FA86A','#2FA7A0',
                 '#F2774E','#E8576A','#E0962F','#DC7029','#B6603C','#4E78AE'];
  const PSIZE = { s:50, m:66, l:82 };
  const SMALL_CAP = 10;
  const MAXV = 5, MINV = 0.14, DAMP = 0.99;     // languid drift
  const $ = id => document.getElementById(id);
  const SLUG = window.SLUG || {}, RECIPES = window.RECIPES || {};
  const cm = () => new Date().getMonth() + 1;
  const rnd = (a,b) => a + Math.random()*(b-a);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

  const STAMPS = ['맛봄','냠','최고','또먹기','굿','쩝쩝','업'];
  const EMOJIS = ['😋','🤤','😍','🥰','✨','👍','💛','🍴','😆'];
  // eaten log (persisted): { "6": { "오이": {d:"6.18", s:"냠"} } } keyed by month
  let store = {};
  try { store = JSON.parse(localStorage.getItem('seasonal-eaten') || '{}'); } catch (e) { store = {}; }
  const saveStore = () => { try { localStorage.setItem('seasonal-eaten', JSON.stringify(store)); } catch (e) {} };
  const recOf = (m,n) => store[m] && store[m][n];
  const isEaten = (m,n) => !!recOf(m,n);
  function markEat(m,n){            // toggle; returns record if now eaten, else null
    store[m] = store[m] || {};
    if (store[m][n]) { delete store[m][n]; saveStore(); return null; }
    const dt = new Date();
    const rec = { d: (dt.getMonth()+1) + '.' + dt.getDate(), s: STAMPS[Math.floor(Math.random()*STAMPS.length)] };
    store[m][n] = rec; saveStore(); return rec;
  }

  let pool = [], viewMonth = cm(), manual = false, dayKey = '';
  let parts = [], stageW = 0, stageH = 0, fx0 = 0, fx1 = 0, fy0 = 0, fy1 = 0;
  let raf = null, selected = null, drag = null, shownIt = null;

  function eatenCount(){ return pool.filter(it => isEaten(viewMonth, it.name)).length; }
  function updateProg(){ $('pnum').textContent = eatenCount(); $('pof').textContent = '/' + pool.length; }

  function header(m) {
    $('card').style.setProperty('--accent', COLOR[m-1]);
    $('mon').textContent = m + '월';
    const d = new Date();
    $('date').textContent = (m === cm()) ? (d.getDate() + '일 ' + WEEK[d.getDay()]) : '';
    $('todayBtn').style.display = (m === cm()) ? 'none' : 'inline-block';
  }

  function showName(it) {
    shownIt = it;
    $('namebig').textContent = it.name; $('namebig').classList.add('active');
    const r = RECIPES[it.name], rec = recOf(viewMonth, it.name);
    let html = r ? (r.join(' · ') + ' <span class="go-r">레시피 →</span>') : '<span class="go-r">레시피 검색 →</span>';
    if (rec && rec.d) html = '<span class="eaten-d">' + rec.d + ' 먹음</span> · ' + html;
    $('namerec').innerHTML = html;
  }
  function revertName() {
    if (selected) { showName(selected.it); return; }
    shownIt = null;
    $('namebig').textContent = ''; $('namebig').classList.remove('active'); $('namerec').textContent = '';
  }
  function deselect(){ selected = null; parts.forEach(p => p.el.classList.remove('sel')); revertName(); }
  function select(p){ selected = p; parts.forEach(q => q.el.classList.toggle('sel', q === p)); showName(p.it); }

  function burst(p) {
    const box = $('collage'), k = 5 + Math.floor(Math.random()*4);
    for (let i = 0; i < k; i++) {
      const e = document.createElement('span'); e.className = 'pop-emoji';
      e.textContent = EMOJIS[Math.floor(Math.random()*EMOJIS.length)];
      e.style.left = p.x + 'px'; e.style.top = (p.y - p.size*0.2) + 'px';
      const ang = rnd(-Math.PI*0.92, -Math.PI*0.08), dist = 28 + Math.random()*46;
      e.style.setProperty('--dx', (Math.cos(ang)*dist).toFixed(0) + 'px');
      e.style.setProperty('--dy', (Math.sin(ang)*dist - 18).toFixed(0) + 'px');
      e.style.animationDelay = (Math.random()*0.1).toFixed(2) + 's';
      box.appendChild(e); setTimeout(() => e.remove(), 1100);
    }
  }
  // click a food (tap, not drag) = toggle eaten
  function eatToggle(p) {
    const rec = markEat(viewMonth, p.it.name);
    p.eaten = !!rec; p.el.classList.toggle('eaten', p.eaten);
    if (rec) { p.stamp.textContent = rec.s; p.el.classList.add('pop'); setTimeout(() => p.el.classList.remove('pop'), 460); burst(p); }
    select(p); updateProg();
  }
  $('namerec').onclick = () => { if (shownIt && window.api) window.api.openRecipe(shownIt.name); };

  function stageRect(){ return $('collage').getBoundingClientRect(); }

  function makePim(it, size) {
    const w = document.createElement('div'); w.className = 'pim'; w.title = it.name;
    const im = document.createElement('img'); im.className = 'pim-img'; im.src = 'assets/' + SLUG[it.name] + '.png'; im.style.width = size + 'px';
    const st = document.createElement('span'); st.className = 'stamp'; st.textContent = '맛봄';
    w.appendChild(im); w.appendChild(st);
    w.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const p = parts.find(q => q.el === w); if (!p) return;
      const r = stageRect();
      drag = { p, offx:(e.clientX-r.left)-p.x, offy:(e.clientY-r.top)-p.y, vx:0, vy:0, sx:e.clientX, sy:e.clientY, moved:false };
      p.grabbed = true; w.style.cursor = 'grabbing';
    });
    w.addEventListener('pointerenter', () => { const p = parts.find(q => q.el === w); if (p) showName(p.it); });
    w.addEventListener('pointerleave', () => revertName());
    return { w, im, st };
  }

  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = stageRect(), p = drag.p;
    const nx = clamp((e.clientX-r.left)-drag.offx, fx0+p.r, fx1-p.r);
    const ny = clamp((e.clientY-r.top)-drag.offy, fy0+p.r, fy1-p.r);
    drag.vx = nx - p.x; drag.vy = ny - p.y; p.x = nx; p.y = ny;
    if (Math.hypot(e.clientX-drag.sx, e.clientY-drag.sy) > 4) drag.moved = true;
    render();
  });
  document.addEventListener('pointerup', () => {
    if (!drag) return;
    const p = drag.p; p.grabbed = false; p.el.style.cursor = '';
    if (!drag.moved) eatToggle(p);
    else { p.vx = clamp(drag.vx, -MAXV, MAXV); p.vy = clamp(drag.vy, -MAXV, MAXV); }
    drag = null;
  });

  function build(m) {
    const data = window.SEASONAL[m];
    pool = [];
    for (const c of ['produce','seafood','fruit']) data[c].forEach(([name,emoji]) => pool.push({ cat:c, name, emoji }));
    pool = pool.filter(it => SLUG[it.name]);
    selected = null; revertName();
    header(m); updateProg();

    const size = PSIZE[$('card').dataset.size] || PSIZE.m;
    const box = $('collage'); box.innerHTML = '';
    const rect = box.getBoundingClientRect(); stageW = rect.width || 280; stageH = rect.height || 160;
    const mx = stageW * 0.35, my = stageH * 0.35; fx0 = -mx; fx1 = stageW + mx; fy0 = -my; fy1 = stageH + my;
    const n = ($('card').dataset.size === 's') ? Math.min(pool.length, SMALL_CAP) : pool.length;
    let chosen;
    if (n >= pool.length) chosen = pool.slice();
    else { chosen = []; const gap = pool.length / n; for (let k = 0; k < n; k++) chosen.push(pool[Math.floor(k*gap) % pool.length]); }

    drag = null;
    parts = chosen.map((it) => {
      const mk = makePim(it, size); box.appendChild(mk.w);
      const rec = recOf(m, it.name), eaten = !!rec;
      if (eaten) mk.w.classList.add('eaten');
      mk.st.textContent = (rec && rec.s) || '맛봄';
      const r = size * 0.44, ang = rnd(0, Math.PI*2), sp = rnd(0.12, 0.26);
      return { el:mk.w, img:mk.im, stamp:mk.st, size, it, r, eaten, x: rnd(fx0+r, fx1-r), y: rnd(fy0+r, fy1-r),
        vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp, rot: rnd(-6,6), vr: rnd(-0.07,0.07), grabbed:false };
    });
    render();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function render() {
    for (const p of parts) {
      p.el.style.transform = 'translate(' + (p.x - p.size/2) + 'px,' + (p.y - p.size/2) + 'px)';
      p.img.style.transform = 'rotate(' + p.rot + 'deg)';
    }
  }

  function frame() {
    for (const p of parts) {
      if (p.grabbed) continue;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.x - p.r < fx0) { p.x = fx0 + p.r; p.vx = Math.abs(p.vx); }
      if (p.x + p.r > fx1) { p.x = fx1 - p.r; p.vx = -Math.abs(p.vx); }
      if (p.y - p.r < fy0) { p.y = fy0 + p.r; p.vy = Math.abs(p.vy); }
      if (p.y + p.r > fy1) { p.y = fy1 - p.r; p.vy = -Math.abs(p.vy); }
      p.vx *= DAMP; p.vy *= DAMP;
      const s = Math.hypot(p.vx, p.vy);
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
            const sgn = a.grabbed ? 1 : -1, free = a.grabbed ? b : a;
            free.x += nx*ov*sgn; free.y += ny*ov*sgn;
            const gv = (drag ? drag.vx : 0)*nx*sgn + (drag ? drag.vy : 0)*ny*sgn;
            if (gv > 0) { free.vx += nx*sgn*gv*1.2; free.vy += ny*sgn*gv*1.2; }
          }
        }
      }
    render();
    raf = requestAnimationFrame(frame);
  }

  // month change: frame & title stay; only foods inside slide (smooth)
  let turning = false;
  function setMonth(m, dir) {
    if (turning) return; turning = true; dir = dir || 'next';
    const stage = document.querySelector('.stage');
    const clone = $('collage').cloneNode(true); clone.removeAttribute('id'); clone.classList.add('cl-ov');
    stage.appendChild(clone);
    viewMonth = ((m-1+12)%12)+1; manual = (viewMonth !== cm());
    build(viewMonth);
    const nw = $('collage'), EASE = ' .8s cubic-bezier(.22,1,.36,1)';
    clone.style.animation = (dir === 'next' ? 'clOutL' : 'clOutR') + EASE + ' forwards';
    nw.style.animation = (dir === 'next' ? 'clInR' : 'clInL') + EASE;
    setTimeout(() => { if (clone.parentNode) clone.remove(); nw.style.animation = ''; turning = false; }, 840);
  }
  function tick() { const k = new Date().toDateString(); if (k !== dayKey) { dayKey = k; if (!manual) build(cm()); } }

  $('prev').onclick = () => setMonth(viewMonth - 1, 'prev');
  $('next').onclick = () => setMonth(viewMonth + 1, 'next');
  $('todayBtn').onclick = () => { const t = cm(); setMonth(t, (((t - viewMonth) % 12 + 12) % 12) <= 6 ? 'next' : 'prev'); };
  document.querySelector('.stage').addEventListener('pointerdown', (e) => { if (!e.target.closest('.pim')) deselect(); });

  if (window.api) {
    window.api.getSize().then(s => { if (s) { $('card').dataset.size = s; build(viewMonth); } }).catch(()=>{});
    window.api.onSize(s => { $('card').dataset.size = s; build(viewMonth); });
  }

  dayKey = new Date().toDateString();
  build(viewMonth);
  setInterval(tick, 60*1000);
})();
