/* Eco-Point same-origin authentication bridge for Render.
   Keeps the original UI while removing its dependency on Hatchable.
   Only verified email-code login is supported on this deployment. */
(function(){
  async function request(path,method='GET',data){
    const r=await fetch(path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw Object.assign(new Error(j.error||j.message||'Permintaan gagal.'),{status:r.status});
    return j;
  }
  const auth={
    getSession:()=>request('/api/auth/session'),
    providers:async()=>[],
    supportsPasskeys:()=>false,
    attachPasskeyAutofill:async()=>null,
    startLogin:({email})=>request('/api/auth/login/start','POST',{email}),
    verifyCode:({email,code})=>request('/api/auth/login/verify','POST',{email,code}),
    signOut:()=>request('/api/auth/logout','POST',{}),
    signInWithPasskey:async()=>{throw new Error('Passkey belum tersedia pada hosting Render. Gunakan kode verifikasi email.');},
    registerPasskey:async()=>{throw new Error('Pendaftaran passkey belum tersedia pada hosting Render.');}
  };
  window.hatchable={auth};
})();
