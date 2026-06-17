(function () {
  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const EN = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const SEASONS = { 12:'WINTER',1:'WINTER',2:'WINTER',3:'SPRING',4:'SPRING',5:'SPRING',6:'SUMMER',7:'SUMMER',8:'SUMMER',9:'AUTUMN',10:'AUTUMN',11:'AUTUMN' };
  const CAT = { produce:'농산물', seafood:'해산물', fruit:'과일' };

  const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  const $ = id => document.getElementById(id);

  let pool = [], roster = [], lastKey = '';

  function renderMonth() {
    const now = new Date();
    const m = now.getMonth() + 1;
    const data = window.SEASONAL[m];
    $('kick').textContent = SEASONS[m] + ' · SEASONAL';
    $('month').textContent = MONTHS[m-1];
    $('monthen').textContent = EN[m-1];
    $('bignum').textContent = m;

    // flat pool across categories
    pool = [];
    for (const c of ['produce','seafood','fruit'])
      data[c].forEach(([name,emoji]) => pool.push([c,name,emoji]));
    pool = shuffle(pool);

    // roster ticker (all month items)
    const box = $('roster'); box.innerHTML = '';
    pool.forEach(([c,name]) => {
      const s = document.createElement('span');
      s.className = 'ritem'; s.dataset.name = name; s.textContent = name;
      box.appendChild(s);
    });
  }

  let idx = 0;
  function rotate() {
    if (!pool.length) return;
    const [cat,name,emoji] = pool[idx % pool.length]; idx++;
    $('fcat').textContent = CAT[cat];
    const em = $('femoji'), fimg = $('fimg');
    const slug = (window.SLUG || {})[name];
    const showEmoji = () => { fimg.style.display='none'; em.style.display='block';
      em.textContent = emoji; em.style.animation='none'; void em.offsetWidth; em.style.animation=''; };
    if (slug) {
      fimg.onload = () => { em.style.display='none'; fimg.style.display='block';
        fimg.style.animation='none'; void fimg.offsetWidth; fimg.style.animation=''; };
      fimg.onerror = showEmoji;
      fimg.src = 'assets/' + slug + '.png';
    } else showEmoji();
    $('fname').textContent = name;
    // highlight in roster
    document.querySelectorAll('.ritem.hot').forEach(r => r.classList.remove('hot'));
    const r = document.querySelector('.ritem[data-name="'+name+'"]');
    if (r) r.classList.add('hot');
  }

  function tick() {
    const d = new Date();
    const key = d.getFullYear()+'-'+d.getMonth();
    if (key !== lastKey) { lastKey = key; renderMonth(); idx = 0; }
    rotate();
  }

  renderMonth(); rotate();
  setInterval(rotate, 3500);
  setInterval(tick, 60*1000);
})();
