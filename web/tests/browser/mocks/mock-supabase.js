(function(){
  const log=window.__sb={calls:[],rpcQueue:[],fnQueue:{},session:null,profile:{id:'u1',full_name:'Asha Patil',plan:'free',credits:3,pro_until:null,subscription_status:null,razorpay_subscription_id:null},usage:{tasks:2,ocr_pages:0},listeners:[]};
  const emit=(ev)=>log.listeners.forEach(f=>f(ev,log.session));
  const user={id:'u1',email:'asha@example.com',phone:''};
  const q=(table)=>{const b={_t:table,select(){return b},eq(){return b},order(){return b},limit(){return Promise.resolve({data:table==='payments'?[{product:'credits_50',amount_paise:4900,status:'paid',paid_at:'2026-11-20T10:00:00Z'}]:null})},
    maybeSingle(){log.calls.push(['from',table]);return Promise.resolve({data:table==='profiles'?log.profile:table==='usage_daily'?log.usage:null})}};return b};
  window.supabase={createClient(url,key,opts){log.calls.push(['createClient',url,key]);return {
    auth:{onAuthStateChange(f){log.listeners.push(f);return {data:{subscription:{unsubscribe(){}}}}},
      getSession:async()=>({data:{session:log.session}}),
      signInWithPassword:async({email,password})=>{log.calls.push(['signIn',email]);if(password==='wrongpass1')return {error:{message:'Invalid login credentials'}};log.session={user};emit('SIGNED_IN');return {data:{session:log.session},error:null}},
      signUp:async(a)=>{log.calls.push(['signUp',a.email,a.options.data.full_name]);return {data:{session:null},error:null}},
      signInWithOAuth:async(a)=>{log.calls.push(['oauth',a.provider,a.options.redirectTo]);return {error:null}},
      resetPasswordForEmail:async(e)=>{log.calls.push(['reset',e]);return {error:null}},
      signInWithOtp:async(a)=>{log.calls.push(['otp',a.phone]);return {error:null}},
      verifyOtp:async(a)=>{log.calls.push(['verify',a.phone,a.token]);log.session={user:{id:'u1',phone:a.phone.slice(1)}};emit('SIGNED_IN');return {error:null}},
      updateUser:async(a)=>{log.calls.push(['updateUser']);return {error:null}},
      signOut:async()=>{log.calls.push(['signOut']);log.session=null;emit('SIGNED_OUT');return {error:null}}},
    from:q,
    rpc:async(name,args)=>{log.calls.push(['rpc',name,args]);const r=log.rpcQueue.shift()||{ok:true,paid:false,cost:0,credits:log.profile.credits,tasks_today:3};return {data:r,error:null}},
    functions:{invoke:async(name,{body})=>{log.calls.push(['fn',name,body]);const r=(log.fnQueue[name]||[]).shift();if(r&&r.status)return {data:null,error:{message:'Edge Function returned a non-2xx status code',context:{json:async()=>({error:r.error})}}};return {data:r||{ok:true},error:null}}}
  }}};
})();
