// ACCOUNTS & PAYMENTS: sign-in (email, phone), free limits, credits, Razorpay checkout, subscriptions, account panel.
// Supabase and Razorpay are replaced by recording mocks (tests/browser/mocks), so no real accounts are needed.
import fs from 'fs';
import path from 'node:path';
import { pw, LOCAL, ROOT, FX } from './lib.mjs';
const { chromium } = pw;
const T=path.join(path.dirname(new URL(import.meta.url).pathname),'mocks')+'/';
const ROUTES=[['supabase-js@2',T+'mock-supabase.js'],['checkout.razorpay.com',T+'mock-razorpay.js'],...LOCAL.filter(l=>l.file).map(l=>[l.key,l.file])];
let html=fs.readFileSync(path.join(ROOT,'web/index.html'),'utf8');
const CONFIG_JS='window.FILEUTILO_CONFIG={supabaseUrl:"https://proj.supabase.co",supabaseAnonKey:"anon123"};';
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:1000}});
await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('https://app.test/config.js'))return r.fulfill({body:CONFIG_JS,contentType:'text/javascript'});if(u.startsWith('https://app.test/'))return r.fulfill({body:html,contentType:'text/html'});
  for(const [k,p] of ROUTES)if(u.includes(k))return r.fulfill({path:p,contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}});if(u.startsWith('blob:')||u.startsWith('data:'))return r.continue();return r.abort()});
const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));
let np=0,nf=0;const ok=(c,m)=>{console.log((c?'PASS  ':'FAIL  ')+m);c?np++:nf++;if(!c)process.exitCode=1};
const sb=()=>pg.evaluate(()=>window.__sb.calls.map(c=>c[0]+':'+(c[1]&&typeof c[1]==='string'?c[1]:'')));
await pg.goto('https://app.test/index.html#pdf-merge');await pg.waitForTimeout(600);
ok(await pg.textContent('#acctBtn')==='Sign in','signed-out header button');
ok(await pg.isHidden('#authDlg .preview-note'),'no preview note when configured');
// anon limit: 6 files > 5
const pdf=fs.readFileSync(path.join(FX,'canary.pdf'));
const files=Array.from({length:6},(_, i)=>({name:`f${i}.pdf`,mimeType:'application/pdf',buffer:pdf}));
await pg.setInputFiles('#pdf-merge .drop input',files);await pg.click('#pdf-merge .run');await pg.waitForSelector('#limitDlg[open]');
ok((await pg.textContent('#limitDlg')).includes('5 files at a time'),'anon batch limit dialog');
await pg.click('#limitDlg .lim-acts button:has-text("Sign in")');await pg.waitForSelector('#authDlg[open]');
ok(!(await pg.isVisible('#limitDlg[open]')),'limit closed, auth open');
// wrong password
await pg.fill('.a-em','asha@example.com');await pg.fill('.a-pw','wrongpass1');await pg.click('.a-go');await pg.waitForTimeout(200);
ok((await pg.textContent('.a-msg')).includes('Wrong email or password'),'wrong password message');
await pg.fill('.a-pw','rightpass1');await pg.click('.a-go');await pg.waitForTimeout(400);
ok(!(await pg.isVisible('#authDlg[open]')),'auth closed after sign in');
ok((await pg.textContent('#acctBtn')).includes('Free'),'header shows Free plan: '+await pg.textContent('#acctBtn'));
// signed-in: rpc returns cost → credits dialog
await pg.evaluate(()=>window.__sb.rpcQueue.push({ok:false,cost:1,credits:3,reasons:['batch_size'],tasks_today:2},{ok:true,paid:false,cost:1,credits:2,tasks_today:3}));
await pg.click('#pdf-merge .run');await pg.waitForSelector('#limitDlg[open]');
ok((await pg.textContent('#limitDlg .lim-acts')).includes('Use 1 credit (you have 3)'),'credit offer');
await pg.click('#limitDlg .lim-acts button.pri');
await pg.waitForFunction(()=>document.querySelector('#pdf-merge .tout').innerHTML.includes('Download'),null,{timeout:30000});
ok(true,'merge ran after using credit');
const rpcs=await pg.evaluate(()=>window.__sb.calls.filter(c=>c[1]==='use_task').map(c=>c[2]));
ok(rpcs.length===2&&rpcs[0].p_files===6&&!rpcs[0].p_confirm&&rpcs[1].p_confirm,'rpc args '+JSON.stringify(rpcs.map(r=>[r.p_tool,r.p_files,r.p_confirm])));
// not enough credits → buy
await pg.evaluate(()=>{window.__sb.rpcQueue.push({ok:false,cost:4,credits:2,reasons:['daily_tasks','batch_size'],tasks_today:25});
  window.__sb.fnQueue['create-order']=[{key:'rzp_test_x',name:'Kalaburagi Labs',description:'50 credits',amount:4900,currency:'INR',prefill:{},order_id:'order_9'}];
  window.__sb.fnQueue['verify-payment']=[{ok:true,result:'applied',profile:{...window.__sb.profile,credits:52}}];window.__sb.profile.credits=52});
await pg.click('#pdf-merge .run');await pg.waitForSelector('#limitDlg[open]');
const t=await pg.textContent('#limitDlg');ok(t.includes('needs 4 credits; you have 2')&&t.includes('25 free tasks'),'not-enough dialog');
await pg.click('#limitDlg .lim-acts button:has-text("Buy credits")');await pg.waitForTimeout(800);
const rz=await pg.evaluate(()=>({o:window.__rzp.order_id,a:window.__rzp.amount}));ok(rz.o==='order_9'&&rz.a===4900,'razorpay opened with order');
const fns=await pg.evaluate(()=>window.__sb.calls.filter(c=>c[0]==='fn').map(c=>[c[1],c[2]]));
ok(fns[0][1].product==='credits_50'&&fns[1][0]==='verify-payment'&&fns[1][1].razorpay_order_id==='order_9','create+verify '+JSON.stringify(fns));
ok((await pg.textContent('#gmsg')).includes('Added 50 credits'),'toast after payment: '+await pg.textContent('#gmsg'));
// free tool not gated
const before=await pg.evaluate(()=>window.__sb.calls.length);
await pg.evaluate(()=>location.hash='#json');await pg.waitForTimeout(500);
// pricing page + subscription
await pg.evaluate(()=>location.hash='#pricing');await pg.waitForTimeout(200);
ok(await pg.isVisible('#pricing')&&await pg.isHidden('#convert'),'pricing page routed');
ok((await pg.textContent('#pricing .p-pro'))==='₹999','yearly price');
await pg.click('#pricing .o-bm');ok((await pg.textContent('#pricing .p-pro'))==='₹149'&&(await pg.getAttribute('#pricing [data-buy^="pro_"]','data-buy'))==='pro_monthly','monthly toggle');
await pg.evaluate(()=>{window.__sb.fnQueue['create-order']=[{key:'rzp_test_x',name:'Kalaburagi Labs',description:'Pro monthly',prefill:{},subscription_id:'sub_7'}];
  window.__sb.fnQueue['verify-payment']=[{ok:true,profile:{}}];Object.assign(window.__sb.profile,{plan:'pro',pro_until:'2026-12-22T00:00:00Z',subscription_status:'active',razorpay_subscription_id:'sub_7'})});
await pg.click('#pricing [data-buy="pro_monthly"]');await pg.waitForTimeout(900);
ok(await pg.evaluate(()=>window.__rzp.subscription_id==='sub_7'),'subscription checkout');
ok((await pg.textContent('#acctBtn')).includes('Pro'),'header now Pro');
ok((await pg.textContent('#pricing [data-buy^="pro_"]'))==='Your plan','pricing shows current plan');
// paid: no ads, rpc ok
// account dialog
await pg.click('#acctBtn');await pg.waitForSelector('#acctDlg[open]');
const ac=await pg.textContent('#acctDlg');ok(ac.includes('Asha Patil')&&ac.includes('renews')&&ac.includes('Cancel subscription')&&ac.includes('50 credits · ₹49'),'account panel');
await pg.evaluate(()=>{window.__sb.fnQueue['cancel-subscription']=[{ok:true}];window.confirm=()=>true;window.__sb.profile.subscription_status='cancelling'});
await pg.click('.ac-cancel');await pg.waitForTimeout(400);
ok((await pg.textContent('#acctDlg .ac-msg')).includes('won’t renew'),'cancel subscription');
await pg.click('.ac-danger summary');await pg.fill('.ac-del','delete');await pg.click('.ac-delgo');ok((await pg.textContent('#acctDlg .ac-msg')).includes('Type DELETE'),'delete needs DELETE');
await pg.evaluate(()=>window.__sb.fnQueue['delete-account']=[{status:502,error:'Couldn’t cancel your subscription'}]);
await pg.fill('.ac-del','DELETE');await pg.click('.ac-delgo');await pg.waitForTimeout(300);ok((await pg.textContent('#acctDlg .ac-msg')).includes('Couldn’t cancel'),'delete error surfaced');
await pg.evaluate(()=>window.__sb.fnQueue['delete-account']=[{ok:true}]);await pg.click('.ac-delgo');await pg.waitForTimeout(400);
ok((await pg.textContent('#acctBtn'))==='Sign in','signed out after delete');
// phone OTP + intent
await pg.evaluate(()=>{window.__sb.profile=Object.assign(window.__sb.profile,{plan:'free',pro_until:null,subscription_status:null,razorpay_subscription_id:null});
  window.__sb.fnQueue['create-order']=[{key:'k',name:'n',description:'Lifetime',amount:299900,currency:'INR',prefill:{},order_id:'order_L'}];window.__sb.fnQueue['verify-payment']=[{ok:true}]});
await pg.click('#pricing [data-buy="lifetime"]');await pg.waitForSelector('#authDlg[open]');
ok((await pg.textContent('#authDlg .a-sub')).includes('checkout'),'buy while signed out asks to sign up');
await pg.click('.a-t-phone');await pg.fill('.a-ph','098450 12345');await pg.click('.a-send');await pg.waitForTimeout(200);
await pg.fill('.a-otp','123456');await pg.click('.a-send');await pg.waitForTimeout(900);
const calls=await pg.evaluate(()=>window.__sb.calls.filter(c=>['otp','verify'].includes(c[0])||c[1]==='create-order').map(c=>c[0]+' '+(c[1]&&c[1].phone||c[1])+' '+JSON.stringify(c[2]||'')));
ok(calls.some(c=>c.startsWith('otp +919845012345'))&&calls.some(c=>c.includes('lifetime')),'OTP then resumed lifetime checkout '+JSON.stringify(calls));
// legal page config
ok((await pg.evaluate(()=>{location.hash='#privacy';return document.querySelector('#privacy .l-brand').textContent}))==='Kalaburagi Labs','legal page');
// google + signup + reset
await pg.evaluate(()=>window.__sb.session=null);
ok(!errs.length,'no script errors '+errs.join(' / '));
await b.close();
console.log(`\naccounts: ${np} passed, ${nf} failed, 0 skipped`);
