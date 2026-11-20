/* Eco-Point Top 3 Challenge — shared public/member/admin presentation */
(function(){
 const fmt=n=>Number(n||0).toLocaleString('id-ID');
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const tz=d=>new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta',hour12:false}).format(new Date(d))+' WIB';
 const phaseText={upcoming:'SEGERA DIMULAI',active:'KOMPETISI BERLANGSUNG',closed:'PENILAIAN DITUTUP',announced:'PEMENANG DIUMUMKAN'};
 const products=[{place:1,name:'Mouse JETE MO106',image:'/images/eco-prizes.webp',label:'JUARA 1'},
 {place:2,name:'Earphone JETE Eazy 3',image:'/images/eco-prizes.webp',label:'JUARA 2'},
 {place:3,name:'Mousepad JETE',image:'/images/eco-prizes.webp',label:'JUARA 3'}];
 function img(place,name){
  return '<div role="img" aria-label="'+safe(name)+'" class="eco-jete-image eco-jete-'+place+'" style="background-position:'+((place-1)*50)+'% center"></div>';
 }
 function prizes(data,where='normal'){
  const items=data?.prizes||products;
  return '<div class="eco-contest-prizes '+(where==='rail'?'is-rail':'')+'">'+items.map((p,i)=>
   '<article class="eco-contest-prize prize-'+(i+1)+'"><div class="eco-contest-medal">'+['🥇','🥈','🥉'][i]+' '+safe(p.label||'JUARA '+(i+1))+'</div>'+
   '<div class="eco-contest-product">'+img(p.place||i+1,p.name)+'</div>'+
   '<div class="eco-contest-product-caption"><strong>'+safe(p.name)+'</strong><span>Hadiah untuk peringkat '+(i+1)+'</span></div></article>'
  ).join('')+'</div>';
 }
 function remaining(date){
  const x=Math.max(0,new Date(date).getTime()-Date.now());
  const d=Math.floor(x/86400000),h=Math.floor(x%86400000/3600000),m=Math.floor(x%3600000/60000),s=Math.floor(x%60000/1000);
  return [d,h,m,s].map((v,i)=>'<div><strong>'+String(v).padStart(2,'0')+'</strong><span>'+['Hari','Jam','Menit','Detik'][i]+'</span></div>').join('');
 }
 function dateBox(e){
  const target=e.phase==='upcoming'?e.starts_at:e.phase==='active'?e.ends_at:e.announcement_at;
  return '<div class="eco-event-dategrid"><div><span>Mulai kompetisi</span><strong>'+safe(tz(e.starts_at))+'</strong></div><div><span>Batas akhir poin</span><strong>'+safe(tz(e.ends_at))+'</strong></div><div><span>Pengumuman pemenang</span><strong>'+safe(tz(e.announcement_at))+'</strong></div></div>'+
    '<div class="eco-event-timer" data-eco-countdown="'+safe(target)+'" data-phase="'+safe(e.phase)+'">'+
    (e.phase==='announced'?'<b>🎊 Pemenang telah diumumkan!</b>':remaining(target))+'</div>';
 }
 function ranking(e,own){
  const entries=e.leaderboard||[];
  const visible=e.phase!=='closed';
  return '<div class="eco-rank-head"><div><span>🏆 LEADERBOARD</span><h3>'+((e.phase==='announced')?'Hasil akhir Top 3':'Peringkat sementara')+'</h3></div><small>'+fmt(e.total_participants)+' peserta</small></div>'+
  (visible?'<div class="eco-rank-list">'+(entries.length?entries.slice(0,10).map((x,i)=>
   '<div class="eco-rank-line"><span class="eco-rank-number">'+(i<3?['🥇','🥈','🥉'][i]:'#'+(i+1))+'</span><strong>'+safe(x.name)+'</strong><span>'+fmt(x.points)+' poin</span></div>'
  ).join(''):'<div class="eco-empty-rank">Belum ada laporan yang disetujui selama periode ini. Jadilah peserta pertama!</div>')+'</div>':
  '<div class="eco-empty-rank">Periode telah berakhir. Hasil akhir akan ditampilkan pada tanggal pengumuman.</div>')+
  (own?'<div class="eco-your-ranking"><b>Posisimu: '+(own.rank?'#'+own.rank:'Belum masuk peringkat')+'</b><span>'+fmt(own.earned_points)+' poin kompetisi · '+fmt(own.approved_reports)+' laporan disetujui</span></div>':'');
 }
 function landing(e){
  const desktop=document.querySelector('#ecoContestDesktop');
  if(desktop)desktop.innerHTML='<section class="eco-event-banner"><div class="eco-event-banner-copy"><span class="eco-live-tag">🏆 '+safe(phaseText[e.phase]||'TOP 3 CHALLENGE')+'</span><h2>TOP 3 POINT<br><em>CHALLENGE!</em> 🎉</h2><p>Tiga peserta dengan poin laporan terbanyak berhak mendapatkan hadiah JETE. Semakin aktif pilah sampah, semakin besar peluangmu!</p><a href="/login" class="eco-banner-cta">Mulai kumpulkan poin →</a></div><div class="eco-event-banner-media">'+img(1,products[0].name)+'</div></section>'+dateBox(e)+prizes(e);
  const mobile=document.querySelector('#ecoContestMobile');
  if(mobile)mobile.innerHTML='<div class="eco-mobile-contest-badge">🔥 '+safe(phaseText[e.phase]||'Top 3')+'</div>'+dateBox(e);
  const rail=document.querySelector('#mobileLandingRewards');
  if(rail)rail.innerHTML=prizes(e,'rail');
  const gallery=document.querySelector('#landingRewards');
  if(gallery)gallery.innerHTML=prizes(e);
  tick();
 }
 function page(e,own){
  return '<section class="eco-contest-page"><header class="eco-contest-page-hero"><span class="eco-live-tag">🏆 '+safe(phaseText[e.phase]||'TOP 3')+'</span><h1>3 Pemenang.<br><em>3 Hadiah JETE!</em></h1><p>Laporan sampah diverifikasi admin → poin tercatat → ranking ditentukan otomatis. Tidak ada Spin Wheel atau penukaran voucher baru.</p></header>'+
   '<h2 class="eco-contest-section-title">Hadiah untuk tiga teratas</h2>'+prizes(e)+
   '<div class="eco-contest-countdown-panel"><div><span>⏳ JADWAL KOMPETISI</span><h2>'+(
    e.phase==='upcoming'?'Kompetisi segera dibuka':e.phase==='active'?'Kejar poin sebelum waktu habis!':
    e.phase==='closed'?'Menunggu pengumuman pemenang':'Hasil akhir diumumkan')+'</h2></div>'+dateBox(e)+'</div>'+
   '<section class="eco-contest-ranking">'+ranking(e,own)+'</section>'+
   '<section class="eco-contest-rule"><strong>📌 Cara menentukan pemenang</strong><p>Peringkat dihitung dari poin laporan yang <b>disetujui admin selama periode kompetisi</b>. Poin yang dibelanjakan sebelum kompetisi tidak mengurangi skor. Jika seri: jumlah laporan disetujui, lalu waktu pencapaian poin. Hasil akhir dibuka pada tanggal pengumuman.</p><a href="/report">Laporkan sampah sekarang →</a></section></section>';
 }
 function teaser(e,own){
  return '<div class="eco-member-teaser"><span>🏆 TOP 3 CHALLENGE</span><div><strong>'+(own?.rank?'Posisimu #'+own.rank:'Kumpulkan poin dan naik peringkat!')+'</strong><small>'+fmt(own?.earned_points||0)+' poin kompetisi · Pengumuman '+safe(tz(e.announcement_at))+'</small></div><a href="/redemptions">Lihat peringkat →</a></div>';
 }
 function tick(){
  for(const el of document.querySelectorAll('[data-eco-countdown]')){
   if(el.dataset.phase==='announced')continue;
   const ms=new Date(el.dataset.ecoCountdown).getTime()-Date.now();
   if(ms<=0){el.innerHTML='<b>Waktunya telah tiba! Muat ulang untuk melihat status terbaru.</b>';continue}
   el.innerHTML=remaining(el.dataset.ecoCountdown);
  }
 }
 let timerStarted=false;
 function startTimer(){
  tick();
  if(timerStarted)return;
  timerStarted=true;
  setInterval(()=>{if(!document.hidden)tick()},1000);
 }
 window.EcoContest={prizes,landing,page,teaser,startTimer,tz,phaseText};
})();