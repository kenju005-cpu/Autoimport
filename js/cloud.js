(function(){
  const cfg=window.AUTOIMPORT_CONFIG||{};
  const key=cfg.supabasePublishableKey||cfg.supabaseAnonKey||'';
  const enabled=Boolean(cfg.supabaseUrl&&key&&window.supabase?.createClient);
  const client=enabled?window.supabase.createClient(cfg.supabaseUrl,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  const bucket=cfg.documentBucket||'order-documents';
  const LOCAL_LEADS='ai_public_leads_v19', LOCAL_ORDERS='ai_client_orders_demo_v19';

  const statusMap={
    'Encargo recibido':'received','Presupuesto validado':'budget_validated','Buscando':'searching','Opciones encontradas':'options_found',
    'Cliente aprueba':'client_approved','Compra':'purchase','Transporte':'transport','ITV/matriculación':'registration','Entregado':'delivered','Cancelado':'cancelled'
  };
  const normalizeStatus=s=>statusMap[s]||(['received','budget_validated','searching','options_found','client_approved','purchase','transport','registration','delivered','cancelled'].includes(s)?s:'received');
  const clientStatus={received:'Encargo recibido',budget_validated:'Presupuesto validado',searching:'Buscando',options_found:'Opciones encontradas',client_approved:'Cliente aprueba',purchase:'Compra',transport:'Transporte',registration:'ITV/matriculación',delivered:'Entregado',cancelled:'Cancelado'};

  async function currentUser(){if(!client)return null;const {data,error}=await client.auth.getUser();if(error)return null;return data?.user||null}
  async function session(){if(!client)return null;const {data,error}=await client.auth.getSession();if(error)throw error;return data?.session||null}
  async function profile(){if(!client)return {role:'admin',full_name:'Modo local'};const u=await currentUser();if(!u)return null;const {data,error}=await client.from('profiles').select('id,role,full_name,email').eq('id',u.id).maybeSingle();if(error)throw error;return data}
  async function requireRole(allowed){const u=await currentUser();if(!u)return {ok:false,reason:'signed_out',user:null,profile:null};const p=await profile();return p&&allowed.includes(p.role)?{ok:true,user:u,profile:p}:{ok:false,reason:'forbidden',user:u,profile:p}}
  async function signIn(email,password){if(!client)throw new Error('Nube no configurada');return client.auth.signInWithPassword({email,password})}
  async function signUpClient(email,password,fullName,phone,whatsappConsent=false){if(!client)throw new Error('Nube no configurada');return client.auth.signUp({email,password,options:{data:{full_name:String(fullName||'').trim(),phone:String(phone||'').trim(),whatsapp_contact_consent:!!whatsappConsent}}})}
  async function resetPassword(email){if(!client)throw new Error('Nube no configurada');const base=cfg.appBaseUrl||location.origin+location.pathname.replace(/[^/]+$/,'');return client.auth.resetPasswordForEmail(email,{redirectTo:base+'client.html'})}
  async function signOut(){if(client)await client.auth.signOut()}

  async function myClientProfile(){
    if(!client)return null;
    const u=await currentUser();if(!u)return null;
    const {data,error}=await client.from('clients').select('id,auth_user_id,full_name,email,phone,whatsapp_contact_consent,whatsapp_consent_at').eq('auth_user_id',u.id).maybeSingle();
    if(error)throw error;return data;
  }
  async function createLead(payload){
    if(!client){const rows=JSON.parse(localStorage.getItem(LOCAL_LEADS)||'[]');const row={...payload,id:'local-'+Date.now(),created_at:new Date().toISOString()};rows.unshift(row);localStorage.setItem(LOCAL_LEADS,JSON.stringify(rows));return row}
    const u=await currentUser();if(!u)throw new Error('Inicia sesión para enviar la solicitud.');
    const me=await myClientProfile();
    const vehicle=String(payload.vehicle||'').trim();
    const parts=vehicle.split(/\s+/).filter(Boolean);
    const extras=[payload.min_year?`Año mínimo: ${payload.min_year}`:'',payload.max_km?`Km máximos: ${payload.max_km}`:'',payload.message||''].filter(Boolean).join(' · ');
    const clean={auth_user_id:u.id,full_name:String(payload.name||me?.full_name||'').trim()||null,email:String(payload.email||me?.email||u.email||'').trim().toLowerCase()||null,phone:String(payload.phone||me?.phone||'').trim()||null,requested_make:parts[0]||null,requested_model:parts.slice(1).join(' ')||null,max_budget:Number(payload.budget)||null,message:extras||null,source:String(payload.source||'public_simulator'),status:'new',whatsapp_contact_consent:!!(payload.whatsapp_contact_consent??me?.whatsapp_contact_consent),vehicle_snapshot:payload.vehicle_snapshot||null};
    const {data,error}=await client.from('inquiries').insert(clean).select('*').single();if(error)throw error;return data;
  }
  function favoritePayload(vehicle,u){
    const v=vehicle||{}, listingKey=String(v.listing_key||v.id||v.external_listing_id||'').trim();
    if(!listingKey)throw new Error('El vehículo no tiene identificador.');
    return {auth_user_id:u.id,listing_key:listingKey,source_platform:v.source_platform||v.provider||null,source_country:v.source_country||'DE',external_listing_id:v.external_listing_id||v.id||null,original_url:v.original_url||v.url||null,make:v.make||null,model:v.model||null,version:v.version||null,year:Number(v.year)||null,mileage:Number(v.mileage??v.km)||null,price_origin:Number(v.price_origin??v.price)||null,image_url:v.image_url||null,snapshot:v};
  }
  async function saveFavorite(vehicle){if(!client)throw new Error('Nube no configurada');const u=await currentUser();if(!u)throw new Error('Inicia sesión para guardar coches.');const row=favoritePayload(vehicle,u);const {data,error}=await client.from('favorites').upsert(row,{onConflict:'auth_user_id,listing_key'}).select('*').single();if(error)throw error;return data}
  async function removeFavorite(listingKey){if(!client)throw new Error('Nube no configurada');const u=await currentUser();if(!u)throw new Error('Inicia sesión.');const {error}=await client.from('favorites').delete().eq('auth_user_id',u.id).eq('listing_key',String(listingKey));if(error)throw error}
  async function myFavorites(){if(!client)return [];const u=await currentUser();if(!u)return [];const {data,error}=await client.from('favorites').select('*').eq('auth_user_id',u.id).order('created_at',{ascending:false});if(error)throw error;return data||[]}
  }
  async function linkMyOrders(){return 0}

  function requestedVehicle(o){return [o.requested_make,o.requested_model,o.requested_version].filter(Boolean).join(' ')||'Vehículo por definir'}
  function paymentView(p){return {...p,direction:p.recipient_type==='seller'?'to_seller':'to_intermediary',concept:p.notes||({vehicle_to_seller:'Pago directo del vehículo al vendedor',reservation:'Reserva',managed_expenses:'Gastos gestionados',commission:'Comisión',refund:'Reembolso'}[p.payment_type]||p.payment_type)} }
  function proposalView(p){return p?{...p,final_price:p.customer_price,deposit_amount:p.reservation_amount,client_payload:{includes:p.includes_text||'',delivery:p.estimated_delivery||''}}:null}
  function contractView(c){return c?{...c,content:c.terms_text,acceptance_reference:c.id}:null}
  function documentView(d){return {...d,original_name:d.filename,kind:d.document_type,client_visible:d.visible_to_client}}

  async function clientDashboard(){
    if(!client)return {orders:JSON.parse(localStorage.getItem(LOCAL_ORDERS)||'[]')};
    const {data:orders,error}=await client.from('orders').select('*').order('created_at',{ascending:false});if(error)throw error;
    const out=[];
    for(const o of (orders||[])){
      const [{data:props,error:pe},{data:contracts,error:ce},{data:payments,error:pye},{data:docs,error:de},{data:cands,error:cae}]=await Promise.all([
        client.from('proposals').select('*').eq('order_id',o.id).order('created_at',{ascending:false}).limit(1),
        client.from('contracts').select('*').eq('order_id',o.id).order('version',{ascending:false}).limit(1),
        client.from('payments').select('*').eq('order_id',o.id).order('created_at',{ascending:true}),
        client.from('documents').select('*').eq('order_id',o.id).eq('visible_to_client',true).order('created_at',{ascending:false}),
        client.from('vehicle_candidates').select('*').eq('order_id',o.id).eq('visible_to_client',true).order('created_at',{ascending:false})
      ]); if(pe)throw pe;if(ce)throw ce;if(pye)throw pye;if(de)throw de;if(cae)throw cae;
      out.push({id:o.id,reference:o.reference||('ENC-'+o.id.slice(0,8).toUpperCase()),requested_vehicle:requestedVehicle(o),budget:o.max_budget,status:clientStatus[o.status]||o.status,created_at:o.created_at,updated_at:o.updated_at,proposal:proposalView(props?.[0]),contract:contractView(contracts?.[0]),payments:(payments||[]).map(paymentView),documents:(docs||[]).map(documentView),candidates:cands||[]});
    }
    return {orders:out};
  }
  async function myOrders(){const d=await clientDashboard();return (d.orders||[]).map(o=>({id:o.id,reference:o.reference,requested_vehicle:o.requested_vehicle,budget:o.budget,status:o.status,created_at:o.created_at,updated_at:o.updated_at}))}
  async function myOrderBundle(orderId){const d=await clientDashboard();const o=(d.orders||[]).find(x=>x.id===orderId);if(!o)return {order:null,candidates:[],proposals:[],contracts:[],payments:[],documents:[],events:[]};return {order:o,candidates:o.candidates||[],proposals:o.proposal?[o.proposal]:[],contracts:o.contract?[o.contract]:[],payments:o.payments||[],documents:o.documents||[],events:[]}}

  async function adminLeads(){if(!client)return JSON.parse(localStorage.getItem(LOCAL_LEADS)||'[]');const gate=await requireRole(['admin','staff']);if(!gate.ok)throw new Error('Acceso no autorizado');const {data,error}=await client.from('inquiries').select('*').order('created_at',{ascending:false});if(error)throw error;return (data||[]).map(x=>({...x,name:x.full_name,vehicle:[x.requested_make,x.requested_model].filter(Boolean).join(' '),budget:x.max_budget}))}
  async function adminWorkspaceRecords(){if(!client)return [];const gate=await requireRole(['admin','staff']);if(!gate.ok)throw new Error('Acceso no autorizado');const {data,error}=await client.from('order_internal').select('workspace_payload,updated_at').order('updated_at',{ascending:false});if(error)throw error;return (data||[]).map(x=>x.workspace_payload).filter(x=>x&&x.id)}
  async function deleteWorkspaceRecord(externalId){if(!client)return;const gate=await requireRole(['admin','staff']);if(!gate.ok)throw new Error('Acceso no autorizado');const {data:o,error:oe}=await client.from('orders').select('id').eq('external_record_id',externalId).maybeSingle();if(oe)throw oe;if(!o)return;const {error}=await client.from('orders').delete().eq('id',o.id);if(error)throw error}

  async function ensureClient(o, externalId){
    const email=String(o.email||'').trim().toLowerCase()||`sin-email+${String(externalId).replace(/[^a-zA-Z0-9]/g,'').slice(0,24)}@autoimport.local`;
    let {data,error}=await client.from('clients').select('id').eq('email',email).maybeSingle();
    if(error)throw error;
    if(!data){const ins=await client.from('clients').insert({full_name:String(o.client||'Cliente').trim()||'Cliente',email,phone:String(o.phone||'').trim()||null}).select('id').single();if(ins.error)throw ins.error;data=ins.data}
    else {await client.from('clients').update({full_name:String(o.client||'Cliente').trim()||'Cliente',phone:String(o.phone||'').trim()||null}).eq('id',data.id)}
    return data.id;
  }
  async function syncCrmRecord(record){
    if(!client)return {mode:'local'};const gate=await requireRole(['admin','staff']);if(!gate.ok)throw new Error('Acceso no autorizado');
    const o=record.order||{},p=record.proposal||{},c=record.contract||{},externalId=record.id||crypto.randomUUID();
    const clientId=await ensureClient(o,externalId);
    const q=String(o.query||'').trim(), qp=q.split(/\s+/).filter(Boolean);
    const orderPayload={external_record_id:externalId,reference:o.reference||null,client_id:clientId,status:normalizeStatus(o.status),requested_make:qp[0]||null,requested_model:qp.slice(1).join(' ')||null,year_min:+o.minYear||null,mileage_max:+o.maxKm||null,fuel:o.fuel||null,transmission:o.gear||null,body_type:o.body||null,required_equipment:o.equipment||null,max_budget:+o.budget||null,customer_notes:null,updated_at:new Date().toISOString()};
    const {data:ord,error:oe}=await client.from('orders').upsert(orderPayload,{onConflict:'external_record_id'}).select('id').single();if(oe)throw oe;const orderId=ord.id;
    const internal={order_id:orderId,min_profit:+o.minProfit||0,target_profit:+o.targetProfit||0,risk_buffer:+o.operationBuffer||0,internal_notes:o.internalNotes||'',workspace_payload:record,updated_at:new Date().toISOString()};
    let {error}=await client.from('order_internal').upsert(internal,{onConflict:'order_id'});if(error)throw error;

    await client.from('proposals').delete().eq('order_id',orderId);
    let proposalId=null;
    if(p&&Object.keys(p).length&&(+p.finalPrice||p.carId||p.status)){
      const ps={order_id:orderId,status:String(p.status||'').toLowerCase().includes('acept')?'accepted':String(p.status||'').toLowerCase().includes('rechaz')?'rejected':'draft',customer_price:+p.finalPrice||0,reservation_amount:+p.depositAmount||0,includes_text:p.includes||null,estimated_delivery:p.delivery||null,updated_at:new Date().toISOString()};
      const pr=await client.from('proposals').insert(ps).select('id').single();if(pr.error)throw pr.error;proposalId=pr.data.id;
      const pi={proposal_id:proposalId,estimated_profit:Math.max(0,(+p.finalPrice||0)-(+p.operationCost||0)),internal_notes:'Sincronizado desde panel V19',updated_at:new Date().toISOString()};
      const pir=await client.from('proposal_internal').upsert(pi,{onConflict:'proposal_id'});if(pir.error)throw pir.error;
    }

    await client.from('contracts').delete().eq('order_id',orderId);
    if(c&&Object.keys(c).length){const cr=await client.from('contracts').insert({order_id:orderId,proposal_id:proposalId,version:+c.version||1,terms_text:JSON.stringify(c),status:c.acceptedAt?'accepted':'draft',accepted_at:c.acceptedAt||null,accepted_name:c.signerName||null,accepted_version:c.acceptedAt?(+c.version||1):null});if(cr.error)throw cr.error}

    await client.from('payments').delete().eq('order_id',orderId);
    const pays=[];
    (p.paymentPlan||[]).forEach(x=>{if(+x.expected>0)pays.push({order_id:orderId,proposal_id:proposalId,payment_type:String(x.type||'other').toLowerCase().includes('reser')?'reservation':String(x.type||'').toLowerCase().includes('comis')?'commission':'managed_expenses',recipient_type:'business',amount:+x.expected,status:'pending',notes:x.concept||x.type||'Cobro previsto'})});
    (p.payments||[]).forEach(x=>{if(+x.amount>0)pays.push({order_id:orderId,proposal_id:proposalId,payment_type:String(x.concept||'').toLowerCase().includes('reser')?'reservation':String(x.concept||'').toLowerCase().includes('comis')?'commission':'managed_expenses',recipient_type:'business',amount:+x.amount,status:'paid',method:x.method||null,reference:x.reference||null,paid_at:x.date?new Date(x.date).toISOString():new Date().toISOString(),notes:x.concept||'Pago'})});
    if(+p.sellerPayment?.amount>0)pays.push({order_id:orderId,proposal_id:proposalId,payment_type:'vehicle_to_seller',recipient_type:'seller',amount:+p.sellerPayment.amount,status:['Pagado al vendedor','Confirmado por vendedor'].includes(p.sellerPayment.status)?'paid':'pending',method:'Transferencia directa',reference:p.sellerPayment.reference||null,paid_at:p.sellerPayment.date?new Date(p.sellerPayment.date).toISOString():null,external_payment:true,notes:'Pago directo del vehículo al vendedor'});
    if(pays.length){const rr=await client.from('payments').insert(pays);if(rr.error)throw rr.error}
    return {mode:'cloud',orderId};
  }
  async function orderIdForExternal(externalId){if(!client)return null;const {data,error}=await client.from('orders').select('id').eq('external_record_id',externalId).maybeSingle();if(error)throw error;return data?.id||null}
  async function uploadOrderDocument(externalId,file,kind='otro',clientVisible=false){if(!client)throw new Error('Nube no configurada');const gate=await requireRole(['admin','staff']);if(!gate.ok)throw new Error('Acceso no autorizado');const orderId=await orderIdForExternal(externalId);if(!orderId)throw new Error('Sincroniza primero el encargo con la nube.');const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=`${orderId}/staff/${crypto.randomUUID()}-${safe}`;let {error}=await client.storage.from(bucket).upload(path,file,{upsert:false});if(error)throw error;({error}=await client.from('documents').insert({order_id:orderId,uploaded_by:gate.user.id,document_type:kind,filename:file.name,storage_path:path,mime_type:file.type||null,size_bytes:file.size||null,visible_to_client:!!clientVisible}));if(error){await client.storage.from(bucket).remove([path]);throw error}return {path}}
  async function clientDocumentUrl(documentId){if(!client)throw new Error('Nube no configurada');const {data,error}=await client.from('documents').select('storage_path').eq('id',documentId).maybeSingle();if(error)throw error;if(!data)throw new Error('Documento no disponible');const {data:signed,error:se}=await client.storage.from(bucket).createSignedUrl(data.storage_path,300);if(se)throw se;return signed.signedUrl}
  async function downloadDocument(path){if(!client)throw new Error('Nube no configurada');const {data,error}=await client.storage.from(bucket).createSignedUrl(path,300);if(error)throw error;return data?.signedUrl}

  window.AutoImportCloud={enabled,client,mode:enabled?'cloud':'local',currentUser,session,profile,requireRole,signIn,signUpClient,resetPassword,signOut,myClientProfile,createLead,saveFavorite,removeFavorite,myFavorites,linkMyOrders,clientDashboard,myOrders,myOrderBundle,adminLeads,adminWorkspaceRecords,deleteWorkspaceRecord,syncCrmRecord,uploadOrderDocument,clientDocumentUrl,downloadDocument};
})();
