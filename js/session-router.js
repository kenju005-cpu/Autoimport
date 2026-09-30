(function(){
 const $=id=>document.getElementById(id);
 async function route(){
   const cloud=window.AutoImportCloud;
   if(!cloud?.enabled)return;
   const user=await cloud.currentUser();
   if(!user)return;
   const p=await cloud.profile();
   const isStaff=['admin','staff'].includes(p?.role);
   if(isStaff){
     if(new URLSearchParams(location.search).get('public')!=='1'){
       location.replace('admin.html'); return;
     }
     $('clientNavLink')?.classList.add('hidden');
     $('adminNavLink')?.classList.remove('hidden');
     const mode=$('cloudMode'); if(mode)mode.textContent=`Admin · ${user.email}`;
   } else {
     const mode=$('cloudMode'); if(mode)mode.textContent='Sesión cliente';
   }
 }
 window.addEventListener('DOMContentLoaded',()=>route().catch(()=>{}));
})();
