import fs from 'node:fs'; import path from 'node:path'; import { pw, ROOT } from './lib.mjs';
const [,, dir, w, h, out, pathname='/', scrollSel=''] = process.argv;
const SITE=path.join(ROOT,dir);const b=await pw.chromium.launch();
const ctx=await b.newContext({viewport:{width:+w,height:+h}});
await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.host==='www.fileutilo.com'){let f=u.pathname==='/'?'index.html':u.pathname.slice(1);if(!f.includes('.'))f+='.html';const p=path.join(SITE,f);if(fs.existsSync(p))return r.fulfill({path:p});return r.fulfill({status:404,body:''})}
 if(/fonts\.(googleapis|gstatic)/.test(u.host))return r.continue();return r.abort()});
const pg=await ctx.newPage();await pg.goto('https://www.fileutilo.com'+pathname);await pg.waitForTimeout(1200);
await pg.evaluate(()=>{const g=document.getElementById('gmsg');if(g)g.style.display='none';document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')});
if(scrollSel) await pg.evaluate(s=>document.querySelector(s).scrollIntoView(),scrollSel);
await pg.waitForTimeout(800);
await pg.screenshot({path:out});
await ctx.close();await b.close();
