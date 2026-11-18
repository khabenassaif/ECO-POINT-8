/* Eco-Point Spin Wheel: the server chooses the prize, this UI visualizes its result. */
(function(){
 const names=[
  "Gantungan Kunci Eco-Point","Sedotan Stainless Steel",
  "Pembatas Buku Kertas Daur Ulang","Pin atau Badge Eco-Point",
  "Sachet Benih Tanaman","Pensil Ramah Lingkungan",
  "Magnet dari Material Daur Ulang","Paket Stiker Edukasi Lingkungan"
 ];
 const icons=["🔑","🥤","📖","📌","🌱","✏️","🧲","🌍"];
 const colors=["#ff9e47","#27bbcf","#b8e760","#bc86f2","#ffcc42","#fb7e96","#8dc8ff","#8ddd83"];
 let degrees=0;
 const safe=(value)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const image=(i,label)=>'<div class="eco-prize-photo" role="img" aria-label="'+safe(label)+'" style="background-position:'+((i/7)*100).toFixed(4)+'% center"></div>';
 const currency=n=>Number(n||0).toLocaleString("id-ID");
 const wheelGradient="conic-gradient(from -22.5deg,"+colors.map((c,i)=>c+" "+(i*45)+"deg "+((i+1)*45)+"deg").join(",")+")";
 function view(v,w){
  const balance=Number(v.points)||0, available=w.available_vouchers||0;
  const progress=Math.min(100,Math.max(0,balance/150*100));
  const toGo=Math.max(0,150-balance);
  const canSpin=available>0 && w.rewards?.some(r=>Number(r.stock)>0);
  const vouchers=w.vouchers||[];
  const gallery=names.map((n,i)=>{
    const item=(w.rewards||[]).find(r=>r.name===n);
    const available=!!item&&Number(item.stock)>0;
    return '<article class="eco-prize-card" style="--prize-color:'+colors[i]+'">'+
      '<div class="eco-prize-photo-wrap">'+image(i,n)+'</div>'+
      '<div class="eco-prize-description"><span class="eco-prize-num">'+String(i+1).padStart(2,"0")+'</span><h3>'+safe(n)+'</h3><span class="eco-prize-stock '+(!available?'is-empty':'')+'">'+(available?'Tersedia':'Stok habis')+'</span></div></article>';
  }).join("");
  return '<section class="eco-spin-experience" aria-label="Spin Wheel dan voucher">'+
   '<div class="eco-spin-intro"><span class="eco-spin-tag">🌿 Eco-Point Reward Station</span><h2>Olahraga jari? <em>Putar hadiah!</em></h2><p>Kumpulkan poin dari laporan sampah yang disetujui, tukar dengan voucher, lalu putar roda keberuntunganmu.</p></div>'+
   '<div class="eco-spin-how"><div><b>01</b><strong>5–10 POIN</strong><span>Per laporan sampah tervalidasi</span></div><div class="eco-arrow" aria-hidden="true">→</div><div><b>02</b><strong>150 POIN</strong><span>Tukar untuk satu voucher</span></div><div class="eco-arrow" aria-hidden="true">→</div><div><b>03</b><strong>1 SPIN!</strong><span>Satu voucher = satu putaran</span></div></div>'+
   '<div class="eco-spin-main"><section class="eco-ticket-column" aria-label="Saldo dan voucher">'+
      '<div class="eco-point-wallet"><span class="eco-wallet-kicker">🪙 DOMPET ECO-POINT</span><div class="eco-wallet-value">'+currency(balance)+' <small>poin</small></div><div class="eco-wallet-target"><span>Menuju voucher berikutnya</span><strong>'+Math.min(150,balance)+'/150</strong></div><div class="eco-wallet-track" role="progressbar" aria-label="Progres menuju voucher" aria-valuemin="0" aria-valuemax="150" aria-valuenow="'+Math.min(150,balance)+'"><span style="width:'+progress.toFixed(2)+'%"></span></div><p>'+(toGo>0?'Tinggal <strong>'+toGo+' poin</strong> lagi!':'Yeay, poinmu sudah cukup untuk voucher!')+'</p><button type="button" class="eco-exchange-button" id="ecoBuyVoucher" '+(balance<150?'disabled':'')+'>🎟️ Tukar 150 poin</button></div>'+
      '<div class="eco-ticket"><div class="eco-ticket-stamp">ONE FREE SPIN</div><span>🎟️ VOUCHER SPIN WHEEL</span><strong id="ecoVoucherCount">'+available+'</strong><p>voucher siap digunakan</p><small>1 voucher = 1 kesempatan bermain</small></div>'+
    '</section>'+
    '<section class="eco-wheel-column" aria-label="Roda keberuntungan">'+
      '<div class="eco-wheel-heading"><span>🎡 SPIN & WIN</span><h3>Putar rodanya, dapatkan hadiah!</h3></div>'+
      '<div class="eco-wheel-stage"><div class="eco-wheel-pointer" aria-hidden="true"></div><div class="eco-wheel" id="ecoWheel" style="background:'+wheelGradient+'">'+
      names.map((n,i)=>'<span class="eco-wheel-emoji" title="'+safe(n)+'" style="transform:translate(-50%,-50%) rotate('+(i*45)+'deg) translateY(calc(var(--wheel-size) * -0.36)) rotate('+(-i*45)+'deg)">'+icons[i]+'</span>').join("")+
      '<div class="eco-wheel-center">ECO<br>POINT</div></div></div>'+
      '<button type="button" class="eco-spin-button" id="ecoSpinButton" '+(!canSpin?'disabled':'')+'>🎉 '+(available?'SPIN SEKARANG!':'Butuh voucher dulu')+'</button>'+
      '<p class="eco-wheel-note" id="ecoSpinHint">Hadiah dipilih secara acak dari stok yang tersedia. Setiap spin memakai satu voucher.</p>'+
      '<div class="eco-spin-winner" id="ecoWinner" hidden role="status" aria-live="polite"></div>'+
    '</section></div>'+
   '<div class="eco-prize-head"><div><span>🎁 KOLEKSI HADIAH</span><h2>Ada 8 hadiah seru!</h2><p>Semua hadiah tersedia melalui Spin Wheel, bukan penukaran langsung.</p></div><span class="eco-prize-8">8 HADIAH</span></div>'+
   '<div class="eco-prize-grid">'+gallery+'</div>'+
   '<div class="eco-spin-footer"><div><strong>✨ Sudah pernah menang?</strong><p>Cek status hadiah dan petunjuk pengambilannya pada riwayat di bawah.</p></div><a href="/riwayat" class="eco-to-history">Lihat riwayat ↓</a></div>'+
   '</section>';
 }
 function mount(){
  const buy=document.querySelector("#ecoBuyVoucher"), spin=document.querySelector("#ecoSpinButton");
  if(!buy||!spin)return;
  buy.addEventListener("click",async()=>{
   if(buy.disabled)return;
   if(!confirm("Tukar 150 Eco-Points dengan 1 voucher Spin Wheel?"))return;
   buy.disabled=true;buy.textContent="Memproses voucher…";
   try{
    const x=await api("/api/student/vouchers",{method:"POST",body:JSON.stringify({idempotency_key:crypto.randomUUID()})});
    if(x.voucher){
     toast("🎟️ Voucher berhasil didapat! Saatnya spin.");
     await loadRewards();
     document.querySelector("#ecoSpinButton")?.scrollIntoView({behavior:"smooth",block:"center"});
    }
   }catch(e){toast(e.message);buy.disabled=false;buy.textContent="🎟️ Tukar 150 poin";}
  });
  spin.addEventListener("click",async()=>{
   if(spin.disabled)return;
   spin.disabled=true;spin.textContent="Menyiapkan hadiah…";
   const wheel=document.querySelector("#ecoWheel");
   const winner=document.querySelector("#ecoWinner");
   try{
    const v=await api("/api/student/spin-wheel");
    const voucher=(v.vouchers||[]).find(x=>x.status==="available");
    if(!voucher)throw Error("Voucher aktif tidak ditemukan.");
    const response=await api("/api/student/spin-wheel",{method:"POST",body:JSON.stringify({voucher_id:voucher.id})});
    const prize=response.result;
    const index=names.indexOf(prize.reward_name);
    if(index<0)throw Error("Hasil hadiah tidak dikenali. Cek riwayat penukaran.");
    const remaining=((360-(index*45)-(degrees%360))%360+360)%360;
    degrees+=6*360+remaining;
    wheel.style.transition="transform 5.2s cubic-bezier(.12,.69,.11,1)";
    wheel.style.transform="rotate("+degrees+"deg)";
    spin.textContent="🎡 Roda sedang berputar…";
    document.querySelector("#ecoSpinHint").textContent="Roda berputar… Semoga beruntung! 🍀";
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    await new Promise(resolve=>setTimeout(resolve,reduced?80:5350));
    winner.hidden=false;
    winner.innerHTML='<div class="eco-winner-confetti" aria-hidden="true">🎉 ✨ 🎊</div><span>SELAMAT! KAMU DAPAT</span><strong>'+safe(prize.reward_name)+'</strong><p>Hadiahmu sudah masuk ke riwayat penukaran. Pantau statusnya sebelum mengambil hadiah.</p><a class="eco-winner-link" href="/riwayat">Lihat hadiahku →</a>';
    document.querySelector("#ecoSpinHint").textContent="Keren! Kamu berhasil mendapatkan hadiah. 🌿";
    spin.textContent="🎟️ Gunakan voucher berikutnya";
    const updated=await api("/api/student/spin-wheel");
    const count=document.querySelector("#ecoVoucherCount");
    if(count)count.textContent=updated.available_vouchers;
    if(!updated.available_vouchers)spin.disabled=true;else spin.disabled=false;
    const history=document.querySelector("#ecoRedemptionHistory");
    if(history)history.insertAdjacentHTML("afterbegin",'<p class="eco-history-new">🎁 '+safe(prize.reward_name)+' berhasil masuk ke riwayat. <a href="/redemptions">Muat ulang status</a></p>');
    winner.scrollIntoView({behavior:reduced?"auto":"smooth",block:"nearest"});
   }catch(e){toast(e.message);spin.textContent="🎉 SPIN SEKARANG!";spin.disabled=false;}
  });
 }
 window.EcoWheel={view,mount};
})();