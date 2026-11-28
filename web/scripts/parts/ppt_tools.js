/*ppt-tools:start*/
/* =====================================================================
   POWERPOINT TOOLS — PDF to PowerPoint, compress, slides to images, extract pictures, merge, text & notes.
   A .pptx is a ZIP of XML parts; everything here reads and writes those parts in the browser.
   ===================================================================== */
const PPT_IC='<path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M12 16v4M8 20h8"/>';
const PNS={p:'http://schemas.openxmlformats.org/presentationml/2006/main',a:'http://schemas.openxmlformats.org/drawingml/2006/main',
  r:'http://schemas.openxmlformats.org/officeDocument/2006/relationships',pr:'http://schemas.openxmlformats.org/package/2006/relationships',
  ct:'http://schemas.openxmlformats.org/package/2006/content-types'};
const isPptx=f=>extOf(f.name)==='pptx';
const xmlOf=s=>new DOMParser().parseFromString(s,'application/xml');
const xmlStr=d=>new XMLSerializer().serializeToString(d);
const kidsOf=(el,name)=>el?[...el.children].filter(c=>c.localName===name):[];
const kidOf=(el,name)=>el?[...el.children].find(c=>c.localName===name)||null:null;
const pathOf=(el,...names)=>{let e=el;for(const n of names){e=kidOf(e,n);if(!e)return null}return e};
const partJoin=(from,rel)=>{if(rel.startsWith('/'))return rel.slice(1);const p=from.split('/');p.pop();for(const s of rel.split('/')){if(s==='..')p.pop();else if(s&&s!=='.')p.push(s)}return p.join('/')};
const partRel=(from,to)=>{const a=from.split('/');a.pop();const b=to.split('/');let i=0;while(i<a.length&&i<b.length-1&&a[i]===b[i])i++;return '../'.repeat(a.length-i)+b.slice(i).join('/')};
const relsOf=p=>{const i=p.lastIndexOf('/');return p.slice(0,i+1)+'_rels/'+p.slice(i+1)+'.rels'};
async function pptRels(z,part){const f=z.file(relsOf(part));const m={};if(!f)return m;
  for(const r of xmlOf(await f.async('string')).getElementsByTagName('Relationship')){const ext=r.getAttribute('TargetMode')==='External';
    m[r.getAttribute('Id')]={type:(r.getAttribute('Type')||'').split('/').pop(),target:ext?null:partJoin(part,r.getAttribute('Target')),ext}}return m}
async function openPptx(f){await need('JSZip');const head=new Uint8Array(await f.slice(0,8).arrayBuffer());
  if(head[0]===0xD0&&head[1]===0xCF)throw new Error(`${f.name} is password-protected or an old PowerPoint 97–2003 file. Remove the password, or open it in PowerPoint and save it as .pptx, then try again.`);
  let z;try{z=await JSZip.loadAsync(await f.arrayBuffer())}catch(e){throw new Error(`${f.name} isn’t a readable PowerPoint (.pptx) file`)}
  if(!z.file('ppt/presentation.xml'))throw new Error(`${f.name} isn’t a PowerPoint (.pptx) file`);return z}
async function pptSlides(z){const pres=xmlOf(await z.file('ppt/presentation.xml').async('string')),rels=await pptRels(z,'ppt/presentation.xml');
  const ids=[...pres.getElementsByTagNameNS(PNS.p,'sldId')];
  return ids.map(e=>{const r=rels[e.getAttributeNS(PNS.r,'id')];return r&&r.target}).filter(p=>p&&z.file(p))}
async function pptSize(z){const s=xmlOf(await z.file('ppt/presentation.xml').async('string')).getElementsByTagNameNS(PNS.p,'sldSz')[0];
  return s?{cx:+s.getAttribute('cx'),cy:+s.getAttribute('cy')}:{cx:12192000,cy:6858000}}
const pageList=(spec,n)=>{if(!spec||!spec.trim())return Array.from({length:n},(_,i)=>i);const out=[];
  for(const part of spec.split(',')){const m=part.trim().match(/^(\d+)?\s*(-)?\s*(\d+)?$/);if(!m||(!m[1]&&!m[3]))throw new Error(`“${part.trim()}” isn’t a slide number or range — use e.g. 1-3, 5`);
    const a=m[1]?+m[1]:1,b=m[2]?(m[3]?+m[3]:n):a;for(let i=Math.max(1,a);i<=Math.min(n,b);i++)out.push(i-1)}
  if(!out.length)throw new Error(`No slides in that range — this deck has ${n} slide${n===1?'':'s'}`);return[...new Set(out)]};

/* ---------- text of a shape tree, in reading order ---------- */
function shapeText(root){const out=[];
  const walk=el=>{for(const c of el.children){const n=c.localName;
    if(n==='sp'){const ph=c.getElementsByTagNameNS(PNS.p,'ph')[0],typ=ph?ph.getAttribute('type')||'body':'';
      if(['sldNum','dt','ftr','hdr','sldImg'].includes(typ))continue;
      const tb=kidOf(c,'txBody');if(!tb)continue;const paras=kidsOf(tb,'p').map(p=>{let s='';for(const r of p.children){if(r.localName==='r'||r.localName==='fld')s+=r.textContent;else if(r.localName==='br')s+='\n'}return{t:s,lvl:+((kidOf(p,'pPr')||{getAttribute:()=>0}).getAttribute('lvl')||0)}}).filter(p=>p.t.trim());
      if(paras.length)out.push({title:typ==='title'||typ==='ctrTitle',paras})}
    else if(n==='graphicFrame'){for(const tbl of c.getElementsByTagNameNS(PNS.a,'tbl'))out.push({table:[...tbl.getElementsByTagNameNS(PNS.a,'tr')].map(tr=>kidsOf(tr,'tc').map(tc=>tc.textContent.trim()))})}
    else if(n==='grpSp'||n==='AlternateContent'||n==='Choice')walk(n==='AlternateContent'?(kidOf(c,'Choice')||c):c)}};
  walk(root);return out}
async function deckText(z,{notes=true}={}){const slides=await pptSlides(z),res=[];
  for(const p of slides){const d=xmlOf(await z.file(p).async('string'));const tree=d.getElementsByTagNameNS(PNS.p,'spTree')[0];const items=tree?shapeText(tree):[];
    let title='';const ti=items.findIndex(i=>i.title);if(ti>=0){title=items[ti].paras.map(x=>x.t).join(' ');items.splice(ti,1)}
    let note='';if(notes){const rels=await pptRels(z,p);const nr=Object.values(rels).find(r=>r.type==='notesSlide');
      if(nr&&z.file(nr.target)){const nd=xmlOf(await z.file(nr.target).async('string'));const nt=nd.getElementsByTagNameNS(PNS.p,'spTree')[0];
        note=nt?shapeText(nt).filter(s=>!s.title).map(s=>s.paras?s.paras.map(x=>x.t).join('\n'):'').join('\n').trim():''}}
    res.push({title,items,note,hidden:d.documentElement.getAttribute('show')==='0'})}return res}

INIT['ppt-text']=()=>makeTool('ppt-text',{title:'Slide text & speaker notes',desc:'Copy all the text and speaker notes out of a PowerPoint — slide by slide, as plain text or Markdown.',ic:PPT_IC,
  accept:'.pptx,.ppt',multiple:true,filter:f=>['pptx','ppt'].includes(extOf(f.name)),drop:'Drop PowerPoint files here',action:'Get text',zipName:'slide-text',
  opts:`<label class="field"><span>Format</span><select class="o-f"><option value="txt">Plain text (.txt)</option><option value="md">Markdown (.md)</option></select></label>
   <label class="chk"><input type="checkbox" class="o-n" checked> Include speaker notes</label>
   <label class="chk"><input type="checkbox" class="o-h"> Skip hidden slides</label>`,
  async run(t){const md=t.q('.o-f').value==='md',withNotes=t.q('.o-n').checked,skipHidden=t.q('.o-h').checked,outs=[];let firstText='';
    for(let i=0;i<t.files.length;i++){const f=t.files[i];t.prog(i/t.files.length,`Reading ${f.name}…`);let body='',count=0;
      if(extOf(f.name)==='ppt'){const m=await parsePpt(await f.arrayBuffer(),stemOf(f.name));body=toTxt(m);count=m.blocks.filter(b=>b.t==='h').length}
      else{const z=await openPptx(f);const deck=await deckText(z,{notes:withNotes});
        const L=[];deck.forEach((s,k)=>{if(skipHidden&&s.hidden)return;count++;const head=`Slide ${k+1}${s.title?(md?' — ':': ')+s.title:''}`;
          L.push(md?`## ${head}`:head);
          for(const it of s.items){if(it.table){if(md){const w=Math.max(...it.table.map(r=>r.length));const row=r=>'| '+Array.from({length:w},(_,j)=>(r[j]||'').replace(/\|/g,'\\|').replace(/\n/g,' ')).join(' | ')+' |';
                L.push(row(it.table[0]),'|'+' --- |'.repeat(w),...it.table.slice(1).map(row))}else it.table.forEach(r=>L.push(r.join('\t')))}
            else for(const p of it.paras)L.push(md?`${'  '.repeat(p.lvl)}- ${p.t.replace(/\n/g,' ')}`:`${'  '.repeat(p.lvl)}• ${p.t}`)}
          if(s.note)L.push(md?s.note.split('\n').map(x=>'> '+x).join('\n').replace(/^> /,'> **Notes:** '):'Notes: '+s.note);L.push('')});
        body=(md?`# ${stemOf(f.name)}\n\n`:'')+L.join('\n')}
      if(!body.trim())throw new Error(`No text found in ${f.name} — slides made only of pictures have no text to copy`);
      if(!firstText)firstText=body;
      const o={name:`${stemOf(f.name)}-text.${md?'md':'txt'}`,blob:new Blob([body],{type:md?'text/markdown':'text/plain'})};o.info=`${count} slide${count===1?'':'s'}`;outs.push(o)}
    t._extra=`<div class="pv-text"><button class="btn o-copy" type="button">Copy text</button></div>`;setTimeout(()=>{const b=t.q('.o-copy');if(b)b.onclick=async()=>{try{await navigator.clipboard.writeText(firstText);t.msg('Copied to the clipboard','ok')}catch(e){t.msg('Your browser didn’t allow copying — download the file instead')}}},0);
    return outs}});

INIT['ppt-images']=()=>makeTool('ppt-images',{title:'Extract images from PowerPoint',desc:'Save every picture in a presentation as its original file — no screenshots, no quality loss. Works with Word and Excel files too.',ic:PPT_IC,
  accept:'.pptx,.docx,.xlsx',multiple:true,filter:f=>['pptx','docx','xlsx'].includes(extOf(f.name)),drop:'Drop PowerPoint files here',action:'Extract images',zipName:'images',
  opts:`<label class="chk"><input type="checkbox" class="o-s"> Skip small images (icons under 10 KB)</label>
   <label class="chk"><input type="checkbox" class="o-v" checked> Include videos and sounds</label>`,
  async run(t){await need('JSZip');const skip=t.q('.o-s').checked,av=t.q('.o-v').checked,outs=[];
    const PIC=['png','jpg','jpeg','gif','bmp','tif','tiff','svg','webp','emf','wmf','wdp','jfif'],AV=['mp4','m4v','mov','wmv','avi','mp3','m4a','wav','wma'];
    for(let i=0;i<t.files.length;i++){const f=t.files[i];t.prog(i/t.files.length,`Opening ${f.name}…`);
      let z;try{z=await JSZip.loadAsync(await f.arrayBuffer())}catch(e){throw new Error(`${f.name} is password-protected or isn’t a valid Office file`)}
      const media=Object.keys(z.files).filter(n=>/^(ppt|word|xl)\/media\/[^/]+$/.test(n)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));let k=0;
      for(const n of media){const e=extOf(n);if(!PIC.includes(e)&&!(av&&AV.includes(e)))continue;const b=await z.file(n).async('blob');if(skip&&PIC.includes(e)&&b.size<10240)continue;
        k++;outs.push({name:`${stemOf(f.name)}-${String(k).padStart(2,'0')}.${e==='jpeg'?'jpg':e}`,blob:b})}
      await tick()}
    if(!outs.length)throw new Error('No images found — this file has no pictures, or only very small ones (untick “Skip small images”)');
    const odd=outs.filter(o=>['emf','wmf','wdp'].includes(extOf(o.name))).length;
    if(odd)t._extra=`<p class="note">${odd} picture${odd>1?'s are':' is'} in a Windows drawing format (EMF/WMF/WDP), which opens in Office and Windows apps but not in most browsers.</p>`;
    return outs}});

/* ---------- compress: shrink the pictures inside, then re-pack the ZIP ---------- */
INIT['ppt-compress']=()=>makeTool('ppt-compress',{title:'Compress PowerPoint',desc:'Shrink big presentations for email and uploads by optimising the pictures inside. Slides, text and animations stay as they are.',ic:PPT_IC,
  accept:'.pptx',multiple:true,filter:isPptx,drop:'Drop .pptx files here',action:'Compress',zipName:'compressed',
  opts:`<div class="field"><span>Compression</span><div class="seg o-lv" role="group" aria-label="Compression"><button data-v="light" aria-pressed="false">Light</button><button data-v="rec" aria-pressed="true">Recommended</button><button data-v="strong" aria-pressed="false">Strong</button></div></div>
   <p class="note o-lvn">Pictures up to 1920 px wide at good quality — looks the same on a projector or screen.</p>
   <label class="chk"><input type="checkbox" class="o-png" checked> Turn large photos saved as PNG into JPG (keeps transparent pictures as PNG)</label>`,
  async run(t){await need('JSZip');const lv=(t.q('.o-lv [aria-pressed=true]')||{dataset:{v:'rec'}}).dataset.v,toJpg=t.q('.o-png').checked;
    const L={light:{px:2560,q:.85},rec:{px:1920,q:.75},strong:{px:1280,q:.6}}[lv];const outs=[];
    for(let i=0;i<t.files.length;i++){const f=t.files[i];const z=await openPptx(f);const media=Object.keys(z.files).filter(n=>/^ppt\/media\/[^/]+\.(jpe?g|png|bmp)$/i.test(n));
      let shrunk=0;const renames=[];
      for(let k=0;k<media.length;k++){const n=media[k];t.prog((i+k/Math.max(1,media.length)*.9)/t.files.length,`${f.name}: picture ${k+1} of ${media.length}…`);
        const blob=await z.file(n).async('blob');if(blob.size<30*1024)continue;let bmp;try{bmp=await createImageBitmap(blob)}catch(e){continue}
        const e=extOf(n),s=Math.min(1,L.px/Math.max(bmp.width,bmp.height));const w=Math.max(1,Math.round(bmp.width*s)),h=Math.max(1,Math.round(bmp.height*s));
        const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(bmp,0,0,w,h);bmp.close&&bmp.close();
        let alpha=false;if(e==='png'){const d=g.getImageData(0,0,w,h).data;for(let p=3;p<d.length;p+=16)if(d[p]<250){alpha=true;break}}
        const asJpg=e!=='png'||(toJpg&&!alpha&&blob.size>100*1024);
        if(asJpg&&e==='png'){const j=document.createElement('canvas');j.width=w;j.height=h;const jg=j.getContext('2d');jg.fillStyle='#fff';jg.fillRect(0,0,w,h);jg.drawImage(c,0,0);
          const nb=await canvasBlob(j,'image/jpeg',L.q);if(nb.size<blob.size*.9){let nn=n.replace(/\.png$/i,'.jpeg'),q=2;while(z.file(nn))nn=n.replace(/\.png$/i,`-${q++}.jpeg`);
            z.remove(n);z.file(nn,nb);renames.push([n.split('/').pop(),nn.split('/').pop()]);shrunk++}continue}
        const nb=asJpg?await canvasBlob(c,'image/jpeg',L.q):(s<1?await canvasBlob(c,'image/png'):null);
        if(nb&&nb.size<blob.size*.95){z.file(n,nb);shrunk++}await tick()}
      if(renames.length){for(const rn of Object.keys(z.files).filter(x=>x.endsWith('.rels'))){let x=await z.file(rn).async('string'),ch=false;
          for(const [a,b] of renames){const re=new RegExp(`(Target="[^"]*media/)${a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"`,'g');if(re.test(x)){x=x.replace(re,`$1${b}"`);ch=true}}if(ch)z.file(rn,x)}
        const ct=await z.file('[Content_Types].xml').async('string');if(!/Extension="jpeg"/i.test(ct))z.file('[Content_Types].xml',ct.replace('<Default ','<Default Extension="jpeg" ContentType="image/jpeg"/><Default '))}
      t.prog((i+.95)/t.files.length,`Packing ${f.name}…`);
      const out=await z.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:9},mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
      const keep=out.size>=f.size;const o={name:`${stemOf(f.name)}-compressed.pptx`,blob:keep?f:out};
      o.info=keep?'already optimised — original kept':`${kb(f.size)} → ${kb(out.size)} (−${Math.round((1-out.size/f.size)*100)}%) · ${shrunk} picture${shrunk===1?'':'s'} optimised`;outs.push(o)}
    return outs}});
document.addEventListener('click',e=>{const b=e.target.closest('#ppt-compress .o-lv button');if(!b)return;b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));
  const n=document.querySelector('#ppt-compress .o-lvn');if(n)n.textContent={light:'Pictures up to 2560 px wide at high quality — the smallest change, for print or very large screens.',rec:'Pictures up to 1920 px wide at good quality — looks the same on a projector or screen.',strong:'Pictures up to 1280 px wide — the smallest file, for email and uploads; photos may look a little softer.'}[b.dataset.v]});

/* ---------- merge: copy every slide of the other decks, with their layouts, masters, themes and media ---------- */
async function mergeDecks(files,{ownDesign=true,onP}={}){await need('JSZip');
  const dst=await openPptx(files[0]);const ctDoc=xmlOf(await dst.file('[Content_Types].xml').async('string'));
  const presP='ppt/presentation.xml',pres=xmlOf(await dst.file(presP).async('string')),presRelsDoc=xmlOf(await dst.file(relsOf(presP)).async('string'));
  const prel=presRelsDoc.documentElement;let rid=Math.max(0,...[...prel.children].map(r=>+(r.getAttribute('Id')||'').replace(/\D/g,'')||0));
  const ctHas=(tag,attr,v)=>[...ctDoc.documentElement.children].some(c=>c.localName===tag&&c.getAttribute(attr).toLowerCase()===v.toLowerCase());
  const ctAdd=(tag,attrs)=>{const e=ctDoc.createElementNS(PNS.ct,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);ctDoc.documentElement.appendChild(e)};
  const free=p=>{const m=p.match(/^(.*?)(\d*)(\.[^./]+)$/);let n=+m[2]||1,q;do{q=`${m[1]}${n++}${m[3]}`}while(dst.file(q)||used.has(q));used.add(q);return q};const used=new Set();
  const sz0=await pptSize(dst);let warn='';
  // ids already in use: slides (>=256) and masters/layouts (>= 2^31)
  const sldLst=pres.getElementsByTagNameNS(PNS.p,'sldIdLst')[0]||(()=>{const e=pres.createElementNS(PNS.p,'p:sldIdLst');const ref=pres.getElementsByTagNameNS(PNS.p,'sldSz')[0];pres.documentElement.insertBefore(e,ref);return e})();
  let sid=Math.max(255,...[...sldLst.children].map(e=>+e.getAttribute('id')));
  const mstLst=pres.getElementsByTagNameNS(PNS.p,'sldMasterIdLst')[0];const bigIds=new Set([...mstLst.children].map(e=>+e.getAttribute('id')));
  for(const p of Object.keys(dst.files).filter(n=>/^ppt\/slideMasters\/[^/]+\.xml$/.test(n)))for(const l of xmlOf(await dst.file(p).async('string')).getElementsByTagNameNS(PNS.p,'sldLayoutId'))bigIds.add(+l.getAttribute('id'));
  let bid=Math.max(2147483647,...bigIds);
  // first deck's layouts by type, for "use the first deck's design"
  const dstLayouts={};for(const p of Object.keys(dst.files).filter(n=>/^ppt\/slideLayouts\/[^/]+\.xml$/.test(n))){const ty=xmlOf(await dst.file(p).async('string')).documentElement.getAttribute('type')||'cust';if(!dstLayouts[ty])dstLayouts[ty]=p}
  const firstLayout=dstLayouts.obj||dstLayouts.tx||Object.values(dstLayouts)[0];
  const secLst=pres.getElementsByTagNameNS('http://schemas.microsoft.com/office/powerpoint/2010/main','sectionLst')[0];
  const DROP=['notesSlide','comments','commentAuthors','notesMaster','handoutMaster'];
  for(let d=1;d<files.length;d++){const f=files[d];onP&&onP((d-1)/(files.length-1),`Adding ${f.name}…`);
    const src=await openPptx(f);const sct=xmlOf(await src.file('[Content_Types].xml').async('string'));const sz=await pptSize(src);
    if(Math.abs(sz.cx/sz.cy-sz0.cx/sz0.cy)>.01)warn=`${f.name} has a different slide shape (${(sz.cx/sz.cy).toFixed(2)}:1); its slides keep their positions, so some may look off-centre.`;
    const map=new Map(),started=new Set(),mId={};const slides=await pptSlides(src);const newMasters=[];
    for(const s of slides)map.set(s,free(s.replace(/slide\d+\.xml$/,'slide1.xml')));
    async function copy(sp){if(started.has(sp))return map.get(sp);started.add(sp);const np=map.get(sp)||free(sp);map.set(sp,np);if(/^ppt\/slideMasters\/[^/]+\.xml$/.test(sp))mId[np]=++bid;
      const file=src.file(sp);if(!file)return np;let data=await file.async('uint8array');
      // relationships of this part
      const rf=src.file(relsOf(sp));
      if(rf){const rd=xmlOf(await rf.async('string'));for(const r of [...rd.documentElement.children]){const ty=(r.getAttribute('Type')||'').split('/').pop();
          if(r.getAttribute('TargetMode')==='External')continue;
          if(DROP.includes(ty)&&/^ppt\/slides\//.test(sp)){r.remove();continue}
          const tp=partJoin(sp,r.getAttribute('Target'));
          if(ty==='slide'&&!map.has(tp)){r.remove();continue}   // link to a slide that isn't being copied
          let nt;if(!ownDesign&&ty==='slideLayout'&&/^ppt\/slides\//.test(sp)){const ly=src.file(tp)?xmlOf(await src.file(tp).async('string')).documentElement.getAttribute('type')||'cust':'cust';nt=dstLayouts[ly]||firstLayout}
          else nt=await copy(tp);
          r.setAttribute('Target',partRel(np,nt))}
        dst.file(relsOf(np),xmlStr(rd))}
      if(/^ppt\/slideMasters\/[^/]+\.xml$/.test(sp)){const md=xmlOf(new TextDecoder().decode(data));for(const l of md.getElementsByTagNameNS(PNS.p,'sldLayoutId'))l.setAttribute('id',String(++bid));data=xmlStr(md);newMasters.push(np)}
      dst.file(np,data);
      const ov=[...sct.documentElement.children].find(c=>c.localName==='Override'&&c.getAttribute('PartName').toLowerCase()==='/'+sp.toLowerCase());
      if(ov){if(!ctHas('Override','PartName','/'+np))ctAdd('Override',{PartName:'/'+np,ContentType:ov.getAttribute('ContentType')})}
      else{const e=extOf(np),def=[...sct.documentElement.children].find(c=>c.localName==='Default'&&c.getAttribute('Extension').toLowerCase()===e);if(def&&!ctHas('Default','Extension',e))ctAdd('Default',{Extension:e,ContentType:def.getAttribute('ContentType')})}
      return np}
    const ids=[];for(const s of slides){const np=await copy(s);const id=String(++rid);
      const r=presRelsDoc.createElementNS(PNS.pr,'Relationship');r.setAttribute('Id','rId'+id);r.setAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide');r.setAttribute('Target',np.replace(/^ppt\//,''));prel.appendChild(r);
      const e=pres.createElementNS(PNS.p,'p:sldId');e.setAttribute('id',String(++sid));e.setAttributeNS(PNS.r,'r:id','rId'+id);sldLst.appendChild(e);ids.push(sid)}
    for(const m of newMasters){const id=String(++rid);const r=presRelsDoc.createElementNS(PNS.pr,'Relationship');r.setAttribute('Id','rId'+id);r.setAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster');r.setAttribute('Target',m.replace(/^ppt\//,''));prel.appendChild(r);
      const e=pres.createElementNS(PNS.p,'p:sldMasterId');e.setAttribute('id',String(mId[m]));e.setAttributeNS(PNS.r,'r:id','rId'+id);mstLst.appendChild(e)}
    if(secLst&&ids.length){const P14=secLst.namespaceURI,pf=secLst.prefix||'p14';const sec=pres.createElementNS(P14,pf+':section');sec.setAttribute('name',stemOf(f.name).slice(0,60));
      sec.setAttribute('id','{'+crypto.randomUUID().toUpperCase()+'}');const lst=pres.createElementNS(P14,pf+':sldIdLst');for(const id of ids){const x=pres.createElementNS(P14,pf+':sldId');x.setAttribute('id',String(id));lst.appendChild(x)}sec.appendChild(lst);secLst.appendChild(sec)}}
  dst.file(presP,xmlStr(pres));dst.file(relsOf(presP),xmlStr(presRelsDoc));dst.file('[Content_Types].xml',xmlStr(ctDoc));
  const app=dst.file('docProps/app.xml');if(app){const total=sldLst.children.length;dst.file('docProps/app.xml',(await app.async('string')).replace(/<Slides>\d+<\/Slides>/,`<Slides>${total}</Slides>`))}
  const blob=await dst.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6},mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
  return{blob,slides:sldLst.children.length,warn}}
INIT['ppt-merge']=()=>makeTool('ppt-merge',{title:'Merge PowerPoint files',desc:'Combine several presentations into one deck, in the order you choose. Slides keep their pictures, layouts and animations.',ic:PPT_IC,
  accept:'.pptx',multiple:true,reorder:true,min:2,filter:isPptx,drop:'Drop .pptx files here',action:'Merge presentations',zipName:'merged',
  opts:`<label class="field"><span>File name</span><input type="text" class="o-name" value="merged" spellcheck="false"></label>
   <fieldset class="field"><legend>Design</legend><label class="chk"><input type="radio" name="pm-d" value="own" checked> Keep each presentation’s own design</label>
   <label class="chk"><input type="radio" name="pm-d" value="first"> Use the first presentation’s design for every slide</label></fieldset>`,
  note:'Speaker notes and comments of the second and later presentations are not carried over.',
  async run(t){const own=t.q('[name=pm-d]:checked').value==='own';const r=await mergeDecks(t.files,{ownDesign:own,onP:(p,l)=>t.prog(p*.9,l)});
    t.prog(.97,'Saving…');if(r.warn)t._extra=`<p class="note">${esc(r.warn)}</p>`;
    const o={name:(t.q('.o-name').value.trim()||'merged').replace(/\.pptx$/i,'')+'.pptx',blob:r.blob};o.info=`${r.slides} slides`;return[o]}});

/* ---------- slide renderer: draws a slide from its XML onto a canvas ---------- */
const EMU_PT=12700;
async function pptRenderer(z){const size=await pptSize(z),slides=await pptSlides(z),xml={},rels={},imgs={};
  const getXml=async p=>{if(!(p in xml))xml[p]=z.file(p)?xmlOf(await z.file(p).async('string')):null;return xml[p]};
  const getRels=async p=>{if(!(p in rels))rels[p]=await pptRels(z,p);return rels[p]};
  const getImg=async p=>{if(!(p in imgs)){imgs[p]=null;const f=z.file(p);if(f){try{const b=await f.async('blob');const e=extOf(p);
      imgs[p]=await createImageBitmap(e==='svg'?new Blob([await b.text()],{type:'image/svg+xml'}):b)}catch(e){try{imgs[p]=await loadImage(new File([await f.async('blob')],p.split('/').pop()))}catch(x){imgs[p]=null}}}}return imgs[p]};
  async function chain(sp){const r=await getRels(sp);const lp=(Object.values(r).find(x=>x.type==='slideLayout')||{}).target;
    const lr=lp?await getRels(lp):{};const mp=(Object.values(lr).find(x=>x.type==='slideMaster')||{}).target;const mr=mp?await getRels(mp):{};
    const tp=(Object.values(mr).find(x=>x.type==='theme')||{}).target;return{slide:sp,layout:lp,master:mp,theme:tp}}
  function themeOf(td){const C={},F={major:'Calibri',minor:'Calibri'};if(!td)return{C,F};
    const cs=td.getElementsByTagNameNS(PNS.a,'clrScheme')[0];if(cs)for(const c of cs.children){const v=c.firstElementChild;if(!v)continue;C[c.localName]=v.localName==='sysClr'?(v.getAttribute('lastClr')||'000000'):(v.getAttribute('val')||'000000')}
    const mj=td.getElementsByTagNameNS(PNS.a,'majorFont')[0],mn=td.getElementsByTagNameNS(PNS.a,'minorFont')[0];
    if(mj&&kidOf(mj,'latin'))F.major=kidOf(mj,'latin').getAttribute('typeface')||F.major;if(mn&&kidOf(mn,'latin'))F.minor=kidOf(mn,'latin').getAttribute('typeface')||F.minor;return{C,F}}
  const PRST={black:'000000',white:'FFFFFF',red:'FF0000',green:'008000',blue:'0000FF',yellow:'FFFF00',gray:'808080',grey:'808080',orange:'FFA500'};
  function color(el,T,ph){if(!el)return null;let hex=null;const v=el;
    if(v.localName==='srgbClr')hex=v.getAttribute('val');else if(v.localName==='sysClr')hex=v.getAttribute('lastClr')||'000000';else if(v.localName==='prstClr')hex=PRST[v.getAttribute('val')]||'000000';
    else if(v.localName==='scrgbClr')hex=[v.getAttribute('r'),v.getAttribute('g'),v.getAttribute('b')].map(x=>Math.round(Math.min(1,(+x||0)/1e5)*255).toString(16).padStart(2,'0')).join('');
    else if(v.localName==='schemeClr'){let k=v.getAttribute('val');if(k==='phClr')return ph||null;k=(T.M&&T.M[k])||{bg1:'lt1',tx1:'dk1',bg2:'lt2',tx2:'dk2'}[k]||k;hex=T.C[k]||'000000'}
    if(!hex)return null;let r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16),a=1;
    for(const m of v.children){const val=+m.getAttribute('val')/1e5;
      if(m.localName==='alpha')a=val;else if(m.localName==='tint'){[r,g,b]=[r,g,b].map(c=>toS(toL(c)*val+(1-val)))}else if(m.localName==='shade'){[r,g,b]=[r,g,b].map(c=>toS(toL(c)*val))}
      else if(m.localName==='lumMod'||m.localName==='lumOff'){let [h,s,l]=rgb2hsl(r,g,b);l=m.localName==='lumMod'?l*val:Math.min(1,l+val);[r,g,b]=hsl2rgb(h,s,l)}}
    return`rgba(${Math.round(Math.max(0,Math.min(255,r)))},${Math.round(Math.max(0,Math.min(255,g)))},${Math.round(Math.max(0,Math.min(255,b)))},${a})`}
  const toL=c=>{c=Math.max(0,Math.min(255,c))/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)},toS=l=>{l=Math.max(0,Math.min(1,l));return 255*(l<=.0031308?l*12.92:1.055*Math.pow(l,1/2.4)-.055)};
  function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0;const l=(mx+mn)/2;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6}return[h,s,l]}
  function hsl2rgb(h,s,l){if(!s)return[l*255,l*255,l*255];const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;const f=t=>{if(t<0)t+=1;if(t>1)t-=1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p};return[f(h+1/3)*255,f(h)*255,f(h-1/3)*255]}
  const clrIn=(el,T,ph)=>{const c=el&&[...el.children].find(x=>/Clr$/.test(x.localName));return c?color(c,T,ph):null};
  function fillOf(spPr,T,style,ph){// returns {color}|{grad}|{blip}|null(no fill)|undefined(not set)
    if(spPr){for(const c of spPr.children){if(c.localName==='noFill')return null;if(c.localName==='solidFill')return{color:clrIn(c,T,ph)};
      if(c.localName==='gradFill'){const st=[...c.getElementsByTagNameNS(PNS.a,'gs')].map(g=>({pos:+g.getAttribute('pos')/1e5,c:clrIn(g,T,ph)})).sort((a,b)=>a.pos-b.pos);const lin=kidOf(c,'lin');return{grad:st,ang:lin?+lin.getAttribute('ang')/6e4:90}}
      if(c.localName==='blipFill')return{blip:c}}}
    if(style){const fr=kidOf(style,'fillRef');if(fr&&+fr.getAttribute('idx')>0)return{color:clrIn(fr,T)}}return undefined}
  async function paintFill(g,f,x,y,w,h,path,relsMap){if(!f)return;g.save();path();
    if(f.color){g.fillStyle=f.color;g.fill()}else if(f.grad&&f.grad.length){const a=(f.ang||0)*Math.PI/180,cx=x+w/2,cy=y+h/2,dx=Math.cos(a)*w/2,dy=Math.sin(a)*h/2;const gr=g.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);f.grad.forEach(s=>gr.addColorStop(Math.max(0,Math.min(1,s.pos)),s.c||'#fff'));g.fillStyle=gr;g.fill()}
    else if(f.blip){const b=kidOf(f.blip,'blip'),id=b&&b.getAttributeNS(PNS.r,'embed');const r=relsMap&&id&&relsMap[id];const im=r&&r.target?await getImg(r.target):null;if(im){g.clip();g.drawImage(im,x,y,w,h)}}
    g.restore()}
  function geomPath(g,prst,x,y,w,h){g.beginPath();const p=prst||'rect';
    if(p==='ellipse'||p==='flowChartConnector')g.ellipse(x+w/2,y+h/2,Math.abs(w/2),Math.abs(h/2),0,0,Math.PI*2);
    else if(p==='roundRect'||p==='flowChartAlternateProcess'){const r=Math.min(Math.abs(w),Math.abs(h))*.1667;g.roundRect?g.roundRect(x,y,w,h,r):g.rect(x,y,w,h)}
    else if(p==='triangle'){g.moveTo(x+w/2,y);g.lineTo(x+w,y+h);g.lineTo(x,y+h);g.closePath()}
    else if(p==='rtTriangle'){g.moveTo(x,y);g.lineTo(x+w,y+h);g.lineTo(x,y+h);g.closePath()}
    else if(p==='diamond'||p==='flowChartDecision'){g.moveTo(x+w/2,y);g.lineTo(x+w,y+h/2);g.lineTo(x+w/2,y+h);g.lineTo(x,y+h/2);g.closePath()}
    else if(p==='rightArrow'){const t=h*.25;g.moveTo(x,y+t);g.lineTo(x+w-h/2,y+t);g.lineTo(x+w-h/2,y);g.lineTo(x+w,y+h/2);g.lineTo(x+w-h/2,y+h);g.lineTo(x+w-h/2,y+h-t);g.lineTo(x,y+h-t);g.closePath()}
    else if(p==='leftArrow'){const t=h*.25;g.moveTo(x+w,y+t);g.lineTo(x+h/2,y+t);g.lineTo(x+h/2,y);g.lineTo(x,y+h/2);g.lineTo(x+h/2,y+h);g.lineTo(x+h/2,y+h-t);g.lineTo(x+w,y+h-t);g.closePath()}
    else if(p==='chevron'||p==='homePlate'){const t=Math.min(w,h)/2;g.moveTo(x,y);g.lineTo(x+w-t,y);g.lineTo(x+w,y+h/2);g.lineTo(x+w-t,y+h);g.lineTo(x,y+h);if(p==='chevron')g.lineTo(x+t,y+h/2);g.closePath()}
    else if(p==='line'||p==='straightConnector1'||/Connector/.test(p)){g.moveTo(x,y);g.lineTo(x+w,y+h)}
    else g.rect(x,y,w,h)}
  // text style inheritance: own lstStyle → layout placeholder → master placeholder → master text styles
  function phKey(sp){const ph=sp&&sp.getElementsByTagNameNS(PNS.p,'ph')[0];return ph?{type:ph.getAttribute('type')||'body',idx:ph.getAttribute('idx')}:null}
  function findPh(doc,k){if(!doc||!k)return null;const all=[...doc.getElementsByTagNameNS(PNS.p,'sp')].filter(s=>s.getElementsByTagNameNS(PNS.p,'ph')[0]);
    const norm=t=>t==='ctrTitle'?'title':t==='subTitle'?'body':t;
    return all.find(s=>{const q=phKey(s);return k.idx!=null&&q.idx===k.idx&&k.type!=='title'})||all.find(s=>norm(phKey(s).type)===norm(k.type))||(k.type==='obj'||k.type==='body'?all.find(s=>phKey(s).type==='body'):null)}
  const xfrmOf=sp=>{const x=sp&&(pathOf(sp,'spPr','xfrm')||pathOf(sp,'grpSpPr','xfrm')||pathOf(sp,'xfrm'));if(!x)return null;const o=kidOf(x,'off'),e=kidOf(x,'ext');if(!o||!e)return null;
    return{x:+o.getAttribute('x'),y:+o.getAttribute('y'),w:+e.getAttribute('cx'),h:+e.getAttribute('cy'),rot:+(x.getAttribute('rot')||0)/6e4,fh:x.getAttribute('flipH')==='1',fv:x.getAttribute('flipV')==='1'}};
  function lvlProps(lst,l){if(!lst)return null;return kidOf(lst,`lvl${l+1}pPr`)}
  function mergeRun(base,el){if(!el)return base;const o={...base};if(el.getAttribute('sz'))o.sz=+el.getAttribute('sz')/100;if(el.getAttribute('b')!=null)o.b=el.getAttribute('b')==='1';if(el.getAttribute('i')!=null)o.i=el.getAttribute('i')==='1';
    const sf=kidOf(el,'solidFill');if(sf)o.colEl=sf;const lt=kidOf(el,'latin');if(lt&&lt.getAttribute('typeface'))o.face=lt.getAttribute('typeface');if(el.getAttribute('cap')==='all')o.caps=true;return o}
  function mergePara(base,el){if(!el)return base;const o={...base};if(el.getAttribute('algn'))o.algn=el.getAttribute('algn');if(el.getAttribute('marL'))o.marL=+el.getAttribute('marL');if(el.getAttribute('indent'))o.indent=+el.getAttribute('indent');
    if(kidOf(el,'buNone'))o.bu=null;const bc=kidOf(el,'buChar');if(bc)o.bu=bc.getAttribute('char');if(kidOf(el,'buAutoNum'))o.bu='#';
    const sb=pathOf(el,'spcBef','spcPts');if(sb){o.spcBef=+sb.getAttribute('val')/100;o.befPct=null}const sbp=pathOf(el,'spcBef','spcPct');if(sbp){o.befPct=+sbp.getAttribute('val')/1e5}
    const sa=pathOf(el,'spcAft','spcPts');if(sa)o.spcAft=+sa.getAttribute('val')/100;
    const ls=pathOf(el,'lnSpc','spcPct');if(ls)o.lnSpc=+ls.getAttribute('val')/1e5;o.run=mergeRun(o.run||{},kidOf(el,'defRPr'));return o}
  async function drawText(g,sp,box,ctx,S){const tb=kidOf(sp,'txBody');if(!tb)return;const ps=kidsOf(tb,'p');if(!ps.some(p=>p.textContent.trim()))return;
    const T=ctx.T,k=phKey(sp),kind=!k?'other':(k.type==='title'||k.type==='ctrTitle')?'title':'body';
    const lph=k?findPh(ctx.layoutDoc,k):null,mph=k?findPh(ctx.masterDoc,k):null;
    const tx=ctx.masterDoc&&ctx.masterDoc.getElementsByTagNameNS(PNS.p,'txStyles')[0];const mst=tx?kidOf(tx,kind==='title'?'titleStyle':kind==='body'?'bodyStyle':'otherStyle'):null;
    const bp=kidOf(tb,'bodyPr')||{getAttribute:()=>null};const bpL=lph&&pathOf(lph,'txBody','bodyPr'),bpM=mph&&pathOf(mph,'txBody','bodyPr');
    const battr=n=>bp.getAttribute(n)??(bpL&&bpL.getAttribute(n))??(bpM&&bpM.getAttribute(n));
    const ins=(n,d)=>+(battr(n)??d);const L=ins('lIns',91440),R=ins('rIns',91440),Tp=ins('tIns',45720),B=ins('bIns',45720);
    const anchor=battr('anchor')||(kind==='title'?'ctr':'t'),wrap=battr('wrap')!=='none',vert=battr('vert');if(vert&&vert!=='horz')return;
    const na=kidOf(bp,'normAutofit')||(bpL&&kidOf(bpL,'normAutofit'));const fs=na&&na.getAttribute?+(na.getAttribute('fontScale')||1e5)/1e5:1,lsr=na&&na.getAttribute?1-(+(na.getAttribute('lnSpcReduction')||0)/1e5):1;
    const x0=box.x+L,w=Math.max(1,box.w-L-R);const lines=[];let numAt=0;const hasRef=!!pathOf(sp,'style','fontRef');
    for(const p of ps){const pPr=kidOf(p,'pPr');const lvl=+((pPr&&pPr.getAttribute('lvl'))||0);
      let pp={algn:kind==='title'?'ctr':'l',bu:null,spcBef:0,spcAft:0,lnSpc:1,marL:0,indent:0,run:{sz:kind==='title'?44:kind==='body'?(lvl?20:28):18,face:'+mn-lt',b:false,i:false}};
      pp=mergePara(pp,lvlProps(mst,lvl));if(hasRef&&kind==='other')pp.run={...pp.run,colEl:null};if(mph)pp=mergePara(pp,lvlProps(pathOf(mph,'txBody','lstStyle'),lvl));if(lph)pp=mergePara(pp,lvlProps(pathOf(lph,'txBody','lstStyle'),lvl));
      pp=mergePara(pp,lvlProps(pathOf(sp,'txBody','lstStyle'),lvl));pp=mergePara(pp,pPr);if(kind==='title')pp.bu=null;
      const runs=[];for(const r of p.children){if(r.localName==='r'||r.localName==='fld'){const st=mergeRun(pp.run,kidOf(r,'rPr'));const t=(kidOf(r,'t')||{textContent:''}).textContent;if(t)runs.push({t:st.caps?t.toUpperCase():t,st})}else if(r.localName==='br')runs.push({br:true,st:pp.run})}
      const endSz=mergeRun(pp.run,kidOf(p,'endParaRPr')).sz;
      if(!runs.length){lines.push({items:[],h:(endSz||18)*fs*1.2*EMU_PT*pp.lnSpc*lsr,algn:pp.algn,bef:pp.spcBef,aft:pp.spcAft,ind:pp.marL});continue}
      // word wrap
      const fontOf=st=>{let face=st.face||'+mn-lt';if(face==='+mj-lt')face=T.F.major;else if(face==='+mn-lt')face=T.F.minor;const px=(st.sz||18)*fs*EMU_PT*S;
        return{css:`${st.i?'italic ':''}${st.b?'bold ':''}${Math.max(1,px).toFixed(2)}px "${face}", Calibri, Arial, sans-serif`,px}};
      const ind=Math.max(0,pp.marL||0),first=pp.bu?ind:Math.max(0,ind+(pp.indent||0));numAt=pp.bu==='#'?numAt+1:0;
      const befPts=pp.befPct!=null?pp.befPct*(runs[0].st.sz||18)*fs*1.2:pp.spcBef;
      let cur={items:[],w:0,h:0,algn:pp.algn,ind:first,bef:befPts,aft:0,bu:pp.bu?{ch:pp.bu==='#'?numAt+'.':pp.bu,st:pp.run,x:Math.max(0,ind+(pp.indent||0))}:null,para:p};
      const avail=()=>(w-cur.ind)*S;
      const push=()=>{lines.push(cur);cur={items:[],w:0,h:0,algn:pp.algn,ind,bef:0,aft:0,para:p}};
      for(const r of runs){if(r.br){if(!cur.h)cur.h=(r.st.sz||18)*fs*1.2*EMU_PT*pp.lnSpc*lsr;push();continue}
        const f=fontOf(r.st);g.font=f.css;const lh=(r.st.sz||18)*fs*1.2*EMU_PT*pp.lnSpc*lsr;
        for(const tok of r.t.split(/(\s+)/)){if(!tok)continue;const tw=g.measureText(tok).width;
          if(wrap&&cur.items.length&&cur.w+tw>avail()&&tok.trim()){push()}
          if(!cur.items.length&&!tok.trim())continue;
          if(wrap&&tw>avail()&&tok.length>1){let s='';for(const ch of tok){const cw=g.measureText(s+ch).width;if(cur.w+cw>avail()&&s){cur.items.push({t:s,f,col:r.st.colEl,w:g.measureText(s).width});cur.h=Math.max(cur.h,lh);push();s=ch}else s+=ch}
            if(s){const sw=g.measureText(s).width;cur.items.push({t:s,f,col:r.st.colEl,w:sw});cur.w+=sw;cur.h=Math.max(cur.h,lh)}continue}
          cur.items.push({t:tok,f,col:r.st.colEl,w:tw});cur.w+=tw;cur.h=Math.max(cur.h,lh)}}
      cur.aft=pp.spcAft;lines.push(cur)}
    const total=lines.reduce((s,l)=>s+l.h+((l.bef||0)+(l.aft||0))*EMU_PT,0);
    let y=box.y+Tp;const inner=box.h-Tp-B;if(anchor==='ctr')y+=(inner-total)/2;else if(anchor==='b')y+=inner-total;
    const style=kidOf(sp,'style');const fontRef=style&&kidOf(style,'fontRef');const refCol=fontRef?clrIn(fontRef,T):null;
    const tx1=color({localName:'schemeClr',getAttribute:()=>'tx1',children:[]},T)||'#000';
    for(const l of lines){y+=(l.bef||0)*EMU_PT;const lw=l.w/S;let x=x0+l.ind;if(l.algn==='ctr')x=x0+l.ind+(w-l.ind-lw)/2;else if(l.algn==='r')x=x0+w-lw;
      const base=y+l.h*.8;
      if(l.bu&&l.items.length){g.font=l.items[0].f.css;g.fillStyle=(l.items[0].col&&clrIn(l.items[0].col,T))||refCol||tx1;
        const bx=l.algn==='l'||!l.algn?x0+l.bu.x:x-g.measureText(l.bu.ch+' ').width/S;g.fillText(l.bu.ch,bx*S,base*S)}
      for(const it of l.items){g.font=it.f.css;g.fillStyle=(it.col&&clrIn(it.col,T))||refCol||tx1;g.fillText(it.t,x*S,base*S);x+=it.w/S}
      y+=l.h+(l.aft||0)*EMU_PT}}
  async function drawTable(g,fr,box,ctx,S){const tbl=fr.getElementsByTagNameNS(PNS.a,'tbl')[0];if(!tbl)return false;
    const cols=kidsOf(kidOf(tbl,'tblGrid'),'gridCol').map(c=>+c.getAttribute('w'));let y=box.y;
    const tp=kidOf(tbl,'tblPr'),styled=!!(tp&&kidOf(tp,'tableStyleId')),hdr=tp&&tp.getAttribute('firstRow')==='1',band=tp&&tp.getAttribute('bandRow')==='1';
    const sc=(k,t)=>color({localName:'schemeClr',getAttribute:()=>k,children:t?[{localName:'tint',getAttribute:()=>String(t*1e5)}]:[]},ctx.T);
    kidsOf(tbl,'tr').forEach((tr,ri)=>{const h=+tr.getAttribute('h');let x=box.x;const head=styled&&hdr&&ri===0;const dr=ri-(hdr?1:0);
      const rowFill=!styled?null:head?sc('accent1'):band&&dr%2===0?sc('accent1',.4):sc('accent1',.2);
      kidsOf(tr,'tc').forEach((tc,i)=>{const w=cols[i]||0;const tcPr=kidOf(tc,'tcPr');const f=tcPr?fillOf(tcPr,ctx.T):undefined;const fc=f&&f.color?f.color:f===null?null:rowFill;
        if(fc){g.fillStyle=fc;g.fillRect(x*S,y*S,w*S,h*S)}g.strokeStyle=styled?'#ffffff':'rgba(0,0,0,.25)';g.lineWidth=Math.max(1,S*12700);g.strokeRect(x*S,y*S,w*S,h*S);
        const txt=tc.textContent.trim();if(txt){const px=Math.max(6,(+((tc.getElementsByTagNameNS(PNS.a,'rPr')[0]||{getAttribute:()=>null}).getAttribute('sz')||1800)/100)*EMU_PT*S);g.font=`${head?'bold ':''}${px}px "${ctx.T.F.minor}", Calibri, Arial, sans-serif`;g.fillStyle=head?(sc('lt1')||'#fff'):(sc('dk1')||'#000');
          let s=txt;while(s.length>1&&g.measureText(s).width>w*S-px)s=s.slice(0,-2)+'…';g.fillText(s,x*S+px*.4,y*S+Math.min(h*S,px*1.6)-px*.35)}x+=w});y+=h});return true}
  async function drawTree(g,tree,ctx,S,tf,skipPh,relsMap){for(const el of tree.children)await drawEl(g,el,ctx,S,tf,skipPh,relsMap)}
  async function drawEl(g,el,ctx,S,tf,skipPh,relsMap){const n=el.localName;
    if(n==='AlternateContent'){const pick=kidOf(el,'Fallback')||kidOf(el,'Choice');if(pick)await drawTree(g,pick,ctx,S,tf,skipPh,relsMap);return}
    const nv=el.firstElementChild,c=nv&&kidOf(nv,'cNvPr');if(c&&c.getAttribute('hidden')==='1')return;
    if(n==='grpSp'){const x=pathOf(el,'grpSpPr','xfrm');if(!x){await drawTree(g,el,ctx,S,tf,skipPh,relsMap);return}
      const o=kidOf(x,'off'),e=kidOf(x,'ext'),co=kidOf(x,'chOff'),ce=kidOf(x,'chExt');const sx=+ce.getAttribute('cx')?+e.getAttribute('cx')/+ce.getAttribute('cx'):1,sy=+ce.getAttribute('cy')?+e.getAttribute('cy')/+ce.getAttribute('cy'):1;
      const ntf=p=>tf({x:+o.getAttribute('x')+(p.x-+co.getAttribute('x'))*sx,y:+o.getAttribute('y')+(p.y-+co.getAttribute('y'))*sy,w:p.w*sx,h:p.h*sy,rot:p.rot,fh:p.fh,fv:p.fv});
      for(const k of el.children)if(!['nvGrpSpPr','grpSpPr'].includes(k.localName))await drawEl(g,k,ctx,S,ntf,skipPh,relsMap);return}
    if(!['sp','pic','cxnSp','graphicFrame'].includes(n))return;
    const k=n==='sp'?phKey(el):null;if(k&&skipPh)return;
    let xf=xfrmOf(el);if(!xf&&k){const l=findPh(ctx.layoutDoc,k),m=findPh(ctx.masterDoc,k);xf=xfrmOf(l)||xfrmOf(m)}if(!xf)return;
    const b=tf(xf);g.save();if(b.rot||b.fh||b.fv){const cx=(b.x+b.w/2)*S,cy=(b.y+b.h/2)*S;g.translate(cx,cy);if(b.rot)g.rotate(b.rot*Math.PI/180);g.scale(b.fh?-1:1,b.fv?-1:1);g.translate(-cx,-cy)}
    const X=b.x*S,Y=b.y*S,W=b.w*S,H=b.h*S;
    if(n==='pic'){const blip=el.getElementsByTagNameNS(PNS.a,'blip')[0];const id=blip&&blip.getAttributeNS(PNS.r,'embed');const r=id&&relsMap[id];const im=r&&r.target?await getImg(r.target):null;
      if(im){const sr=pathOf(el,'blipFill','srcRect');let sx=0,sy=0,sw=im.width,sh=im.height;if(sr){const f=a=>+(sr.getAttribute(a)||0)/1e5;sx=im.width*f('l');sy=im.height*f('t');sw=im.width*(1-f('l')-f('r'));sh=im.height*(1-f('t')-f('b'))}
        try{g.drawImage(im,sx,sy,Math.max(1,sw),Math.max(1,sh),X,Y,W,H)}catch(e){}}
      else{g.fillStyle='rgba(0,0,0,.06)';g.fillRect(X,Y,W,H)}g.restore();return}
    if(n==='graphicFrame'){const uri=(el.getElementsByTagNameNS(PNS.a,'graphicData')[0]||{getAttribute:()=>''}).getAttribute('uri')||'';
      if(/table/.test(uri))await drawTable(g,el,b,ctx,S);
      else if(/diagram/.test(uri)){const dr=Object.values(relsMap).find(r=>r.type==='diagramDrawing');const dd=dr&&dr.target?await getXml(dr.target):null;const t2=dd&&dd.getElementsByTagNameNS('*','spTree')[0];
        if(t2){const dRels=await getRels(dr.target);await drawTree(g,t2,ctx,S,p=>tf({...p,x:p.x+xf.x,y:p.y+xf.y}),false,dRels)}}
      else{g.strokeStyle='rgba(0,0,0,.25)';g.setLineDash([6,6]);g.lineWidth=Math.max(1,W/400);g.strokeRect(X,Y,W,H);g.setLineDash([]);g.font=`${Math.max(10,Math.min(W,H)/12)}px Arial, sans-serif`;g.fillStyle='rgba(0,0,0,.45)';g.textAlign='center';g.fillText(/chart/.test(uri)?'Chart':'Object',X+W/2,Y+H/2);g.textAlign='start';ctx.skipped++}
      g.restore();return}
    const spPr=kidOf(el,'spPr'),style=kidOf(el,'style'),T=ctx.T;let prst=(pathOf(spPr,'prstGeom')||{getAttribute:()=>null}).getAttribute('prst');
    let fill=fillOf(spPr,T,style);if(fill===undefined&&k){const l=findPh(ctx.layoutDoc,k);if(l)fill=fillOf(kidOf(l,'spPr'),T)}
    if(n==='cxnSp'&&fill===undefined)fill=null;if(!prst&&!pathOf(spPr,'custGeom'))prst='rect';
    const path=()=>geomPath(g,prst,X,Y,W,H);
    if(fill&&prst!=='line')await paintFill(g,fill,X,Y,W,H,path,relsMap);
    const ln=pathOf(spPr,'ln');let lc=null,lw=9525;if(ln){if(!kidOf(ln,'noFill')){lc=clrIn(kidOf(ln,'solidFill'),T);lw=+(ln.getAttribute('w')||12700)}}
    else if(style){const lr=kidOf(style,'lnRef');if(lr&&+lr.getAttribute('idx')>0)lc=clrIn(lr,T)}
    if(lc){path();g.strokeStyle=lc;g.lineWidth=Math.max(.5,lw*S);g.stroke()}
    g.restore();g.save();if(b.rot){const cx=(b.x+b.w/2)*S,cy=(b.y+b.h/2)*S;g.translate(cx,cy);g.rotate(b.rot*Math.PI/180);g.translate(-cx,-cy)}
    await drawText(g,el,b,ctx,S);g.restore()}
  async function bgOf(doc,T,relsMap){const bg=doc&&doc.getElementsByTagNameNS(PNS.p,'bg')[0];if(!bg)return undefined;const pr=kidOf(bg,'bgPr');
    if(pr){const f=fillOf(pr,T);return f===undefined?undefined:{f,rels:relsMap}}const ref=kidOf(bg,'bgRef');if(ref)return{f:{color:clrIn(ref,T)},rels:relsMap};return undefined}
  async function render(i,width){const sp=slides[i];const ch=await chain(sp);const sd=await getXml(sp),ld=ch.layout?await getXml(ch.layout):null,md=ch.master?await getXml(ch.master):null,td=ch.theme?await getXml(ch.theme):null;
    const T=themeOf(td);T.M={};const cm=md&&md.getElementsByTagNameNS(PNS.p,'clrMap')[0];if(cm)for(const a of cm.attributes)T.M[a.name]=a.value;
    for(const d of [ld,sd]){const o=d&&d.getElementsByTagNameNS(PNS.a,'overrideClrMapping')[0];if(o)for(const a of o.attributes)T.M[a.name]=a.value}
    const ctx={T,layoutDoc:ld,masterDoc:md,skipped:0};const S=width/size.cx;const c=document.createElement('canvas');c.width=Math.round(width);c.height=Math.round(size.cy*S);const g=c.getContext('2d');
    g.fillStyle='#ffffff';g.fillRect(0,0,c.width,c.height);g.textBaseline='alphabetic';
    const sR=await getRels(sp),lR=ch.layout?await getRels(ch.layout):{},mR=ch.master?await getRels(ch.master):{};
    const bg=(await bgOf(sd,T,sR))||(await bgOf(ld,T,lR))||(await bgOf(md,T,mR));if(bg&&bg.f)await paintFill(g,bg.f,0,0,c.width,c.height,()=>{g.beginPath();g.rect(0,0,c.width,c.height)},bg.rels);
    const id=p=>p;const showM=x=>!x||x.documentElement.getAttribute('showMasterSp')!=='0';
    if(md&&showM(sd)&&showM(ld)){const t=md.getElementsByTagNameNS(PNS.p,'spTree')[0];if(t)await drawTree(g,t,ctx,S,id,true,mR)}
    if(ld&&showM(sd)){const t=ld.getElementsByTagNameNS(PNS.p,'spTree')[0];if(t)await drawTree(g,t,ctx,S,id,true,lR)}
    const t=sd&&sd.getElementsByTagNameNS(PNS.p,'spTree')[0];if(t)await drawTree(g,t,ctx,S,id,false,sR);
    c._skipped=ctx.skipped;return c}
  return{count:slides.length,size,render}}

INIT['ppt-to-img']=()=>makeTool('ppt-to-img',{title:'PowerPoint to JPG',desc:'Save every slide as a picture — JPG, PNG, or one PDF with a page per slide.',ic:PPT_IC,
  accept:'.pptx',multiple:true,filter:isPptx,drop:'Drop .pptx files here',action:'Convert slides',zipName:'slides',
  opts:`<div class="row2"><label class="field"><span>Format</span><select class="o-f"><option value="jpg">JPG (smaller)</option><option value="png">PNG (sharp)</option><option value="pdf">PDF (one page per slide)</option></select></label>
   <label class="field"><span>Width</span><select class="o-w"><option value="1280">1280 px (HD)</option><option value="1920" selected>1920 px (Full HD)</option><option value="3840">3840 px (4K)</option></select></label></div>
   <label class="field"><span>Slides (optional)</span><input type="text" class="o-r" placeholder="all slides, or e.g. 1-3, 5" spellcheck="false"></label>`,
  note:'Slides are drawn in your browser. Charts, SmartArt effects and 3-D models may be simplified, and fonts you don’t have installed are replaced by similar ones.',
  async run(t){const fmt=t.q('.o-f').value,W=+t.q('.o-w').value,outs=[];let skipped=0;
    for(let i=0;i<t.files.length;i++){const f=t.files[i];const z=await openPptx(f);const R=await pptRenderer(z);if(!R.count)throw new Error(`${f.name} has no slides`);const pick=pageList(t.q('.o-r').value,R.count);
      let pdf=null,L=null;if(fmt==='pdf'){L=await loadPdfLib();pdf=await L.PDFDocument.create()}
      for(let k=0;k<pick.length;k++){t.prog((i+k/pick.length)/t.files.length,`${f.name}: slide ${pick[k]+1} of ${R.count}…`);const c=await R.render(pick[k],W);skipped+=c._skipped||0;
        if(pdf){const jb=await canvasBlob(c,'image/jpeg',.92);const im=await pdf.embedJpg(new Uint8Array(await jb.arrayBuffer()));const pw=R.size.cx/EMU_PT,ph=R.size.cy/EMU_PT;const pg=pdf.addPage([pw,ph]);pg.drawImage(im,{x:0,y:0,width:pw,height:ph})}
        else outs.push({name:`${stemOf(f.name)}-slide-${String(pick[k]+1).padStart(2,'0')}.${fmt}`,blob:await canvasBlob(c,fmt==='png'?'image/png':'image/jpeg',.92)});
        c.width=c.height=0;await tick()}
      if(pdf){const o=await pdfOut(pdf,`${stemOf(f.name)}.pdf`);o.info=`${pick.length} slide${pick.length===1?'':'s'}`;outs.push(o)}}
    if(skipped)t._extra=`<p class="note">${skipped} chart${skipped>1?'s or objects were':' or object was'} shown as an outline — export those slides from PowerPoint if you need them exactly.</p>`;
    return outs}});

/* ---------- PDF to PowerPoint ---------- */
// PptxGenJS lists slide masters it never writes in [Content_Types].xml; drop those entries so strict checkers stay happy.
async function tidyPptx(blob){await need('JSZip');const z=await JSZip.loadAsync(blob);const ct=await z.file('[Content_Types].xml').async('string');
  const fixed=ct.replace(/<Override [^>]*PartName="\/([^"]+)"[^>]*\/>/g,(m,p)=>z.file(p)?m:'');if(fixed===ct)return blob;z.file('[Content_Types].xml',fixed);
  return z.generateAsync({type:'blob',compression:'DEFLATE',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation'})}
INIT['pdf-to-ppt']=()=>makeTool('pdf-to-ppt',{title:'PDF to PowerPoint',desc:'Turn a PDF into a presentation: keep the exact look with one slide per page, or get the text as editable slides.',ic:PPT_IC,
  accept:'.pdf,application/pdf',multiple:true,filter:isPdf,meta:pdfMeta,drop:'Drop PDFs here',action:'Convert to PowerPoint',zipName:'presentations',
  opts:`<fieldset class="field"><legend>Slides</legend><label class="chk"><input type="radio" name="pp-m" value="look" checked> Same look — each page becomes a slide picture</label>
   <label class="chk"><input type="radio" name="pp-m" value="text"> Editable text — headings, bullets and tables you can change</label></fieldset>
   <label class="field o-qf"><span>Picture quality</span><select class="o-d"><option value="110">Standard (smaller file)</option><option value="150" selected>High</option><option value="220">Very high (for printing)</option></select></label>
   <label class="chk o-nf"><input type="checkbox" class="o-n" checked> Put each page’s text in the speaker notes</label>`,
  async run(t){const mode=t.q('[name=pp-m]:checked').value,dpi=+t.q('.o-d').value,notes=t.q('.o-n').checked,outs=[];
    for(let i=0;i<t.files.length;i++){const f=t.files[i];
      if(mode==='text'){t.prog(i/t.files.length,`Reading ${f.name}…`);const m=await parseFile(f,p=>t.prog((i+p*.8)/t.files.length,`Reading ${f.name}…`));
        const blob=await tidyPptx(await toPptx(m));const o={name:`${stemOf(f.name)}.pptx`,blob};o.info='editable text';outs.push(o);continue}
      let pdf;try{pdf=await pdfOpen(await bytesOf(f))}catch(e){if(e&&e.name==='PasswordException')throw new Error(`${f.name} is password-protected — unlock it first (PDF → Unlock)`);throw new Error(`${f.name} could not be opened: ${e.message||e}`)}
      await need('PptxGenJS');const P=new PptxGenJS();const p1=await pdf.getPage(1),v1=p1.getViewport({scale:1});const Win=v1.width/72,Hin=v1.height/72;
      P.defineLayout({name:'PDFPAGE',width:Win,height:Hin});P.layout='PDFPAGE';P.title=stemOf(f.name);
      for(let n=1;n<=pdf.numPages;n++){t.prog((i+(n-1)/pdf.numPages)/t.files.length,`${f.name}: page ${n} of ${pdf.numPages}…`);
        const c=await renderPage(pdf,n,dpi/72);const data=c.toDataURL('image/jpeg',.88);const pg=await pdf.getPage(n),vp=pg.getViewport({scale:1});
        const s=P.addSlide();const ar=vp.width/vp.height;let w=Win,h=Win/ar;if(h>Hin){h=Hin;w=Hin*ar}
        s.addImage({data,x:(Win-w)/2,y:(Hin-h)/2,w,h});
        if(notes){const tc=await pg.getTextContent();const txt=tc.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('').replace(/[ \t]+\n/g,'\n').trim();if(txt)s.addNotes(txt.slice(0,20000))}
        c.width=c.height=0;pg.cleanup();await tick()}
      pdfClose(pdf);t.prog((i+.98)/t.files.length,'Saving…');const blob=await tidyPptx(await P.write({outputType:'blob'}));const o={name:`${stemOf(f.name)}.pptx`,blob};o.info=`${pdf.numPages} slide${pdf.numPages===1?'':'s'}`;outs.push(o)}
    return outs}});
WRITE.pptx=async m=>tidyPptx(await toPptx(m));   // the document converter's PPTX output gets the same tidy-up
document.addEventListener('change',e=>{if(!e.target.matches('#pdf-to-ppt [name=pp-m]'))return;const look=document.querySelector('#pdf-to-ppt [name=pp-m]:checked').value==='look';
  document.querySelector('#pdf-to-ppt .o-qf').hidden=!look;document.querySelector('#pdf-to-ppt .o-nf').hidden=!look});
/*ppt-tools:end*/
