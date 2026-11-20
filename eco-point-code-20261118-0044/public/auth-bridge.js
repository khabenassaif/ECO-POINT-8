/* Eco-Point same-origin authentication bridge for Vercel/Neon.
   Student pages continue using the verified server session in an HttpOnly cookie.
   Password signup/login are available while email OTP remains optional. */
(function(){
  async function request(path,method='GET',data){
    const r=await fetch(path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,cache:'no-store'});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw Object.assign(new Error(j.error||j.message||'Permintaan gagal.'),{status:r.status});
    return j;
  }
  window.hatchable={auth:{
    getSession:()=>request('/api/auth/session'),
    providers:async()=>['password'],
    supportsPasskeys:()=>false,
    attachPasskeyAutofill:async()=>null,
    loginPassword:({email,password})=>request('/api/auth/password/login','POST',{email,password}),
    registerPassword:({email,password,name})=>request('/api/auth/password/register','POST',{email,password,name}),
    startLogin:({email})=>request('/api/auth/login/start','POST',{email}),
    verifyCode:({email,code})=>request('/api/auth/login/verify','POST',{email,code}),
    signOut:()=>request('/api/auth/logout','POST',{}),
    signInWithPasskey:async()=>{throw new Error('Passkey belum tersedia. Gunakan kata sandi.')},
    registerPasskey:async()=>{throw new Error('Passkey belum tersedia.')}
  }};
})();