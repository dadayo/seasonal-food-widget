(function () {
  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const SEASONS = { 12:'겨울',1:'겨울',2:'겨울',3:'봄',4:'봄',5:'봄',6:'여름',7:'여름',8:'여름',9:'가을',10:'가을',11:'가을' };
  const CAT_LABEL = { produce:'농산물', seafood:'해산물', fruit:'과일' };

  const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  const $ = id => document.getElementById(id);

  let pool = [];        // flattened [cat,name,emoji] for the month
  let lastKey = '';

  function renderMonth() {
    const now = new Date();
    const m = now.getMonth() + 1;
    const data = window.SEASONAL[m];
    $('season').textContent = (SEASONS[m] || '') + ' · SEASONAL';
    $('month').firstChild.textContent = MONTHS[m-1] + ' 제철 ';
    $('sub').textContent = '오늘 ' + (now.getMonth()+1) + '/' + now.getDate();

    for (const cat of ['produce','seafood','fruit']) {
      const box = $(cat); box.innerHTML = '';
      shuffle(data[cat]).forEach(([name,emoji]) => {
        const c = document.createElement('span');
        c.className = 'chip'; c.dataset.key = cat+':'+name;
        c.textContent = emoji + ' ' + name;
        box.appendChild(c);
      });
    }
    // build random feature pool across all three categories
    pool = [];
    for (const cat of ['produce','seafood','fruit'])
      data[cat].forEach(([name,emoji]) => pool.push([cat,name,emoji]));
    pool = shuffle(pool);
    $('foot').textContent = '한국 제철 기준 · 매달 자동 갱신';
  }

  let idx = 0;
  function rotateFeature() {
    if (!pool.length) return;
    const [cat,name,emoji] = pool[idx % pool.length];
    idx++;
    $('fcat').textContent = CAT_LABEL[cat];
    const em = $('femoji'); em.textContent = emoji;
    em.style.animation = 'none'; void em.offsetWidth; em.style.animation = '';
    $('fname').textContent = name;
    // highlight the matching chip
    document.querySelectorAll('.chip.hot').forEach(c => c.classList.remove('hot'));
    const chip = document.querySelector('.chip[data-key="'+cat+':'+name+'"]');
    if (chip) chip.classList.add('hot');
  }

  function tick() {
    const key = new Date().toDateString().slice(0,10) + '-' + new Date().getMonth();
    if (key !== lastKey) { lastKey = key; renderMonth(); idx = 0; }
    rotateFeature();
  }

  renderMonth();
  rotateFeature();
  setInterval(rotateFeature, 3500);   // random feature every 3.5s
  setInterval(tick, 60*1000);         // re-check month each minute
})();
