const root=document.querySelector('#root');
const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const fmt=d=>d?new Date(d).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}):'—';
const dateOnly=d=>d?new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'—';
const api=async(path,opts={})=>{const r=await fetch(path,{...opts,headers:opts.body instanceof FormData?opts.headers:{'Content-Type':'application/json',...(opts.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.message||j.error||'Terjadi kesalahan.'),{status:r.status,data:j});return j};
const toast=(m)=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2700)};
const initials=n=>String(n||'Eco Point').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
const statusLabel=s=>({pending_admin:'Menunggu',submitted:'Terkirim',automated_review:'Diperiksa',approved:'Disetujui',rejected:'Ditolak',pending:'Diproses',ready:'Siap diambil',collected:'Selesai',cancelled:'Dibatalkan'}[s]||String(s||'').replaceAll('_',' '));
const statusPill=s=>`<span class="pill ${esc(s)}">${esc(statusLabel(s))}</span>`;

function icon(name,cls=''){
 const paths={
  leaf:'<path d="M11 20A7 7 0 0 1 9.8 6.1C15 5 19.3 6.8 21 10.2c-1.2 5.5-5.1 8.8-10 8.8"/><path d="M3 21c3-5 7-8 13-10"/>',
  home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  gift:'<path d="M20 12v9H4v-9M2 7h20v5H2z"/><path d="M12 7v14"/><path d="M12 7H8.5A2.5 2.5 0 1 1 11 4.5zM12 7h3.5A2.5 2.5 0 1 0 13 4.5z"/>',
  trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bell:'<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  logout:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h7v18h-7"/>',
  map:'<path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3z"/><path d="M9 3v15M15 6v15"/>',
  pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/><path d="M10 11v6M14 11v6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  recycle:'<path d="M7 19H4l2-3"/><path d="M4 19a8 8 0 0 0 13.5 1"/><path d="m17 5 2-3 2 3"/><path d="M19 2a8 8 0 0 0-13.5 1"/><path d="m3 8 1-3 3 1"/><path d="M4 5a8 8 0 0 0 .5 12"/>',
  chart:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  arrow:'<path d="M5 12h14M14 7l5 5-5 5"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  x:'<path d="m6 6 12 12M18 6 6 18"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  spark:'<path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'
 };
 return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.leaf}</svg>`;
}
function logo(){return `<span class="brandmark">${icon('leaf')}</span><span>Eco-Point<small>Campus Sustainability</small></span>`}

function publicHeader(active=''){
 return `<header class="topbar"><a href="/" class="brand">${logo()}</a><a href="/about" class="green-campus-header" aria-label="Green Campus – tentang program"><img src="/images/green-campus-logo.svg" alt="Green Campus" width="142" height="57"></a><nav class="topnav" id="topnav"><a class="${active==='about'?'active':''}" href="/about">Tentang</a><a class="${active==='how'?'active':''}" href="/how-it-works">Cara Kerja</a><a class="${active==='guide'?'active':''}" href="/waste-guide">Panduan Sampah</a><a class="${active==='locations'?'active':''}" href="/locations">Lokasi</a><a class="btn primary" href="/login">Masuk</a></nav><button class="menu-toggle" id="menuToggle" aria-label="Buka menu">${icon('menu')}</button></header>`;
}
function wirePublicNav(){const b=document.querySelector('#menuToggle'),n=document.querySelector('#topnav');if(!b||!n)return;b.setAttribute('aria-controls','topnav');b.setAttribute('aria-expanded','false');const close=()=>{n.classList.remove('open');b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','Buka menu')};b.onclick=()=>{const isOpen=n.classList.toggle('open');b.setAttribute('aria-expanded',String(isOpen));b.setAttribute('aria-label',isOpen?'Tutup menu':'Buka menu')};document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});document.addEventListener('click',e=>{if(!b.contains(e.target)&&!n.contains(e.target))close()});n.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));window.addEventListener('resize',()=>{if(innerWidth>820)close()})}

function initImmersive(){
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 document.documentElement.classList.add('immersive-ready');
 const canTilt=window.matchMedia('(pointer:fine)').matches&&window.innerWidth>768;
 if(canTilt){
  document.querySelectorAll('[data-tilt]').forEach(el=>{
   if(el.dataset.tiltReady==='1')return;
   el.dataset.tiltReady='1';
   const strength=Number(el.dataset.tiltStrength||5);
   const reset=()=>{el.style.setProperty('--tilt-x','0deg');el.style.setProperty('--tilt-y','0deg');el.style.setProperty('--tilt-z','0px')};
   el.addEventListener('pointermove',e=>{
    const r=el.getBoundingClientRect();
    const px=(e.clientX-r.left)/r.width-.5;
    const py=(e.clientY-r.top)/r.height-.5;
    el.style.setProperty('--tilt-x',(-py*strength).toFixed(2)+'deg');
    el.style.setProperty('--tilt-y',(px*strength).toFixed(2)+'deg');
    el.style.setProperty('--tilt-z','8px');
   });
   el.addEventListener('pointerleave',reset);
   el.addEventListener('blur',reset,true);
  });
 }
 const revealers=document.querySelectorAll('.poster-panel,.simple-panel,.simple-summary,.reward,.redemption-card');
 if('IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('immersive-visible');io.unobserve(entry.target)}}),{threshold:.12});
  revealers.forEach(el=>{if(!el.classList.contains('immersive-visible'))io.observe(el)});
 }else revealers.forEach(el=>el.classList.add('immersive-visible'));
}


function mobilePublicHome(){
 return `<div class="mobile-public-home">
   <header class="m-appbar"><a href="/" class="m-brand"><span class="m-brand-icon">${icon('leaf','sm')}</span><span>Eco-Point<small>GREEN CAMPUS</small></span></a><a class="m-header-login" href="/login">Masuk ${icon('arrow','sm')}</a></header>
   <nav class="m-chips" aria-label="Kategori beranda"><a class="selected" href="#m-home">Untuk kamu</a><a href="#m-rewards">Hadiah</a><a href="#m-steps">Cara kerja</a><a href="/waste-guide">Panduan sampah</a></nav>
   <main class="m-feed">
    <section id="m-home" class="m-hero">
      <div class="m-hero-copy"><div class="m-eyebrow">🌱 GERAKAN KAMPUS HIJAU</div><h1>Kumpulkan poin,<br><em>jadilah Top 3!</em></h1><p>Laporkan aksi pilah sampahmu, bersaing menjadi Top 3 dan menangkan hadiah JETE.</p><a class="m-hero-cta" href="/login">Mulai kumpulkan poin ${icon('arrow','sm')}</a></div>
      <div class="m-hero-art"><img class="eco-jete-image eco-jete-1" src="/images/jete-mouse.webp" alt="Hadiah Juara 1: Mouse JETE MO106" width="640" height="640" loading="eager" decoding="async"></div>
    </section>
    <section id="ecoContestMobile" class="eco-contest-mobile-preview"></section><section class="m-shortcuts" aria-label="Aksi cepat">
      <a href="/login?next=%2Freport"><span class="m-short-icon mint">${icon('upload')}</span><b>Lapor</b></a>
      <a href="/login?next=%2Fredemptions"><span class="m-short-icon peach">${icon('gift')}</span><b>Top 3 Hadiah</b></a>
      <a href="/locations"><span class="m-short-icon blue">${icon('pin')}</span><b>Lokasi</b></a>
      <a href="/waste-guide"><span class="m-short-icon yellow">${icon('recycle')}</span><b>Panduan</b></a>
    </section>
    <div class="m-points-strip"><div><strong>+5–10</strong><span>poin per laporan disetujui</span></div><span class="m-strip-divider"></span><div><strong>TOP 3</strong><span>poin terbanyak menang</span></div></div>
    <section class="m-section" id="m-rewards">
      <div class="m-section-head"><div><span class="m-section-label">MERCHANDISE</span><h2>Rebut 3 hadiah JETE! 🎁</h2></div><a href="/login?next=%2Fredemptions">Lihat semua</a></div>
      <p class="m-section-sub">Hadiah untuk JUARA 1, JUARA 2, dan JUARA 3.</p>
      <div id="mobileLandingRewards" class="m-reward-rail"><div class="m-loading">Memuat hadiah…</div></div>
    </section>
    <section class="m-section" id="m-steps">
      <div class="m-section-head"><div><span class="m-section-label">MUDAH BANGET</span><h2>Cara dapat poin</h2></div><a href="/how-it-works">Detail</a></div>
      <div class="m-steps-list">
        <div><span class="m-step-mark">1</span><div><b>Pilah & foto sampah</b><small>Dokumentasikan aktivitasmu.</small></div>${icon('camera','sm')}</div>
        <div><span class="m-step-mark">2</span><div><b>Kirim laporan</b><small>Isi kategori, bukti, dan GPS.</small></div>${icon('upload','sm')}</div>
        <div><span class="m-step-mark">3</span><div><b>Admin menyetujui</b><small>Poin langsung ditambahkan.</small></div>${icon('check','sm')}</div>
        <div><span class="m-step-mark">4</span><div><b>Menang dengan Top 3 poin</b><small>Naik peringkat dan raih Top 3.</small></div>${icon('gift','sm')}</div>
      </div>
    </section>
    <section class="m-impact-tile"><span>KENAPA ECO-POINT?</span><div><strong>98,1%</strong><p>responden survei awal setuju insentif digital dapat mendorong pemilahan sampah.</p></div></section>
   </main>
   <nav class="m-public-bottom" aria-label="Navigasi Eco-Point"><a href="/" class="active">${icon('home')}<span>Beranda</span></a><a href="/waste-guide">${icon('recycle')}<span>Panduan</span></a><a class="m-bottom-main" href="/login?next=%2Freport"><span class="m-plus">${icon('plus')}</span><span>Lapor</span></a><a href="/locations">${icon('pin')}<span>Lokasi</span></a><a href="/login">${icon('user')}<span>Akun</span></a></nav>
  </div>`;
}
async function landing(){
 root.innerHTML=mobilePublicHome()+publicHeader()+`<main class="taste-home">
  <section class="taste-hero">
   <div class="taste-hero-inner">
    <div class="taste-hero-copy">
     <span class="taste-tag"><span class="taste-tag-mark"></span> Eco-Point • Telkom University</span>
     <h1>Pilah sampah.<br><span>Jadilah juara Top 3!</span></h1>
     <p>Aksi kecil untuk kampus yang lebih hijau. Dokumentasikan pemilahan sampah, dapatkan Eco-Points, dan raih tiga hadiah JETE untuk peringkat terbaik.</p>
     <div class="taste-hero-cta">
      <a href="/login" class="taste-btn taste-btn-lime">Mulai beraksi ${icon('arrow','sm')}</a>
      <a href="#alur" class="taste-btn taste-btn-outline">Lihat cara kerja</a>
     </div>
    </div>
    <div class="taste-hero-art" data-tilt data-tilt-strength="3" aria-label="Ilustrasi kegiatan pemilahan sampah">
     <div class="taste-art-ring taste-art-ring-one" aria-hidden="true"></div>
     <div class="taste-art-ring taste-art-ring-two" aria-hidden="true"></div>
     <div class="taste-art-platform" aria-hidden="true"></div>
     <img class="taste-hero-illustration" src="/images/eco-premium.svg" alt="Ilustrasi mahasiswa memilah sampah untuk Eco-Point">
     <div class="taste-art-label taste-label-top">${icon('leaf','sm')} Aksi ramah lingkungan</div>
     <div class="taste-art-label taste-label-bottom">${icon('gift','sm')} Reward dari Eco-Points</div>
    </div>
   </div>
  </section>

  <div id="ecoContestDesktop"></div><section class="taste-section taste-how" id="alur">
   <div class="taste-section-intro"><span class="taste-kicker">Cara kerja</span><h2>Mulai dari satu aksi sederhana.</h2><p>Empat langkah mudah. Tidak perlu proses yang rumit.</p></div>
   <div class="taste-steps">
    <article class="taste-step"><div class="taste-step-top"><span>01</span><span class="taste-step-icon">${icon('recycle')}</span></div><h3>Pilah sampah</h3><p>Pisahkan sampah sesuai kategori yang tersedia.</p></article>
    <article class="taste-step"><div class="taste-step-top"><span>02</span><span class="taste-step-icon">${icon('upload')}</span></div><h3>Foto & laporkan</h3><p>Unggah bukti, deskripsi, dan lokasi aktivitas.</p></article>
    <article class="taste-step"><div class="taste-step-top"><span>03</span><span class="taste-step-icon">${icon('check')}</span></div><h3>Tunggu verifikasi</h3><p>Administrator meninjau laporan sebelum poin diberikan.</p></article>
    <article class="taste-step"><div class="taste-step-top"><span>04</span><span class="taste-step-icon">${icon('gift')}</span></div><h3>Naik peringkat</h3><p>Top 3 poin terverifikasi memenangkan hadiah JETE.</p></article>
   </div>
  </section>

  <section class="taste-impact">
   <div class="taste-impact-inner"><div class="taste-impact-main"><span class="taste-kicker">Mengapa Eco-Point?</span><h2>Perubahan dimulai dari kebiasaan.</h2><p>Survei awal terhadap 54 mahasiswa menunjukkan pentingnya fasilitas pemilahan dan insentif yang mudah diakses.</p></div>
   <div class="taste-impact-stat"><strong>98,1<span>%</span></strong><p>responden setuju insentif digital dapat mendorong kebiasaan memilah sampah.</p></div>
   <div class="taste-impact-minis"><div><strong>48,1%</strong><span>hanya kadang-kadang memilah sampah</span></div><div><strong>64,8%</strong><span>menilai fasilitas tempat sampah terpilah masih terbatas</span></div></div>
   </div>
  </section>

  <section class="taste-section taste-rewards" id="reward">
   <div class="taste-rewards-heading"><div><span class="taste-kicker">Reward Eco-Point</span><h2>Tiga hadiah. Tiga pemenang!</h2><p>Menang berdasarkan akumulasi poin laporan yang disetujui admin.</p></div><a href="/login" class="taste-simple-link">Masuk ke katalog ${icon('arrow','sm')}</a></div>
   <div id="landingRewards" class="taste-reward-grid"><div class="taste-loader">Memuat katalog reward…</div></div>
  </section>
 </main>${footer()}`;
 wirePublicNav();
 try{
  const e=await api('/api/public/event');
  window.EcoContest.landing(e);
  window.EcoContest.startTimer();
 }catch(error){
  for(const id of ['landingRewards','mobileLandingRewards','ecoContestDesktop','ecoContestMobile']){
   const el=document.getElementById(id);if(el)el.innerHTML='<p class="eco-empty-rank">Informasi kompetisi belum dapat dimuat. Coba muat ulang.</p>';
  }
 }
 initImmersive();
}
function productPreview(r){return r.category==='contest'?window.EcoContest.prizes({prizes:[{place:r.name==='Mouse JETE MO106'?1:r.name==='Earphone JETE Eazy 3'?2:3,name:r.name}]},'rail'):`<article class="product-card"><div class="product-body"><h3>${esc(r.name)}</h3></div></article>`}
function footer(){return `<footer class="foot"><div class="footer-grid"><div><a href="/" class="brand">${logo()}</a><div class="green-campus-footer"><img src="/images/green-campus-logo.svg" width="180" height="72" loading="lazy" alt="Logo Green Campus"></div><p style="max-width:420px;margin-top:14px">Platform kampus untuk aksi pemilahan sampah, Eco-Points terverifikasi, dan kompetisi Top 3 hadiah JETE.</p></div><div><h4>Informasi</h4><div class="footer-links"><a href="/about">Tentang</a><a href="/how-it-works">Cara Kerja</a><a href="/waste-guide">Panduan Sampah</a><a href="/locations">Lokasi</a></div></div><div><h4>Akses</h4><div class="footer-links"><a href="/login">Masuk Mahasiswa</a><a href="/admin/">Administrator</a></div></div></div><div class="copyright">© ${new Date().getFullYear()} Eco-Point · Campus Sustainability Platform</div></footer>`}

async function infoPage(kind){
 const config={
  '/about':{active:'about',eyebrow:'About Eco-Point',title:'A campus sustainability experience built around participation.',lead:'Eco-Point menghubungkan aksi mahasiswa, verifikasi administrator, Eco-Points, dan merchandise dalam satu alur digital yang dapat ditelusuri.'},
  '/how-it-works':{active:'how',eyebrow:'How It Works',title:'From sorted waste to verified Eco-Points.',lead:'Setiap laporan mengikuti alur yang sama: aktivitas, bukti, GPS, pemeriksaan, keputusan admin, lalu transaksi poin.'},
  '/waste-guide':{active:'guide',eyebrow:'Waste Guide',title:'Sort with more confidence.',lead:'Gunakan kategori yang telah diaktifkan administrator dan dokumentasikan aktivitas dengan jelas sebelum mengirim laporan.'},
  '/locations':{active:'locations',eyebrow:'Waste Locations',title:'Find registered waste points.',lead:'Lokasi di bawah bersumber langsung dari konfigurasi operasional Eco-Point.'}
 }[kind];
 root.innerHTML=publicHeader(config.active)+`<main><section class="info-hero"><div class="eyebrow">${config.eyebrow}</div><h1 class="section-title" style="max-width:850px">${config.title}</h1><p class="section-lead">${config.lead}</p></section><section class="section alt" style="padding-top:38px"><div id="infoContent" class="loading">Memuat…</div></section></main>${footer()}`;wirePublicNav();
 const el=document.querySelector('#infoContent');
 if(kind==='/about'){el.className='info-grid';el.innerHTML=`<article class="info-card"><div class="category-icon">${icon('recycle')}</div><h3>Structured reporting</h3><p>Laporan menggabungkan kategori, foto, GPS, waktu, deskripsi, dan hasil pemeriksaan otomatis.</p></article><article class="info-card"><div class="category-icon">${icon('check')}</div><h3>Human verification</h3><p>Keputusan final tetap berada pada administrator dan tercatat sebagai audit trail.</p></article><article class="info-card"><div class="category-icon">${icon('gift')}</div><h3>Meaningful rewards</h3><p>Eco-Points dari laporan yang disetujui menentukan peringkat Top 3 selama periode kompetisi.</p></article>`;return}
 if(kind==='/how-it-works'){el.className='steps';el.innerHTML=`<article class="step"><span class="step-number">01</span><h3>Sign in</h3><p>Gunakan akun institusi yang telah diizinkan.</p></article><article class="step"><span class="step-number">02</span><h3>Report activity</h3><p>Tambahkan kategori, foto, deskripsi, dan GPS.</p></article><article class="step"><span class="step-number">03</span><h3>Admin verifies</h3><p>Admin meninjau bukti serta hasil automated checks.</p></article><article class="step"><span class="step-number">04</span><h3>Earn & redeem</h3><p>Poin masuk setelah approval dan dapat ditukar dengan reward.</p></article>`;return}
 try{const d=await api('/api/public/catalog');if(kind==='/waste-guide'){el.className='category-grid';el.innerHTML=d.categories.length?d.categories.map((c,i)=>`<article class="category-card"><div class="category-icon">${icon(['recycle','file','leaf','spark','more'][i%5])}</div><h3>${esc(c.name)}</h3><p>${esc(c.description||'Ikuti kategori ini saat melakukan pemilahan dan pelaporan.')}</p></article>`).join(''):'<div class="empty" style="grid-column:1/-1">Kategori belum tersedia.</div>'}else{el.className='info-grid';el.innerHTML=d.locations.length?d.locations.map(x=>`<article class="info-card"><div class="category-icon">${icon('pin')}</div><h3>${esc(x.name)}</h3><p>${esc(x.description||'Lokasi pengelolaan sampah terdaftar.')}</p><a class="btn ghost" style="margin-top:16px" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${x.latitude}&mlon=${x.longitude}#map=18/${x.latitude}/${x.longitude}">Open Map ${icon('arrow','sm')}</a></article>`).join(''):'<div class="empty" style="grid-column:1/-1">Belum ada lokasi aktif.</div>'}}catch(e){el.className='error';el.textContent=e.message}
}

const navItems=[
 ['dashboard','Beranda','home','/dashboard'],
 ['report','Buat Laporan','plus','/report'],
 ['reports','Laporan Saya','file','/reports'],
 ['rewards','Event Top 3','gift','/redemptions'],
 ['redemptions','Riwayat Lama','clock','/riwayat'],
 ['community','Peringkat','trophy','/leaderboard'],
 ['profile','Profil','user','/profile']
];
function appShell(active,body,me,opts={}){
 root.innerHTML=`<div class="app-layout"><aside class="sidebar"><a href="/dashboard" class="brand">${logo()}</a><div class="green-campus-sidebar"><img src="/images/green-campus-logo.svg" width="150" height="60" alt="Logo Green Campus"></div><div class="side-user"><span class="avatar">${esc(initials(me?.full_name))}</span><span><b>${esc(me?.full_name||'Mahasiswa')}</b><span>${esc(me?.email||'')}</span></span></div><nav class="side-nav">${navItems.map(([k,l,i,p])=>`<button data-href="${p}" class="${active===k?'active':''}">${icon(i,'sm')}${l}</button>`).join('')}</nav><div class="side-bottom">Eco-Point · Student Workspace<br>Campus sustainability platform</div></aside><div class="app-main-wrap"><header class="m-member-appbar"><a class="m-brand" href="/dashboard"><span class="m-brand-icon">${icon('leaf','sm')}</span><span>Eco-Point<small>AREA MEMBER</small></span></a><a class="m-member-profile" href="/profile" aria-label="Buka profil">${esc(initials(me?.full_name))}</a></header><header class="dash-topbar"><div><div class="breadcrumb">Eco-Point / ${esc(navItems.find(x=>x[0]===active)?.[1]||'Workspace')}</div></div><div class="dash-actions"><button class="icon-btn" title="Notifications" onclick="location.href='/leaderboard'">${icon('bell','sm')}${opts.unread?'<span style="position:absolute;width:7px;height:7px;border-radius:50%;background:var(--danger);margin:-20px 0 0 14px"></span>':''}</button><span class="avatar" style="width:36px;height:36px;font-size:11px">${esc(initials(me?.full_name))}</span><button class="btn ghost" id="signOut">${icon('logout','sm')} Keluar</button></div></header><main class="app-main">${body}</main></div></div><nav class="bottom-nav" aria-label="Navigasi member">${[
 ['dashboard','Beranda','home','/dashboard'],
 ['reports','Laporan','file','/reports'],
 ['report','Lapor','plus','/report'],
 ['rewards','Top 3','gift','/redemptions'],
 ['profile','Profil','user','/profile']
].map(([k,l,i,p])=>`<button type="button" data-href="${p}" class="${active===k?'active':''} ${k==='report'?'mobile-primary-tab':''}" aria-label="${l}">${k==='report'?'<span class="mobile-plus-tab">'+icon(i)+'</span>':icon(i)}<span>${l}</span></button>`).join('')}</nav><div id="mobileMore" class="mobile-more"><button data-href="/riwayat">${icon('clock','sm')} Hadiah Saya</button><button data-href="/leaderboard">${icon('trophy','sm')} Peringkat</button><button data-href="/profile">${icon('user','sm')} Profil</button></div>`;
 document.querySelectorAll('[data-href]').forEach(b=>b.onclick=()=>location.href=b.dataset.href);
 const out=document.querySelector('#signOut');if(out)out.onclick=async()=>{await hatchable.auth.signOut();location.href='/'};
 const more=document.querySelector('#moreNav'),sheet=document.querySelector('#mobileMore');if(more&&sheet)more.onclick=()=>{sheet.style.display=sheet.style.display==='grid'?'none':'grid';sheet.style.position='fixed';sheet.style.bottom='72px';sheet.style.left='12px';sheet.style.right='12px';sheet.style.background='#fff';sheet.style.padding='10px';sheet.style.border='1px solid var(--border)';sheet.style.borderRadius='16px';sheet.style.boxShadow='var(--shadow-hover)';sheet.style.zIndex='90';sheet.querySelectorAll('button').forEach(x=>{x.style.border='0';x.style.background='transparent';x.style.padding='12px';x.style.textAlign='left';x.style.display='flex';x.style.gap='9px';x.style.alignItems='center'})};
 requestAnimationFrame(initImmersive);
}
async function authSession(){const s=await hatchable.auth.getSession();if(!s?.user){location.href='/login?next='+encodeURIComponent(location.pathname+location.search);return null}return s.user}
function accessError(e){if(e.status===403&&e.data?.error==='registration_unavailable'){root.innerHTML=publicHeader()+`<main class="section"><div class="error"><b>Pendaftaran belum tersedia.</b><p>Administrator belum mengonfigurasi domain email institusi resmi.</p></div></main>${footer()}`;wirePublicNav();return}if(e.status===403){root.innerHTML=publicHeader()+`<main class="section"><div class="error">${esc(e.message)}</div></main>${footer()}`;wirePublicNav();return}root.innerHTML=publicHeader()+`<main class="section"><div class="error">${esc(e.message)}</div></main>${footer()}`;wirePublicNav()}
function greeting(){const h=new Date().getHours();return h<11?'Good morning':h<15?'Good afternoon':h<19?'Good evening':'Hello'}
function activityMarkup(data,days=30){const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days+1);const map=new Map((data||[]).map(x=>[String(x.report_date).slice(0,10),Number(x.count)]));const arr=[];for(let i=0;i<days;i++){const d=new Date(cutoff);d.setDate(cutoff.getDate()+i);const key=d.toISOString().slice(0,10);arr.push({date:d,count:map.get(key)||0})}const max=Math.max(...arr.map(x=>x.count),1);return arr.map((x,i)=>`<div class="chart-col"><div class="chart-bar" style="height:${Math.max(3,x.count/max*100)}%" data-tip="${x.count} report · ${x.date.toLocaleDateString('id-ID',{day:'numeric',month:'short'})}"></div>${(days===7||i%5===0||i===days-1)?`<span class="chart-label">${x.date.toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</span>`:''}</div>`).join('')}

async function loadDashboard(){
 const user=await authSession();if(!user)return;
 try{
  const d=await api('/api/student/dashboard');
  // Contest points are earned by admin-approved reports; rewards cannot be purchased.
  const next=null;
  const remaining=0;
  const mobileDashboard=`<section class="m-member-home">
    <header class="m-member-greeting"><div><small>HALO, PEJUANG LINGKUNGAN 👋</small><h1>${esc(d.profile.full_name||'Mahasiswa')}</h1></div><a href="/profile" aria-label="Profil">${icon('user')}</a></header>
    <div class="m-wallet-card"><div><span>SALDO ECO-POINTS</span><strong>${Number(d.points||0)} <small>pts</small></strong><p>${next?(remaining>0?remaining+' poin lagi menuju hadiah berikutnya':'Kamu sudah bisa menukar poin!'):'Terus kumpulkan poin dari laporan.'}</p></div><a href="/redemptions" class="m-wallet-bubble">${icon('gift')}</a></div>
    <div class="m-member-actions"><a href="/report"><span class="m-action-symbol action-lime">${icon('plus')}</span><b>Buat Laporan</b></a><a href="/reports"><span class="m-action-symbol action-blue">${icon('file')}</span><b>Status Laporan</b></a><a href="/redemptions"><span class="m-action-symbol action-yellow">${icon('gift')}</span><b>Top 3 Hadiah</b></a></div>
    <div id="ecoMemberEventMobile"></div><div class="m-dashboard-counts"><div><b>${d.stats.total}</b><span>Total laporan</span></div><div><b>${d.stats.approved}</b><span>Disetujui</span></div><div><b>${d.stats.pending}</b><span>Menunggu</span></div></div>
    <section class="m-member-recent"><div class="m-section-head"><h2>Aktivitas terbaru</h2><a href="/reports">Lihat semua</a></div><div class="m-report-list">${d.recent_reports.length?d.recent_reports.slice(0,4).map(r=>`<a href="/reports?id=${r.id}"><img src="/api/student/report-photo?id=${encodeURIComponent(r.id)}" loading="lazy" alt="Bukti laporan"><div><b>${esc(r.category)}</b><small>${fmt(r.submitted_at)}</small></div>${statusPill(r.status)}</a>`).join(''):'<div class="m-no-reports">Belum ada laporan. Yuk, mulai aksi hijau pertamamu! <a href="/report">Buat laporan</a></div>'}</div></section>
   </section>`;
  const body=mobileDashboard+`<section class="simple-dashboard">
    <div class="simple-dash-head">
      <div><h1>Halo, ${esc(d.profile.full_name)}.</h1><p>Catat aksi pemilahanmu, cek status, lalu kumpulkan poin.</p></div>
      <a class="btn primary" href="/report">${icon('plus','sm')} Buat laporan</a>
    </div>

    <div id="ecoMemberEventDesktop"></div><div class="simple-summary">
      <div class="summary-main immersive-summary" data-tilt data-tilt-strength="3"><span>Eco-Points</span><strong>${d.points}</strong><p>${next?(remaining>0?remaining+' poin lagi menuju '+esc(next.name):'Poinmu cukup untuk '+esc(next.name)):'Kumpulkan poin dari laporan yang disetujui.'}</p><a href="/rewards">Lihat kompetisi →</a></div>
      <div class="summary-stat"><strong>${d.stats.total}</strong><span>Total laporan</span></div>
      <div class="summary-stat"><strong>${d.stats.approved}</strong><span>Disetujui</span></div>
      <div class="summary-stat"><strong>${d.stats.pending}</strong><span>Menunggu</span></div>
    </div>

    <section class="simple-panel">
      <div class="simple-panel-head"><h2>Laporan terbaru</h2><a href="/reports">Lihat semua</a></div>
      <div class="recent-list">${d.recent_reports.length?d.recent_reports.slice(0,5).map(r=>`<a class="report-row" href="/reports?id=${r.id}"><img class="report-thumb" src="/api/student/report-photo?id=${encodeURIComponent(r.id)}" alt=""><div><b>${esc(r.category)}</b><div class="meta">${fmt(r.submitted_at)} · ${r.status==='approved'?'+'+r.points+' poin':'Dalam verifikasi'}</div></div>${statusPill(r.status)}</a>`).join(''):'<div class="empty">Belum ada laporan. Mulai dari satu aksi pemilahan.</div>'}</div>
    </section>
  </section>`;
  appShell('dashboard',body,d.profile,{unread:d.unread_notifications});
  try{
   const [evt,own]=await Promise.all([api('/api/public/event'),api('/api/student/event')]);
   for(const id of ['ecoMemberEventMobile','ecoMemberEventDesktop']){const el=document.getElementById(id);if(el)el.innerHTML=window.EcoContest.teaser(evt,own);}
  }catch(e){}
  initImmersive();
 }catch(e){accessError(e)}
}

async function loadReportForm(){
 const user=await authSession();if(!user)return;
 try{
  const [profile,cat]=await Promise.all([api('/api/student/profile'),api('/api/public/catalog')]);
  const body=`<div class="page-head"><div><div class="eyebrow">Report Waste</div><h1>Document your sustainable action.</h1><p>Lengkapi bukti aktivitas secara jelas agar proses verifikasi lebih mudah.</p></div></div><div class="form-layout"><form id="reportForm" class="form-card"><div class="field"><label>Waste Category</label><select name="category_id" required><option value="">Select a category</option>${cat.categories.map(c=>`<option value="${c.id}">${esc(c.name)} · ${c.points} pts</option>`).join('')}</select></div><div class="field"><label>Waste Description</label><textarea name="description" required minlength="3" maxlength="1200" placeholder="Jelaskan aktivitas pemilahan yang Anda lakukan."></textarea></div><div class="field"><label>Photo Evidence</label><label class="upload-zone" id="uploadZone" for="photo"><span class="upload-icon">${icon('upload')}</span><b>Choose a photo or take one now</b><p>JPG, PNG, atau WEBP. Bukti disimpan privat.</p><input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required hidden></label><div class="photo-wrap" id="photoWrap"><img id="photoPreview" class="photo-preview" alt="Preview foto"><div class="photo-actions"><button type="button" class="icon-btn" id="replacePhoto" title="Replace">${icon('upload','sm')}</button><button type="button" class="icon-btn" id="removePhoto" title="Remove">${icon('trash','sm')}</button></div></div></div><div class="field"><label>GPS Location</label><div class="gps-card"><div class="gps-status"><span class="gps-pin">${icon('pin')}</span><div><b id="gpsTitle">Location permission required</b><div class="meta" id="gpsMeta">Aktifkan izin lokasi untuk mengirim laporan.</div></div></div><div class="gps-map"></div><button type="button" class="btn soft" id="gpsBtn">${icon('pin','sm')} Get Current Location</button></div></div><div class="field"><label>Additional Notes <span class="meta">(optional)</span></label><textarea name="notes" maxlength="1200" placeholder="Tambahkan informasi lain jika diperlukan."></textarea></div><input type="hidden" name="latitude"><input type="hidden" name="longitude"><input type="hidden" name="gps_accuracy"><input type="hidden" name="location_captured_at"><button class="btn primary large" id="submitReport" type="submit" disabled style="width:100%">Submit Waste Report ${icon('arrow','sm')}</button></form><aside class="guide-card"><div class="eyebrow" style="color:#9bd5b3">Reporting Guide</div><h2>Make your evidence easy to verify.</h2><p>Automated checks membantu menyaring kelengkapan data, tetapi keputusan final tetap dilakukan administrator.</p><div class="guide-list"><div class="guide-item"><span class="guide-num">01</span><div><b>Show the activity clearly</b><span>Pastikan foto relevan dengan pemilahan sampah yang dilaporkan.</span></div></div><div class="guide-item"><span class="guide-num">02</span><div><b>Use current GPS</b><span>Ambil koordinat ketika Anda berada di lokasi aktivitas.</span></div></div><div class="guide-item"><span class="guide-num">03</span><div><b>Describe what happened</b><span>Deskripsi singkat membantu admin memahami konteks bukti.</span></div></div></div></aside></div>`;
  appShell('report',body,profile.profile);
  const form=document.querySelector('#reportForm'),photo=document.querySelector('#photo'),wrap=document.querySelector('#photoWrap'),prev=document.querySelector('#photoPreview'),zone=document.querySelector('#uploadZone'),submit=document.querySelector('#submitReport');
  let hasGps=false;
  const validate=()=>{submit.disabled=!(photo.files?.length&&hasGps&&form.category_id.value&&form.description.value.trim().length>=3)};
  photo.onchange=()=>{const f=photo.files[0];if(f){prev.src=URL.createObjectURL(f);wrap.style.display='block';zone.style.display='none'}validate()};
  document.querySelector('#replacePhoto').onclick=()=>photo.click();
  document.querySelector('#removePhoto').onclick=()=>{photo.value='';prev.removeAttribute('src');wrap.style.display='none';zone.style.display='block';validate()};
  form.category_id.onchange=validate;form.description.oninput=validate;
  document.querySelector('#gpsBtn').onclick=()=>{const title=document.querySelector('#gpsTitle'),meta=document.querySelector('#gpsMeta');title.textContent='Getting current location…';meta.textContent='Browser sedang meminta koordinat GPS.';navigator.geolocation.getCurrentPosition(pos=>{form.latitude.value=pos.coords.latitude;form.longitude.value=pos.coords.longitude;form.gps_accuracy.value=pos.coords.accuracy||'';form.location_captured_at.value=new Date().toISOString();hasGps=true;title.textContent='Location captured';meta.textContent=`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} · accuracy ±${Math.round(pos.coords.accuracy||0)} m`;validate()},err=>{hasGps=false;title.textContent='Location access failed';meta.textContent=err.code===1?'Izin lokasi ditolak. Aktifkan location permission pada browser lalu coba lagi.':err.message;validate()},{enableHighAccuracy:true,timeout:15000,maximumAge:0})};
  form.onsubmit=async e=>{e.preventDefault();validate();if(submit.disabled)return;const fd=new FormData(form);submit.disabled=true;submit.innerHTML='Submitting report…';try{await api('/api/student/reports',{method:'POST',body:fd});toast('Report submitted successfully.');setTimeout(()=>location.href='/reports',700)}catch(err){toast(err.message);submit.disabled=false;submit.innerHTML='Submit Waste Report '+icon('arrow','sm')}};
 }catch(e){accessError(e)}
}

async function loadReports(){
 const user=await authSession();if(!user)return;
 try{
  const p=await api('/api/student/profile');const id=new URLSearchParams(location.search).get('id');
  if(id){const d=await api('/api/student/report-detail?id='+encodeURIComponent(id));const r=d.report;const reviewed=r.reviewed_at;const timeline=`<div class="timeline"><div class="timeline-item"><span class="timeline-dot"></span><b>Laporan dikirim</b><span>${fmt(r.submitted_at)}</span></div><div class="timeline-item"><span class="timeline-dot"></span><b>Pemeriksaan otomatis selesai</b><span>${d.automated_checks.length} checks recorded</span></div><div class="timeline-item"><span class="timeline-dot"></span><b>${r.status==='approved'?'Laporan disetujui':r.status==='rejected'?'Laporan ditolak':'Menunggu keputusan admin'}</b><span>${reviewed?fmt(reviewed):'Menunggu verifikasi akhir'}</span></div></div>`;appShell('reports',`<div class="page-head"><div><div class="eyebrow">DETAIL LAPORAN</div><h1>${esc(r.category)}</h1><p>Dikirim ${fmt(r.submitted_at)}</p></div>${statusPill(r.status)}</div><div class="detail-grid"><div class="detail-photo"><img src="${esc(r.photo_url)}" alt="Bukti laporan"></div><div class="panel"><h2 style="margin-top:0">Report Information</h2><p><b>Deskripsi</b><br><span class="section-lead" style="font-size:13px">${esc(r.description||'—')}</span></p>${r.notes?`<p><b>Catatan tambahan</b><br><span class="section-lead" style="font-size:13px">${esc(r.notes)}</span></p>`:''}<p><b>Lokasi</b><br><span class="meta">${r.latitude}, ${r.longitude} · accuracy ${esc(r.gps_accuracy||'—')} m</span></p><a class="btn ghost" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=18/${r.latitude}/${r.longitude}">${icon('map','sm')} Lihat lokasi</a>${r.rejection_reason?`<div class="error" style="margin-top:16px"><b>Alasan penolakan admin</b><br>${esc(r.rejection_reason)}</div>`:''}<h3>Riwayat verifikasi</h3>${timeline}</div></div><section class="panel" style="margin-top:18px"><div class="panel-head"><h2>Pemeriksaan otomatis</h2></div><div class="recent-list">${d.automated_checks.map(c=>`<div class="report-row"><span class="stat-icon">${icon(c.passed?'check':'clock','sm')}</span><div><b>${esc(c.check_type.replaceAll('_',' '))}</b><div class="meta">${esc(c.details||'')}</div></div><span class="pill ${c.passed?'approved':'pending_admin'}">${c.passed?'Passed':'Review'}</span></div>`).join('')}</div></section>`,p.profile);return}
  const d=await api('/api/student/reports');const body=`<div class="page-head"><div><div class="eyebrow">LAPORAN SAYA</div><h1>Pantau status laporanmu.</h1><p>Filter laporan berdasarkan status dan buka detail untuk melihat proses verifikasi.</p></div><a href="/report" class="btn primary">${icon('plus','sm')} Buat laporan</a></div><div class="filter-tabs" id="reportFilters"><button class="active" data-filter="all">Semua</button><button data-filter="pending">Menunggu</button><button data-filter="approved">Disetujui</button><button data-filter="rejected">Ditolak</button></div><div id="reportList" class="report-cards"></div>`;appShell('reports',body,p.profile);
  const draw=f=>{const rows=d.reports.filter(r=>f==='all'||f==='pending'&&['submitted','automated_review','pending_admin'].includes(r.status)||r.status===f);document.querySelector('#reportList').innerHTML=rows.length?rows.map(r=>`<a class="report-card" href="/reports?id=${r.id}"><img src="/api/student/report-photo?id=${encodeURIComponent(r.id)}" alt=""><div><h3>${esc(r.category)}</h3><div class="meta">${fmt(r.submitted_at)} · ${r.latitude.toFixed?Number(r.latitude).toFixed(4):r.latitude}, ${r.longitude.toFixed?Number(r.longitude).toFixed(4):r.longitude}</div></div><div class="report-actions">${statusPill(r.status)}${r.status==='rejected'&&r.rejection_reason?`<div class="report-reject-message" title="${esc(r.rejection_reason)}">Alasan: ${esc(r.rejection_reason)}</div>`:''}<div class="report-points">${r.status==='approved'?'+'+r.points+' poin':r.status==='rejected'?'Tidak mendapat poin':'Menunggu verifikasi'}</div></div></a>`).join(''):'<div class="empty">Tidak ada laporan pada filter ini.</div>'};draw('all');document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');draw(b.dataset.filter)});
 }catch(e){accessError(e)}
}

const SPIN_PRIZES=[
 "Gantungan Kunci Eco-Point",
 "Sedotan Stainless Steel",
 "Pembatas Buku Kertas Daur Ulang",
 "Pin atau Badge Eco-Point",
 "Sachet Benih Tanaman",
 "Pensil Ramah Lingkungan",
 "Magnet dari Material Daur Ulang",
 "Paket Stiker Edukasi Lingkungan"
];
const SPIN_COLORS=['#f7d852','#ff8e62','#70cfe3','#a9e66f','#ee80bd','#ffc26a','#9b93e6','#74cead'];
function spinPhoto(name){
 const i=SPIN_PRIZES.indexOf(name);
 return i<0?'<span class="spin-prize-photo spin-photo-fallback">'+icon('gift')+'</span>':
 '<span role="img" aria-label="'+esc(name)+'" class="spin-prize-photo" style="background-position:'+(i/7*100).toFixed(5)+'% center"></span>';
}
async function loadRewards(){
 const user=await authSession();if(!user)return;
 try{
  const [profile,event,own]=await Promise.all([
   api('/api/student/profile'),api('/api/public/event'),api('/api/student/event')
  ]);
  const body=window.EcoContest.page(event,own);
  appShell('rewards',body,profile.profile);
  window.EcoContest.startTimer();
 }catch(e){accessError(e)}
}
async function loadRedemptions(){
 const user=await authSession();if(!user)return;
 try{
  const [p,d]=await Promise.all([api('/api/student/profile'),api('/api/student/redeem')]);
  const statusCopy={
   pending:['Permintaan diterima','Reward sedang diproses. Status akan diperbarui saat siap diambil.'],
   ready:['Siap diambil','Reward sudah siap. Periksa petunjuk pengambilan di bawah.'],
   collected:['Sudah diambil','Penukaran selesai. Terima kasih sudah berkontribusi.'],
   cancelled:['Penukaran dibatalkan','Poin yang digunakan telah dikembalikan secara otomatis.']
  };
  const items=d.redemptions||[];
  const body=`<section class="redemptions-page">
   <div class="taste-redeem-hero">
    <div class="taste-redeem-copy">
     <span class="taste-redeem-label">Reward saya</span>
     <h1>Penukaran<br><span>Eco-Points.</span></h1>
     <p>Semua reward yang kamu tukarkan, dari pengajuan sampai selesai diambil.</p>
     <a href="/redemptions" class="taste-btn taste-btn-lime">Lihat Event Top 3 ${icon('arrow','sm')}</a>
    </div>
    <div class="taste-redeem-art" aria-hidden="true">
      <div class="taste-redeem-orbit"></div>
      <div class="taste-redeem-gift">${icon('gift','lg')}</div>
    </div>
   </div>
   <div class="taste-redeem-stats" aria-label="Ringkasan penukaran">
    <div><span>Total penukaran</span><strong>${items.length}</strong></div>
    <div><span>Dalam proses</span><strong>${items.filter(x=>x.status==='pending').length}</strong></div>
    <div><span>Siap diambil</span><strong>${items.filter(x=>x.status==='ready').length}</strong></div>
    <div><span>Selesai</span><strong>${items.filter(x=>x.status==='collected').length}</strong></div>
   </div>
   <div class="taste-redeem-list-head" id="ecoRedemptionHistory"><div><h2>Riwayat penukaran</h2><p>Gunakan filter untuk melihat status reward.</p></div></div>
   <div class="redemption-filters" role="group" aria-label="Filter status penukaran"><button type="button" class="redemption-filter active" data-filter="all" aria-pressed="true">Semua <span>${items.length}</span></button><button type="button" class="redemption-filter" data-filter="pending" aria-pressed="false">Diproses <span>${items.filter(x=>x.status==='pending').length}</span></button><button type="button" class="redemption-filter" data-filter="ready" aria-pressed="false">Siap diambil <span>${items.filter(x=>x.status==='ready').length}</span></button><button type="button" class="redemption-filter" data-filter="collected" aria-pressed="false">Selesai <span>${items.filter(x=>x.status==='collected').length}</span></button></div><div class="redemption-list">${items.length?items.map(x=>{
    const code='EP-'+String(x.id).slice(0,8).toUpperCase();
    const step=x.status==='pending'?1:x.status==='ready'?2:x.status==='collected'?3:0;
    const copy=statusCopy[x.status]||statusCopy.pending;
    return `<article class="redemption-card" data-status="${esc(x.status)}" aria-labelledby="redemption-${esc(x.id)}">
     <div class="redemption-top">
      <span class="taste-redemption-icon" aria-hidden="true">${icon('gift','lg')}</span>
      <div class="redemption-heading">
       <h2 id="redemption-${esc(x.id)}">${esc(x.reward_name)}</h2>
       <div class="redemption-meta">
        <span class="redemption-code">${code}</span>
        <span>${dateOnly(x.created_at)}</span>
        <span class="redemption-points">${x.category==='spin_wheel'?'1 voucher Spin Wheel':x.points_cost+' poin'}</span>
       </div>
      </div>
      ${statusPill(x.status)}
     </div>
     ${x.status==='cancelled'
      ?`<div class="redemption-alert"><strong>${copy[0]}</strong><span>${copy[1]}</span></div>`
      :`<div class="redemption-progress" aria-label="Status penukaran: ${esc(copy[0])}">
        <div class="redemption-progress-copy"><strong>${copy[0]}</strong><span>${copy[1]}</span></div>
        <div class="status-track" aria-hidden="true"><span class="status-segment ${step>=1?'done':''}"></span><span class="status-segment ${step>=2?'done':''}"></span><span class="status-segment ${step>=3?'done':''}"></span></div>
        <div class="status-labels" aria-hidden="true"><span class="${step>=1?'done':''}">Diajukan</span><span class="${step>=2?'done':''}">Siap diambil</span><span class="${step>=3?'done':''}">Diambil</span></div>
       </div>`}
     ${x.pickup_instructions?`<div class="pickup-note"><span>Petunjuk pengambilan</span><p>${esc(x.pickup_instructions)}</p></div>`:''}
    </article>`;
   }).join(''):`<div class="redemption-empty">${icon('gift','lg')}<h2>Belum ada penukaran</h2><p>Setelah menukar poin, detail reward dan status pengambilannya akan muncul di sini.</p><a href="/redemptions" class="btn primary">Jelajahi reward</a></div>`}</div>
   <div id="redemption-filter-empty" class="redemption-filter-empty" hidden>Tidak ada penukaran dengan status ini.</div>
  </section>`;
  appShell('redemptions',body,p.profile);
  document.querySelectorAll('.redemption-filter').forEach(button=>button.addEventListener('click',()=>{
   const filter=button.dataset.filter;
   document.querySelectorAll('.redemption-filter').forEach(b=>{const on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
   let visible=0;document.querySelectorAll('.redemption-card').forEach(card=>{const show=filter==='all'||card.dataset.status===filter;card.hidden=!show;if(show)visible++});
   const empty=document.querySelector('#redemption-filter-empty');if(empty)empty.hidden=visible!==0 || items.length===0;
  }));
 }catch(e){accessError(e)}
}
async function loadCommunity(){return loadRewards();}
async function loadProfile(){
 const user=await authSession();if(!user)return;
 try{const [p,d]=await Promise.all([api('/api/student/profile'),api('/api/student/dashboard')]);const body=`<div class="page-head"><div><div class="eyebrow">Profile</div><h1>Your Eco-Point identity.</h1><p>Informasi akun institusi dan ringkasan aktivitas.</p></div></div><section class="profile-hero"><span class="profile-avatar">${esc(initials(p.profile.full_name))}</span><div><h2>${esc(p.profile.full_name)}</h2><p>${esc(p.profile.email)} · Member since ${dateOnly(p.profile.created_at)}</p></div><a href="/report" class="btn primary">Report Waste</a></section><div class="stat-row"><div class="stat-card"><span class="stat-icon">${icon('gift')}</span><div><b>${d.points}</b><span>Total Eco-Points</span></div></div><div class="stat-card"><span class="stat-icon">${icon('file')}</span><div><b>${d.stats.total}</b><span>Total Reports</span></div></div><div class="stat-card"><span class="stat-icon">${icon('check')}</span><div><b>${d.stats.approved}</b><span>Approved</span></div></div></div><div class="profile-grid"><form id="profileForm" class="form-card"><div class="panel-head"><h2>Account details</h2></div><div class="field"><label>Full Name</label><input name="full_name" value="${esc(p.profile.full_name)}" required></div><div class="field"><label>Institutional Email</label><input value="${esc(p.profile.email)}" disabled></div><div class="field"><label>Student ID</label><input name="student_id" value="${esc(p.profile.student_id||'')}" placeholder="Optional"></div><button class="btn primary">Save Changes</button></form><section class="panel"><div class="panel-head"><h2>Recent activity</h2></div><div class="recent-list">${d.recent_reports.length?d.recent_reports.map(r=>`<a class="report-row" href="/reports?id=${r.id}"><img class="report-thumb" src="/api/student/report-photo?id=${r.id}" alt=""><div><b>${esc(r.category)}</b><div class="meta">${fmt(r.submitted_at)}</div></div>${statusPill(r.status)}</a>`).join(''):'<div class="empty">Belum ada aktivitas.</div>'}</div></section></div>`;appShell('profile',body,p.profile,{unread:d.unread_notifications});document.querySelector('#profileForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await api('/api/student/profile',{method:'PUT',body:JSON.stringify(Object.fromEntries(fd.entries()))});toast('Profile updated.')}catch(err){toast(err.message)}}}catch(e){accessError(e)}
}

const path=location.pathname;
if(path==='/')landing();
else if(['/about','/how-it-works','/waste-guide','/locations'].includes(path))infoPage(path);
else if(path==='/dashboard')loadDashboard();
else if(path==='/report')loadReportForm();
else if(path==='/reports')loadReports();
else if(path==='/rewards')loadRewards();
else if(path==='/redemptions')loadRewards();
else if(path==='/riwayat')loadRedemptions();
else if(path==='/leaderboard'||path==='/notifications')loadCommunity();
else if(path==='/profile')loadProfile();
else landing();