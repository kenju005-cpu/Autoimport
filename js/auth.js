(function(){
 const $=id=>document.getElementById(id);
 const page=document.body.dataset.authPage||'client';
 function showApp(){ $('authGate')?.classList.add('hidden'); $('privateApp')?.classList.remove('hidden'); }
 function showGate(msg){ $('authGate')?.classList.remove('hidden'); $('privateApp')?.classList.add('hidden'); if(msg && $('loginError')) $('loginError').textContent=msg; }
 function setIdentity(user,profile){
   document.querySelectorAll('[data-user-email]').forEach(el=>el.textContent=user?.email||profile?.email||'');
   document.querySelectorAll('[data-user-role]').forEach(el=>el.textContent=profile?.role||'');
 }
 async function routeAuthorizedUser(user,profile){
   if(page==='client' && ['admin','staff'].includes(profile?.role)){
     location.replace('admin.html');
     return true;
   }
   return false;
 }
 async function authorize(){
   const cloud=window.AutoImportCloud;
   const badge=$('authMode'); if(!cloud||!badge)return;
   badge.textContent=cloud.enabled?'Acceso protegido con Supabase':'Modo local de desarrollo';
   if(!cloud.enabled){
     document.querySelector('.cloud-only')?.classList.add('hidden'); document.querySelector('.local-only')?.classList.remove('hidden');
     $('enterLocal')?.addEventListener('click',()=>showApp()); return;
   }
   const user=await cloud.currentUser();
   if(!user){ showGate(); return; }
   const p=await cloud.profile();
   if(await routeAuthorizedUser(user,p)) return;
   if(page==='admin' && !['admin','staff'].includes(p?.role)){
     showGate('Esta cuenta no tiene permisos para entrar al panel interno.'); return;
   }
   setIdentity(user,p); showApp(); window.dispatchEvent(new CustomEvent('autoimport:authorized',{detail:{user,profile:p}}));
 }
 async function login(e){
   e.preventDefault(); const cloud=window.AutoImportCloud; $('loginError').textContent='';
   const {data,error}=await cloud.signIn($('loginEmail').value,$('loginPassword').value);
   if(error){$('loginError').textContent=error.message;return;}
   const user=data?.user||await cloud.currentUser();
   const p=await cloud.profile();
   if(await routeAuthorizedUser(user,p)) return;
   if(page==='admin' && !['admin','staff'].includes(p?.role)){
     await cloud.signOut(); $('loginError').textContent='La cuenta es válida, pero no tiene permiso de administrador.'; return;
   }
   setIdentity(user,p); showApp(); window.dispatchEvent(new CustomEvent('autoimport:authorized',{detail:{user,profile:p}}));
 }
 async function logout(){ await window.AutoImportCloud.signOut(); location.replace('index.html'); }
 async function signup(){
   const email=$('signupEmail')?.value, pass=$('signupPassword')?.value, name=$('signupName')?.value;
   const out=$('signupStatus'); if(out) out.textContent='';
   if(!email||!pass||pass.length<8){if(out)out.textContent='Usa un email válido y una contraseña de al menos 8 caracteres.';return;}
   const {data,error}=await window.AutoImportCloud.signUpClient(email,pass,name);
   if(error){if(out)out.textContent=error.message;return;}
   if(data?.session){
     const p=await window.AutoImportCloud.profile();
     if(await routeAuthorizedUser(data.user,p))return;
     if(out)out.textContent='Cuenta creada y sesión iniciada.'; setIdentity(data.user,p); showApp(); window.dispatchEvent(new CustomEvent('autoimport:authorized',{detail:{user:data.user,profile:p}}));
   } else if(out) out.textContent='Cuenta creada. Revisa tu email si Supabase exige confirmación.';
 }
 async function reset(){
   const email=$('loginEmail')?.value; if(!email){$('loginError').textContent='Escribe primero tu email.';return;}
   const {error}=await window.AutoImportCloud.resetPassword(email); $('loginError').textContent=error?error.message:'Te hemos enviado las instrucciones de recuperación.';
 }
 window.addEventListener('DOMContentLoaded',()=>{
   const q=new URLSearchParams(location.search); const pre=q.get('email'); if(pre){if($('loginEmail'))$('loginEmail').value=pre;if($('signupEmail'))$('signupEmail').value=pre;}
   $('loginForm')?.addEventListener('submit',login); $('logoutBtn')?.addEventListener('click',logout); document.querySelectorAll('[data-signout]').forEach(b=>b.addEventListener('click',logout)); $('signupBtn')?.addEventListener('click',signup); $('resetPasswordBtn')?.addEventListener('click',reset); authorize().catch(e=>showGate(e.message));
 });
})();
