(function () {
  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const SEASON = { 12:'WINTER',1:'WINTER',2:'WINTER',3:'SPRING',4:'SPRING',5:'SPRING',6:'SUMMER',7:'SUMMER',8:'SUMMER',9:'AUTUMN',10:'AUTUMN',11:'AUTUMN' };
  const CAT = { produce:'농산물', seafood:'해산물', fruit:'과일' };
  const $ = id => document.getElementById(id);

  let pool = [], lastKey = '';

  function build(m) {
    const data = window.SEASONAL[m];
    pool = [];
    for (const c of ['produce','seafood','fruit'])
      data[c].forEach(([name,emoji]) => pool.push([c,name,emoji]));
    $('mon').textContent = MONTHS[m-1] + ' 제철';
    $('season').textContent = SEASON[m];
    $('cnt').innerHTML = '이번 달 <b>' + pool.length + '</b>종';
  }

  function show(i) {
    if (!pool.length) return;
    const [cat,name,emoji] = pool[i % pool.length];
    $('fcat').textContent = CAT[cat];
    $('fname').textContent = name;
    const em = $('femoji'), fimg = $('fimg');
    const slug = (window.SLUG || {})[name];
    const showEmoji = () => { fimg.style.display='none'; em.style.display='inline';
      em.textContent = emoji; em.style.animation='none'; void em.offsetWidth; em.style.animation=''; };
    if (slug) {
      fimg.onload = () => { em.style.display='none'; fimg.style.display='inline';
        fimg.style.animation='none'; void fimg.offsetWidth; fimg.style.animation=''; };
      fimg.onerror = showEmoji;
      fimg.src = 'assets/' + slug + '.png';
    } else showEmoji();
  }

  // deterministic "today's pick": stable through the day, varies day to day
  function todayIndex() {
    const d = new Date();
    const seed = d.getFullYear()*1000 + (d.getMonth()*31 + d.getDate());
    return seed % (pool.length || 1);
  }

  function tick() {
    const d = new Date();
    const key = d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();
    if (key !== lastKey) { lastKey = key; build(d.getMonth()+1); show(todayIndex()); }
  }

  build(new Date().getMonth()+1);
  show(todayIndex());
  lastKey = (()=>{const d=new Date();return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();})();
  setInterval(tick, 60*1000); // roll over at midnight / month change
})();
