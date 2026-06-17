(function () {
  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const SEASON = { 12:'WINTER',1:'WINTER',2:'WINTER',3:'SPRING',4:'SPRING',5:'SPRING',6:'SUMMER',7:'SUMMER',8:'SUMMER',9:'AUTUMN',10:'AUTUMN',11:'AUTUMN' };
  const CAT = { produce:'농산물', seafood:'해산물', fruit:'과일' };
  const $ = id => document.getElementById(id);
  const SLUG = window.SLUG || {}, RECIPES = window.RECIPES || {};

  let pool = [], cur = 0, monKey = '', timer = null;

  function build(m) {
    const data = window.SEASONAL[m];
    pool = [];
    for (const c of ['produce','seafood','fruit'])
      data[c].forEach(([name,emoji]) => pool.push({ cat:c, name, emoji }));
    $('mon').textContent = MONTHS[m-1] + ' 제철';
    $('season').textContent = SEASON[m];
    $('bignum').textContent = m;
    $('cnt').innerHTML = '이번 달 <b>' + pool.length + '</b>종';
    // peek thumbnails
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
    const showEmoji = () => { fimg.style.display='none'; em.style.display='inline'; em.textContent = it.emoji; };
    if (slug) { fimg.onload = () => { em.style.display='none'; fimg.style.display='inline'; };
      fimg.onerror = showEmoji; fimg.src = 'assets/'+slug+'.png'; }
    else showEmoji();
    // recipe line
    const r = RECIPES[it.name];
    $('recipe').innerHTML = r ? ('추천 <b>'+r.join(' · ')+'</b> &nbsp;<span class="go-r">레시피 →</span>')
                              : '<span class="go-r">레시피 검색 →</span>';
    // highlight peek
    document.querySelectorAll('.peek .p.on').forEach(p=>p.classList.remove('on'));
    const pp = document.querySelector('.peek .p[data-i="'+i+'"]'); if (pp) pp.classList.add('on');
  }

  function flipTo(i) {
    cur = (i + pool.length) % pool.length;
    const el = $('flip');
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    setTimeout(() => paint(cur), 450);
  }
  function goto(i){ flipTo(i); restart(); }
  function next(){ flipTo(cur + 1); }

  function start(){ timer = setInterval(next, 9000); }
  function stop(){ clearInterval(timer); timer = null; }
  function restart(){ stop(); start(); }

  function tick() {
    const d = new Date(), k = d.getFullYear()+'-'+d.getMonth();
    if (k !== monKey) { monKey = k; build(d.getMonth()+1);
      cur = (d.getDate()) % pool.length; paint(cur); }
  }

  // interactions
  $('imgwrap').onclick = () => goto(cur + 1);
  $('recipe').onclick = () => window.api && window.api.openRecipe(pool[cur].name);
  const card = $('card');
  card.addEventListener('mouseenter', stop);
  card.addEventListener('mouseleave', start);

  // size from main
  if (window.api) {
    window.api.getSize().then(s => { if (s) card.dataset.size = s; }).catch(()=>{});
    window.api.onSize(s => { card.dataset.size = s; });
  }

  // init
  const d = new Date(); monKey = d.getFullYear()+'-'+d.getMonth();
  build(d.getMonth()+1);
  cur = d.getDate() % pool.length;
  paint(cur);
  start();
  setInterval(tick, 60*1000);
})();
