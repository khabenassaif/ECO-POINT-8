const root=document.querySelector('#adminRoot');
const crumb=document.querySelector('#adminCrumb');
const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const fmt=d=>d?new Date(d).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}):'—';
let current='overview';
const toast=m=>{const t=document.querySelector('#adminToast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)};
async function api(path,opts={}){const r=await fetch(path,{redirect:'manual',...opts,headers:opts.body instanceof FormData?opts.headers:{'Content-Type':'application/json',...(opts.headers||{})}});if(r.status===401||r.type==='opaqueredirect'){throw Object.assign(new Error('Silakan login menggunakan kode akses administrator.'),{authError:true})}if(r.status===403){const j=await r.json().catch(()=>({}));if(j.code==='admin_code_required'){adminVerified=false;showAdminLogin('Sesi admin berakhir. Masuk kembali menggunakan kode akses.');throw Object.assign(new Error('Sesi admin berakhir.'),{otpRequired:true})}throw Object.assign(new Error(j.error||'Akun ini tidak memiliki hak administrator Eco-Point.'),{authError:true})}const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Operasi gagal.');return j}
const pill=s=>`<span class="pill ${esc(s)}">${esc(String(s||'').replaceAll('_',' '))}</span>`;
const empty=s=>`<div class="empty">${esc(s)}</div>`;
const head=(k,t,d='',a='')=>`<div class="admin-page-head"><div><div class="eyebrow">${k}</div><h1>${t}</h1><p>${d}</p></div><div class="admin-actions">${a}</div></div>`;

let inboxInitialized=false;
let inboxLastPending=new Set();
let inboxCount=0;
let inboxLoading=false;
function updateInboxIndicator(data){
 const rows=(data.reports||[]).filter(x=>['pending_admin','submitted','automated_review'].includes(x.status));
 const count=Number(data.pending_count??rows.length);
 const countEl=document.querySelector('#adminPendingBadge');
 const bellCount=document.querySelector('#adminBellBadge');
 const bell=document.querySelector('#adminBellToggle');
 for(const el of [countEl,bellCount]){
  if(el){el.textContent=count>99?'99+':String(count);el.hidden=count===0}
 }
 if(bell){bell.setAttribute('aria-label',count+' laporan menunggu persetujuan admin')}
 const currentIds=new Set(rows.map(x=>x.id));
 const previousIds=inboxLastPending;
 inboxLastPending=currentIds;
 if(inboxInitialized){
  const newRows=rows.filter(x=>!previousIds.has(x.id));
  if(newRows.length){
   toast('🔔 '+newRows.length+' laporan baru menunggu persetujuan!');
   if(current==='reports'&&!document.querySelector('#rejectReason:focus')){
    renderReports().catch(e=>toast(e.message));
   }
  }
 }else if(count>0){
  toast('📥 '+count+' laporan menunggu persetujuan admin');
 }
 inboxInitialized=true;
 inboxCount=count;
 const alertBox=document.querySelector('#adminNoticeList');
 if(alertBox){
  alertBox.innerHTML=count?rows.slice(0,8).map(x=>
    `<button type="button" class="admin-notice-item" data-go-report="${esc(x.id)}"><b>${esc(x.full_name||'Member Eco-Point')}</b><span>${esc(x.category||'Laporan sampah')} · ${fmt(x.submitted_at)}</span></button>`
  ).join(''):'<p class="admin-notice-empty">Tidak ada laporan yang menunggu verifikasi.</p>';
  alertBox.querySelectorAll('[data-go-report]').forEach(btn=>btn.onclick=()=>{
   document.querySelector('#adminNoticePanel').hidden=true;
   window.ecoAdminRequestedReport=btn.dataset.goReport;
   setTab('reports');
  });
 }
}
async function pollAdminInbox(){
 if(!adminVerified||inboxLoading||document.visibilityState==='hidden')return;
 inboxLoading=true;
 try{
  const data=await api('/api/admin/reports');
  updateInboxIndicator(data);
 }catch(e){if(!e.otpRequired&&adminVerified)console.warn('Inbox admin belum dapat diperbarui:',e.message)}
 finally{inboxLoading=false}
}
setInterval(pollAdminInbox,20000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pollAdminInbox()});
document.querySelector('#adminBellToggle')?.addEventListener('click',()=>{
 const panel=document.querySelector('#adminNoticePanel');
 panel.hidden=!panel.hidden;
 if(!panel.hidden)pollAdminInbox();
});


function setTab(t){current=t;const u=new URL(location.href);u.searchParams.set('tab',t);history.replaceState(null,'',u.pathname+u.search);document.querySelectorAll('.admin-nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));crumb.textContent=document.querySelector(`.admin-nav button[data-tab="${t}"]`)?.textContent||'Overview';render()}
document.querySelectorAll('.admin-nav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
document.querySelector('#adminLogout').onclick=async()=>{try{await fetch('/api/admin/code-login',{method:'DELETE',credentials:'same-origin'})}finally{adminVerified=false;showAdminLogin('Sesi admin berhasil ditutup.')}};

let adminVerified=false;
async function ensureAdminVerification(){
 if(adminVerified)return true;
 try{
  const response=await fetch('/api/admin/code-login',{credentials:'same-origin',cache:'no-store'});
  const status=await response.json();
  if(status.authenticated){adminVerified=true;return true}
 }catch(e){}
 showAdminLogin();return false;
}
function showAdminLogin(message=''){
 adminVerified=false;
 root.innerHTML=`<section class="admin-access-alert admin-simple-login">
  <span>🛡️ AKSES KHUSUS ADMIN</span>
  <h1>Login Admin Eco-Point</h1>
  <p>Masukkan nama operator dan kode akses admin. Tidak perlu lagi meminta kode Gmail.</p>
  <form id="adminCodeForm" autocomplete="off">
   <label for="adminUsername">Username (bebas)</label>
   <input id="adminUsername" name="username" type="text" autocomplete="username" maxlength="48" minlength="2" placeholder="Misalnya: Admin Kelompok 8" required>
   <label for="adminCode">Kode akses admin</label>
   <div class="admin-password-row">
    <input id="adminCode" name="passkey" type="password" autocomplete="off" placeholder="Masukkan kode akses" required>
    <button id="adminReveal" type="button" aria-label="Lihat atau sembunyikan kode">Lihat</button>
   </div>
   <button class="btn primary" type="submit" id="adminCodeSubmit">Masuk ke Dashboard →</button>
  </form>
  <p id="adminLoginMessage" class="admin-otp-status" role="status" aria-live="polite">${esc(message)}</p>
  <small>Setiap percobaan login dibatasi. Sesi akan berakhir otomatis setelah 8 jam. Jangan bagikan kode akses admin kepada orang yang tidak berwenang.</small>
 </section>`;
 const form=document.querySelector('#adminCodeForm');
 const code=document.querySelector('#adminCode');
 const reveal=document.querySelector('#adminReveal');
 reveal.onclick=()=>{const show=code.type==='password';code.type=show?'text':'password';reveal.textContent=show?'Sembunyikan':'Lihat'};
 form.onsubmit=async e=>{
  e.preventDefault();
  const b=document.querySelector('#adminCodeSubmit'),message=document.querySelector('#adminLoginMessage');
  b.disabled=true;b.textContent='Memverifikasi…';message.textContent='';
  try{
   const response=await fetch('/api/admin/code-login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.elements.username.value,passkey:form.elements.passkey.value})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.error||'Gagal masuk. Coba lagi.');
   adminVerified=true;
   code.value='';
   toast('Login admin berhasil.');
   await render();
  }catch(e){message.textContent=e.message;b.disabled=false;b.textContent='Masuk ke Dashboard →'}
 };
}

async function render(){
 if(!await ensureAdminVerification())return;
 root.innerHTML='<div class="admin-skeleton"><span></span><span></span><span></span></div>';
 try{
  if(current==='overview') return await renderOverview();
  if(current==='reports') return await renderReports();
  if(current==='redemptions') return await renderRedemptions();
  if(current==='analytics') return await renderAnalytics();
  const d=await api('/api/admin/manage');
  if(current==='categories') return renderCategories(d);
  if(current==='locations') return renderLocations(d);
  if(current==='rewards') return renderRewards(d);
  if(current==='students') return renderStudents(d);
  if(current==='transactions') return renderTransactions(d);
  if(current==='settings') return renderSettings(d);
 }catch(e){if(e.otpRequired)return;root.innerHTML=e.authError?`<section class="admin-access-alert"><span>🛡️ AKSES ADMIN TERLINDUNGI</span><h1>Verifikasi akun administrator</h1><p>${esc(e.message)}</p><div class="admin-access-links"><a href="https://hatchable.com/console/login" class="btn primary">Login Admin Hatchable →</a><a href="/login?role=member" class="btn ghost">Masuk sebagai Member</a></div><small>Hanya pemilik atau administrator proyek yang dapat menyetujui dan menolak laporan.</small></section>`:`<div class="error">${esc(e.message)}</div>`}
}

async function renderOverview(){
 const d=await api('/api/admin/overview'),s=d.stats||{};
 root.innerHTML=head('DASHBOARD ADMIN','Pusat aktivitas Eco-Point.','Laporan dari member masuk ke antrean verifikasi dan dapat diputuskan di sini.')+
 (Number(s.pending||0)>0?`<div class="admin-pending-alert" role="status"><div><strong>🔔 ${s.pending} laporan menunggu persetujuan</strong><span>Member telah mengirim laporan sampah baru. Periksa bukti dan berikan keputusan.</span></div><button class="btn primary" data-go="reports">Periksa laporan →</button></div>`:'<div class="admin-ready-alert">✓ Tidak ada laporan yang menunggu persetujuan saat ini.</div>')+
 `<div class="admin-stat-grid">
   <div class="admin-stat accent"><strong>${s.pending||0}</strong><span>Pending Reports</span></div>
   <div class="admin-stat"><strong>${s.students||0}</strong><span>Total Users</span></div>
   <div class="admin-stat"><strong>${s.approved||0}</strong><span>Approved Reports</span></div>
   <div class="admin-stat"><strong>${s.points_distributed||0}</strong><span>Points Distributed</span></div>
 </div>
 <div class="admin-overview-grid">
  <section class="admin-panel"><div class="admin-panel-head"><h2>Report Activity · 30 Days</h2><button class="btn ghost" data-go="analytics">Open Analytics</button></div>${trendChart(d.report_trend)}</section>
  <section class="admin-panel"><div class="admin-panel-head"><h2>Report Status</h2><span class="meta">${s.reports||0} total</span></div><div class="legend">${d.report_statuses.length?d.report_statuses.map((x,i)=>`<div class="legend-row"><span class="legend-dot" style="background:${['var(--primary)','var(--fresh)','var(--warning)','var(--danger)','var(--info)'][i%5]}"></span><span>${esc(x.status.replaceAll('_',' '))}</span><b>${x.count}</b></div>`).join(''):empty('Belum ada laporan.')}</div></section>
 </div>
 <div class="admin-overview-grid" style="margin-top:16px">
  <section class="admin-panel"><div class="admin-panel-head"><h2>Recent Reports</h2><button class="btn ghost" data-go="reports">Open Queue</button></div><div class="admin-recent">${d.recent_reports.length?d.recent_reports.map(x=>`<div class="admin-recent-row"><img class="admin-thumb" src="/api/admin/report-photo?id=${x.id}" alt=""><div><b>${esc(x.full_name)} · ${esc(x.category)}</b><div class="meta">${fmt(x.submitted_at)}</div></div>${pill(x.status)}</div>`).join(''):empty('Belum ada laporan.')}</div></section>
  <section class="admin-panel"><div class="admin-panel-head"><h2>Quick Metrics</h2></div><div class="legend"><div class="legend-row"><span class="legend-dot"></span><span>Rejected reports</span><b>${s.rejected||0}</b></div><div class="legend-row"><span class="legend-dot" style="background:var(--info)"></span><span>Active users (30d)</span><b>${s.active_users||0}</b></div><div class="legend-row"><span class="legend-dot" style="background:var(--warning)"></span><span>Total redemptions</span><b>${s.redemptions||0}</b></div><div class="legend-row"><span class="legend-dot" style="background:var(--fresh)"></span><span>Ready for pickup</span><b>${s.pending_pickups||0}</b></div></div></section>
 </div>`;
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>setTab(b.dataset.go));
 pollAdminInbox();
}
function trendChart(rows){if(!rows?.length)return empty('Belum ada aktivitas pada 30 hari terakhir.');const max=Math.max(...rows.map(x=>Number(x.count)),1);return `<div class="admin-chart">${rows.map(x=>`<div class="admin-bar-wrap"><div class="admin-bar" style="height:${Math.max(5,Number(x.count)/max*100)}%" data-tip="${x.count} · ${new Date(x.report_date).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}"></div></div>`).join('')}</div>`}

async function renderReports(){
 const d=await api('/api/admin/reports');
 updateInboxIndicator(d);
 const pending=d.reports.filter(x=>['pending_admin','submitted','automated_review'].includes(x.status)).length;
 const approved=d.reports.filter(x=>x.status==='approved').length;
 const rejected=d.reports.filter(x=>x.status==='rejected').length;
 root.innerHTML=head('VERIFIKASI LAPORAN','Kelola keputusan laporan.','Periksa bukti dan lokasi, kemudian setujui atau tolak laporan dengan alasan yang jelas.',
 '<span class="admin-queue-count">📥 '+pending+' laporan menunggu</span>')+
 `<div class="admin-review-summary">
    <div><small>Menunggu keputusan</small><strong>${pending}</strong><span>Perlu diperiksa</span></div>
    <div><small>Disetujui</small><strong>${approved}</strong><span>Poin diberikan</span></div>
    <div><small>Ditolak</small><strong>${rejected}</strong><span>Tidak mendapatkan poin</span></div>
   </div>
   <div class="verification-layout">
     <section class="verification-list"><div class="verification-toolbar"><label for="statusFilter">Filter status</label><select id="statusFilter"><option value="pending">⏳ Menunggu verifikasi (${pending})</option><option value="">Semua laporan</option><option value="approved">✅ Disetujui (${approved})</option><option value="rejected">❌ Ditolak (${rejected})</option></select></div><div class="queue" id="queue"></div></section>
     <section class="verification-detail" id="verificationDetail"><div class="verification-empty"><div><div class="category-icon" style="margin:0 auto 14px">📋</div><b>Pilih laporan untuk ditinjau</b><p class="meta">Foto, lokasi, hasil pemeriksaan, dan tombol keputusan akan muncul di sini.</p></div></div></section>
   </div>`;
 const draw=()=>{
  const f=document.querySelector('#statusFilter').value;
  const rows=d.reports.filter(x=>!f||(f==='pending'?['pending_admin','submitted','automated_review'].includes(x.status):x.status===f));
  document.querySelector('#queue').innerHTML=rows.length?rows.map(x=>`<button type="button" class="queue-item" data-report="${x.id}"><img src="/api/admin/report-photo?id=${x.id}" alt="Foto bukti"><div><b>${esc(x.full_name)}</b><div class="meta">${esc(x.category)} · ${fmt(x.submitted_at)}</div></div>${pill(x.status)}</button>`).join(''):empty('Tidak ada laporan untuk status ini.');
  document.querySelectorAll('[data-report]').forEach(x=>x.onclick=()=>openReviewPanel(x.dataset.report,x));
  if(rows.length){
    const request=window.ecoAdminRequestedReport;
    const target=request?Array.from(document.querySelectorAll('[data-report]')).find(x=>x.dataset.report===request):null;
    (target||document.querySelector('[data-report]'))?.click();
    window.ecoAdminRequestedReport=null;
  }
  else document.querySelector('#verificationDetail').innerHTML='<div class="verification-empty">Tidak ada laporan yang dipilih.</div>';
 };
 document.querySelector('#statusFilter').onchange=draw;
 draw();
}
async function openReviewPanel(id,node){
 document.querySelectorAll('.queue-item').forEach(x=>x.classList.remove('active'));node?.classList.add('active');
 const box=document.querySelector('#verificationDetail');box.innerHTML='<div class="loading" style="margin:18px">Memuat detail…</div>';
 try{
  const d=await api('/api/admin/reports?id='+encodeURIComponent(id)),r=d.report;
  box.innerHTML=`<div class="verification-body"><div class="admin-panel-head"><div><div class="eyebrow">DETAIL LAPORAN</div><h2 style="margin:4px 0">${esc(r.full_name)} · ${esc(r.category)}</h2></div>${pill(r.status)}</div>
  <img class="verification-photo" src="${esc(r.photo_url)}" alt="Bukti asli mahasiswa">
  <div class="verification-meta"><div class="meta-box"><b>Member</b><span>${esc(r.email)}</span></div><div class="meta-box"><b>Dikirim</b><span>${fmt(r.submitted_at)}</span></div><div class="meta-box"><b>GPS</b><span>${r.latitude}, ${r.longitude}</span></div><div class="meta-box"><b>Accuracy</b><span>±${esc(r.gps_accuracy||'—')} m</span></div></div>
  <p><b>Deskripsi</b><br><span class="meta">${esc(r.description||'—')}</span></p><div class="admin-award-summary"><strong>${r.status==='approved'?'✅ Poin berhasil ditambahkan':r.status==='rejected'?'❌ Poin tidak diberikan':'🪙 Calon poin setelah disetujui'}</strong><span>${r.status==='approved'?Number(r.awarded_points??r.category_points):r.status==='rejected'?0:Number(r.category_points)} poin</span></div>${r.notes?`<p><b>Catatan tambahan</b><br><span class="meta">${esc(r.notes)}</span></p>`:''}
  <a class="btn ghost" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=18/${r.latitude}/${r.longitude}">Lihat lokasi di peta ↗</a>
  <h3 style="margin-top:22px">Pemeriksaan otomatis</h3><div class="check-list">${d.automated_checks.map(c=>`<div class="check-row"><span class="check-state">${c.passed?'✓':'!'}</span><div><b>${esc(c.check_type.replaceAll('_',' '))}</b><div class="meta">${esc(c.details||'')}</div></div><span class="pill ${c.passed?'approved':'pending_admin'}">${c.passed?'Passed':'Review'}</span></div>`).join('')}</div>
  <h3 style="margin-top:22px">Riwayat laporan member</h3><div class="admin-recent">${d.user_history?.length?d.user_history.map(x=>`<div class="admin-recent-row"><span class="admin-thumb" style="display:grid;place-items:center;color:var(--primary)">#</span><div><b>${esc(x.category)}</b><div class="meta">${fmt(x.submitted_at)}</div></div>${pill(x.status)}</div>`).join(''):empty('Belum ada laporan lain dari pengguna ini.')}</div>
  ${['approved','rejected'].includes(r.status)?'':`<div class="review-actions"><label for="rejectReason"><strong>Alasan penolakan (wajib jika ditolak)</strong><small>Alasan akan ditampilkan kepada member agar laporan dapat diperbaiki.</small></label><textarea id="rejectReason" placeholder="Jelaskan alasan penolakan kepada pelapor, misalnya foto tidak sesuai atau bukti tidak jelas..."></textarea><button class="btn ghost" id="rejectBtn">Tolak laporan</button><button class="btn primary" id="approveBtn">Setujui + ${r.category_points} poin</button><p id="reviewSaveStatus" role="status" aria-live="polite" class="review-save-status"></p></div>`}</div>`;
  if(box.querySelector('#approveBtn'))box.querySelector('#approveBtn').onclick=()=>reviewDecision(id,'approved','');
  if(box.querySelector('#rejectBtn'))box.querySelector('#rejectBtn').onclick=()=>reviewDecision(id,'rejected',box.querySelector('#rejectReason').value);
 }catch(e){box.innerHTML=`<div class="error" style="margin:18px">${esc(e.message)}</div>`}
}
async function reviewDecision(id,decision,reason){
 if(decision==='rejected'&&!reason.trim())return toast('Alasan penolakan wajib diisi.');
 if(!confirm(decision==='approved'?'Setujui laporan ini dan berikan poin kepada member?':'Tolak laporan ini dengan alasan yang sudah ditulis?'))return;
 const buttons=[document.querySelector('#approveBtn'),document.querySelector('#rejectBtn')].filter(Boolean);
 const original=buttons.map(b=>b.textContent);
 buttons.forEach(b=>{b.disabled=true;b.setAttribute('aria-busy','true')});
 const status=document.querySelector('#reviewSaveStatus');
 if(status)status.textContent='Menyimpan keputusan dan memproses poin…';
 try{
  const result=await api('/api/admin/review',{method:'POST',body:JSON.stringify({report_id:id,decision,reason})});
  toast(decision==='approved'?'Laporan disetujui. +'+Number(result.awarded_points||0)+' poin berhasil masuk ke saldo member.':'Laporan ditolak. Alasan sudah dikirim kepada member.');
  await renderReports();
 }catch(e){
  if(status)status.textContent='Gagal menyimpan: '+e.message;
  toast(e.message);
  buttons.forEach((b,i)=>{b.disabled=false;b.removeAttribute('aria-busy');b.textContent=original[i]});
 }
}

async function renderAnalytics(){
 const d=await api('/api/admin/overview'),s=d.stats||{},totalCat=d.category_distribution.reduce((a,b)=>a+Number(b.count),0);
 root.innerHTML=head('ANALYTICS','Participation insights.','Seluruh visualisasi menggunakan data operasional yang tersimpan pada database.')+
 `<div class="admin-stat-grid"><div class="admin-stat"><strong>${s.active_users||0}</strong><span>Active Users · 30d</span></div><div class="admin-stat"><strong>${s.reports||0}</strong><span>Total Reports</span></div><div class="admin-stat"><strong>${s.points_distributed||0}</strong><span>Points Distributed</span></div><div class="admin-stat"><strong>${s.redemptions||0}</strong><span>Redemptions</span></div></div>
 <div class="admin-overview-grid"><section class="admin-panel"><div class="admin-panel-head"><h2>Report Trend</h2><span class="meta">Last 30 days</span></div>${trendChart(d.report_trend)}</section><section class="admin-panel"><div class="admin-panel-head"><h2>Waste Categories</h2></div>${d.category_distribution.length?`<div class="donut-wrap"><div class="donut"><b>${totalCat}</b></div><div class="legend">${d.category_distribution.map((x,i)=>`<div class="legend-row"><span class="legend-dot" style="background:${['var(--primary)','var(--fresh)','var(--warning)','var(--info)','var(--danger)'][i%5]}"></span><span>${esc(x.name)}</span><b>${x.count}</b></div>`).join('')}</div></div>`:empty('Belum ada data kategori.')}</section></div>`;
}

function editor(title,fields,onSave){
 const d=document.createElement('dialog');d.innerHTML=`<form class="modal"><div class="modal-head"><div><div class="eyebrow">EDIT DATA</div><h2>${esc(title)}</h2></div><button type="button">×</button></div>${fields}<div class="modal-actions"><button type="button" class="btn ghost cancel">Cancel</button><button class="btn primary">Save Changes</button></div></form>`;document.body.append(d);d.querySelector('.modal-head button').onclick=()=>d.close();d.querySelector('.cancel').onclick=()=>d.close();d.addEventListener('close',()=>d.remove());d.querySelector('form').onsubmit=async e=>{e.preventDefault();try{await onSave(new FormData(e.currentTarget));d.close();toast('Perubahan disimpan.');render()}catch(err){toast(err.message)}};d.showModal();
}
function renderCategories(d){root.innerHTML=head('CONFIGURATION','Waste Categories','Kelola kategori yang tersedia pada form mahasiswa dan jumlah poin per approval.','<button class="btn primary" id="add">+ Add Category</button>')+`<div class="admin-card-list">${d.categories.length?d.categories.map(x=>`<div class="admin-row"><div><b>${esc(x.name)}</b><br><small>${esc(x.description||'No description')} · ${x.points} pts · ${x.is_active?'Active':'Inactive'}</small></div><button class="btn ghost" data-edit="${x.id}">Edit</button></div>`).join(''):empty('Belum ada kategori.')}</div>`;document.querySelector('#add').onclick=()=>categoryEditor();document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>categoryEditor(d.categories.find(x=>x.id===b.dataset.edit)))}
function categoryEditor(x={}){editor(x.id?'Edit category':'Add category',`<div class="field"><label>Name</label><input name="name" required value="${esc(x.name||'')}"></div><div class="field"><label>Description</label><textarea name="description">${esc(x.description||'')}</textarea></div><div class="field"><label>Points per approval</label><input name="points" type="number" min="0" required value="${x.points??10}"></div><div class="field"><label><input name="is_active" type="checkbox" ${x.is_active===false?'':'checked'}> Active</label></div>`,fd=>api('/api/admin/manage',{method:x.id?'PUT':'POST',body:JSON.stringify({type:'category',id:x.id,...Object.fromEntries(fd.entries()),is_active:fd.get('is_active')==='on'})}))}
function renderLocations(d){root.innerHTML=head('CONFIGURATION','Bin Locations','Kelola titik sampah yang ditampilkan pada website publik.','<button class="btn primary" id="add">+ Add Location</button>')+`<div class="admin-card-list">${d.locations.length?d.locations.map(x=>`<div class="admin-row"><div><b>${esc(x.name)}</b><br><small>${x.latitude}, ${x.longitude} · ${x.is_active?'Active':'Inactive'}</small></div><button class="btn ghost" data-edit="${x.id}">Edit</button></div>`).join(''):empty('Belum ada lokasi.')}</div>`;document.querySelector('#add').onclick=()=>locationEditor();document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>locationEditor(d.locations.find(x=>x.id===b.dataset.edit)))}
function locationEditor(x={}){editor(x.id?'Edit location':'Add location',`<div class="field"><label>Name</label><input name="name" required value="${esc(x.name||'')}"></div><div class="field"><label>Description</label><textarea name="description">${esc(x.description||'')}</textarea></div><div class="verification-meta"><div class="field"><label>Latitude</label><input name="latitude" type="number" step="any" required value="${x.latitude??''}"></div><div class="field"><label>Longitude</label><input name="longitude" type="number" step="any" required value="${x.longitude??''}"></div></div><div class="field"><label><input name="is_active" type="checkbox" ${x.is_active===false?'':'checked'}> Active</label></div>`,fd=>api('/api/admin/manage',{method:x.id?'PUT':'POST',body:JSON.stringify({type:'location',id:x.id,...Object.fromEntries(fd.entries()),is_active:fd.get('is_active')==='on'})}))}
const ADMIN_PRIZE_IMAGES=[
  'Gantungan Kunci Eco-Point',
  'Sedotan Stainless Steel',
  'Pembatas Buku Kertas Daur Ulang',
  'Pin atau Badge Eco-Point',
  'Sachet Benih Tanaman',
  'Pensil Ramah Lingkungan',
  'Magnet dari Material Daur Ulang',
  'Paket Stiker Edukasi Lingkungan'
];
// Match the existing upscaled eight-product sprite by exact reward name.
// A manually uploaded product photo still takes precedence.
function adminRewardPhoto(reward,large=false){
 const index=ADMIN_PRIZE_IMAGES.indexOf(reward.name);
 const cls='reward-table-image admin-reward-photo'+(large?' admin-reward-photo-large':'');
 if(reward.image_key){
  return `<img class="${cls}" loading="lazy" src="/api/admin/reward-image?id=${encodeURIComponent(reward.id)}" alt="${esc(reward.name)}">`;
 }
 if(index!==-1){
  return `<span class="${cls} admin-reward-sprite" role="img" aria-label="${esc(reward.name)}" style="background-position:${(index/7*100).toFixed(5)}% center"></span>`;
 }
 return `<span class="${cls} admin-reward-fallback" aria-label="Foto belum tersedia" role="img">🎁</span>`;
}
function renderRewards(d){
 root.innerHTML=head('REWARDS MANAGEMENT','Merchandise catalog.','Foto HD setiap hadiah Spin Wheel telah dipasangkan sesuai nama produk. Kelola stok, kategori, dan informasi merchandise.','<button class="btn primary" id="add">+ Add Reward</button>')+
 `<div class="admin-table-shell admin-merch-table"><table class="admin-table"><thead><tr><th>Produk &amp; foto HD</th><th>Kategori</th><th>Poin</th><th>Stok</th><th>Status</th><th>Kelola</th></tr></thead><tbody>${d.rewards.map(x=>`<tr><td><div class="admin-merch-product">${adminRewardPhoto(x)}<b>${esc(x.name)}</b></div></td><td>${esc(x.category==='spin_wheel'?'Hadiah Spin Wheel':x.category||'merchandise')}</td><td>${x.category==='spin_wheel'?'1 voucher':x.point_cost+' poin'}</td><td>${x.stock}</td><td>${x.is_active?'Aktif':'Arsip'}</td><td><button class="btn ghost" data-edit="${esc(x.id)}">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
 document.querySelector('#add').onclick=()=>rewardEditor();
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>rewardEditor(d.rewards.find(x=>x.id===b.dataset.edit)));
}
function rewardEditor(x={}){editor(x.id?'Edit reward':'Add reward',`<div class="field"><label>Product name</label><input name="name" required value="${esc(x.name||'')}"></div><div class="field"><label>Description</label><textarea name="description">${esc(x.description||'')}</textarea></div><div class="verification-meta"><div class="field"><label>Category</label><select name="category"><option value="merchandise" ${x.category==='merchandise'?'selected':''}>Merchandise</option><option value="accessories" ${x.category==='accessories'?'selected':''}>Accessories</option><option value="other" ${x.category==='other'?'selected':''}>Other</option></select></div><div class="field"><label>Point cost</label><input name="point_cost" type="number" min="1" required value="${x.point_cost??100}"></div><div class="field"><label>Stock</label><input name="stock" type="number" min="0" required value="${x.stock??0}"></div><div class="field"><label>Image</label><input name="image" type="file" accept="image/jpeg,image/png,image/webp"></div></div><div class="field"><label>Pickup instructions</label><textarea name="pickup_instructions">${esc(x.pickup_instructions||'')}</textarea></div><div class="field"><label><input name="is_active" type="checkbox" ${x.is_active===false?'':'checked'}> Active</label></div>`,async fd=>{fd.append('type','reward');if(x.id)fd.append('id',x.id);fd.set('is_active',fd.get('is_active')==='on'?'true':'false');return api('/api/admin/manage',{method:x.id?'PUT':'POST',body:fd})})}
async function renderRedemptions(){const d=await api('/api/admin/redemptions');root.innerHTML=head('REDEMPTION MANAGEMENT','Pickup workflow.','Kelola status penukaran tanpa mengubah histori transaksi poin.')+`<div class="admin-table-shell"><table class="admin-table"><thead><tr><th>Code</th><th>Student</th><th>Reward</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>${d.redemptions.map(x=>`<tr><td>EP-${String(x.id).slice(0,8).toUpperCase()}</td><td>${esc(x.full_name)}</td><td>${esc(x.reward_name)} · ${x.points_cost} pts</td><td>${fmt(x.created_at)}</td><td>${pill(x.status)}</td><td><div class="admin-actions">${x.status==='pending'?'<button class="btn soft" data-next="ready" data-id="'+x.id+'">Ready</button><button class="btn ghost" data-next="cancelled" data-id="'+x.id+'">Cancel</button>':x.status==='ready'?'<button class="btn primary" data-next="collected" data-id="'+x.id+'">Collected</button><button class="btn ghost" data-next="cancelled" data-id="'+x.id+'">Cancel</button>':'—'}</div></td></tr>`).join('')}</tbody></table></div>`;document.querySelectorAll('[data-next]').forEach(b=>b.onclick=async()=>{if(!confirm('Ubah status menjadi '+b.dataset.next+'?'))return;try{await api('/api/admin/redemptions',{method:'PUT',body:JSON.stringify({id:b.dataset.id,status:b.dataset.next})});toast('Status diperbarui.');renderRedemptions()}catch(e){toast(e.message)}})}
function renderStudents(d){root.innerHTML=head('USERS','Student directory.','Data pribadi yang ditampilkan di area admin hanya digunakan untuk operasional Eco-Point.')+`<div class="admin-table-shell"><table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Student ID</th><th>Points</th><th>Member Since</th></tr></thead><tbody>${d.students.map(x=>`<tr><td><b>${esc(x.full_name)}</b></td><td>${esc(x.email)}</td><td>${esc(x.student_id||'—')}</td><td>${x.points}</td><td>${fmt(x.created_at)}</td></tr>`).join('')}</tbody></table></div>`}
function renderTransactions(d){root.innerHTML=head('POINT TRANSACTIONS','Audit the ledger.','Ledger transaksi merupakan sumber kebenaran saldo Eco-Points.')+`<div class="admin-table-shell"><table class="admin-table"><thead><tr><th>Student</th><th>Type</th><th>Points</th><th>Reason</th><th>Timestamp</th></tr></thead><tbody>${d.transactions.map(x=>`<tr><td>${esc(x.full_name||x.user_id)}</td><td>${esc(x.type)}</td><td><b style="color:${x.points>=0?'var(--primary)':'var(--danger)'}">${x.points>0?'+':''}${x.points}</b></td><td>${esc(x.reason||'')}</td><td>${fmt(x.created_at)}</td></tr>`).join('')}</tbody></table></div>`}
function renderSettings(d){root.innerHTML=head('SETTINGS','Access configuration.','Domain institusi tidak di-hardcode. Tambahkan hanya domain resmi yang telah dikonfirmasi.','<button class="btn primary" id="addDomain">+ Add Domain</button>')+`<div class="settings-grid"><section class="setting-card"><h3>Institutional email domains</h3><p>Mahasiswa hanya dapat memakai fitur privat jika domain email mereka terdapat pada daftar ini.</p><div class="admin-card-list">${d.domains.length?d.domains.map(x=>`<div class="admin-row"><b>@${esc(x.domain)}</b><button class="btn ghost" data-del-domain="${esc(x.domain)}">Remove</button></div>`).join(''):empty('Belum ada domain. Fitur mahasiswa tetap terkunci.')}</div></section><section class="setting-card"><h3>Google Authentication</h3><p>Google Sign-In membutuhkan custom domain terverifikasi dan OAuth client milik pemilik proyek pada Hatchable Setup.</p><a class="btn ghost" href="https://hatchable.com/console/projects/eco-point" target="_blank" rel="noopener">Open Hatchable Setup ↗</a></section></div>`;document.querySelector('#addDomain').onclick=()=>editor('Add institutional domain',`<div class="field"><label>Official domain</label><input name="domain" placeholder="example.ac.id" required></div>`,fd=>api('/api/admin/manage',{method:'POST',body:JSON.stringify({type:'domain',domain:fd.get('domain')})}));document.querySelectorAll('[data-del-domain]').forEach(b=>b.onclick=async()=>{if(!confirm('Remove this domain?'))return;await api('/api/admin/manage',{method:'DELETE',body:JSON.stringify({type:'domain',domain:b.dataset.delDomain})});toast('Domain dihapus.');render()})}

const initialTab=new URLSearchParams(location.search).get('tab');
if(['overview','reports','categories','locations','rewards','redemptions','students','transactions','analytics','settings'].includes(initialTab))setTab(initialTab);
else render();