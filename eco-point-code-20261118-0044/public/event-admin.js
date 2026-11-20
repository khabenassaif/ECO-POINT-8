(function(){
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nice=s=>new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(new Date(s))+' WIB';
const local=s=>{
  const d=new Date(s);
  if(!Number.isFinite(d.getTime()))return '';
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
  const o=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return o.year+'-'+o.month+'-'+o.day+'T'+o.hour+':'+o.minute;
};
const parseJakarta=value=>new Date(value+':00+07:00').toISOString();
const prizeAssets={1:'/images/jete-mouse.webp',2:'/images/jete-earphone.webp',3:'/images/jete-mousepad.webp'};
function prizePhoto(i,name,compact=false){
 return '<img src="'+prizeAssets[i]+'" class="eco-jete-image eco-jete-'+i+(compact?' eco-admin-prize-thumb':'')+'" alt="'+esc(name)+'" loading="lazy" decoding="async" width="640" height="640">';
}
async function get(){
 const r=await fetch('/api/admin/event',{credentials:'same-origin',cache:'no-store'});
 const d=await r.json();
 if(!r.ok)throw Error(d.error||'Tidak bisa mengambil pengaturan event.');
 return d;
}
function list(rows){
return '<div class="eco-admin-ranking">'+(rows?.length?rows.slice(0,10).map(x=>'<div><b>#'+x.rank+'</b><strong>'+esc(x.full_name)+'</strong><span>'+Number(x.points).toLocaleString('id-ID')+' poin · '+x.reports+' laporan</span></div>').join(''):'<p>Belum ada peserta dengan poin yang disetujui selama periode ini.</p>')+'</div>';
}
async function settings(){
 const host=document.getElementById('ecoAdminEventSettings');if(!host)return;
 try{
  const d=await get(),c=d.config;
  host.innerHTML='<section class="eco-admin-event-card"><div class="eco-admin-event-head"><span>🏆 EVENT TOP 3</span><h2>Pengaturan periode & pengumuman</h2><p>Ganti tanggal mulai, tenggat, dan pengumuman. Waktu menggunakan WIB (Jakarta).</p></div>'+
   '<form id="ecoAdminEventForm"><label>Nama kompetisi<input name="title" maxlength="120" value="'+esc(c.title)+'" required></label>'+
   '<label>Tanggal mulai<input name="starts_at" type="datetime-local" value="'+local(c.starts_at)+'" required></label>'+
   '<label>Tenggat pengumpulan poin<input name="ends_at" type="datetime-local" value="'+local(c.ends_at)+'" required></label>'+
   '<label>Tanggal pengumuman pemenang<input name="announcement_at" type="datetime-local" value="'+local(c.announcement_at)+'" required></label>'+
   '<button type="submit" class="btn primary">Simpan jadwal event</button><p id="ecoAdminEventMessage" role="status"></p></form>'+
   '<div class="eco-admin-event-leaderboard"><h3>Top 10 berdasarkan laporan disetujui</h3>'+list(d.leaderboard)+'</div></section>';
  document.querySelector('#ecoAdminEventForm').onsubmit=async ev=>{
   ev.preventDefault();const form=ev.currentTarget,msg=document.querySelector('#ecoAdminEventMessage'),button=form.querySelector('button');
   const data=Object.fromEntries(new FormData(form));
   try{
    const start=parseJakarta(data.starts_at),end=parseJakarta(data.ends_at),announcement=parseJakarta(data.announcement_at);
    if(!(new Date(start)<new Date(end)&&new Date(end)<new Date(announcement)))throw Error('Tanggal mulai harus sebelum akhir, dan pengumuman harus setelah akhir.');
    if(!confirm('Simpan periode baru? Perubahan tenggat dapat mengubah peserta dan peringkat yang memenuhi syarat.'))return;
    button.disabled=true;
    const r=await fetch('/api/admin/event',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:data.title,starts_at:start,ends_at:end,announcement_at:announcement})});
    const response=await r.json();if(!r.ok)throw Error(response.error||'Gagal menyimpan.');
    msg.textContent='✅ Jadwal event berhasil diperbarui!';
    button.disabled=false;
   }catch(e){msg.textContent='❌ '+e.message;button.disabled=false}
  };
 }catch(e){host.innerHTML='<p class="eco-admin-load-error">'+esc(e.message)+'</p>'}
}
async function rewards(){
 const host=document.querySelector('#ecoAdminContestRewards');if(!host)return;
 try{
  const d=await get();
  const p=[['Mouse JETE MO106',1],['Earphone JETE Eazy 3',2],['Mousepad JETE',3]];
  host.innerHTML='<h2>🏆 Tiga hadiah utama</h2><p>Pemenang ditentukan berdasarkan poin yang diverifikasi selama periode. Hadiah tidak bisa ditukar langsung.</p>'+
   '<div class="eco-admin-prize-gallery">'+p.map(([n,i])=>'<div><span>JUARA '+i+'</span>'+prizePhoto(i,n)+'<b>'+esc(n)+'</b></div>').join('')+'</div>'+
   '<p><strong>Pengumuman:</strong> '+nice(d.config.announcement_at)+'</p>'+
   '<a href="/admin/?tab=settings" class="btn ghost">Ubah tenggat & jadwal →</a>'+
   '<h3>Peringkat saat ini</h3>'+list(d.leaderboard);
 }catch(e){host.textContent=e.message}
}
async function overview(){
 const host=document.getElementById('ecoAdminContestOverview');if(!host)return;
 try{
  const d=await get();
  host.innerHTML='<div class="eco-admin-event-overview"><strong>🏆 Top 3 Challenge</strong><span>Tenggat: '+nice(d.config.ends_at)+'</span><span>Pengumuman: '+nice(d.config.announcement_at)+'</span><a href="/admin/?tab=settings">Atur tanggal →</a></div>'+'<div class="eco-admin-overview-photos" aria-label="Hadiah Top 3">'+[['Mouse JETE MO106',1],['Earphone JETE Eazy 3',2],['Mousepad JETE',3]].map(([name,i])=>prizePhoto(i,name,true)).join('')+'</div>'+list(d.leaderboard.slice(0,3));
 }catch(e){host.textContent='Tidak dapat memuat peringkat kompetisi.'}
}
window.EcoAdminContest={settings,rewards,overview};
})();