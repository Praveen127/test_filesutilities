/* Google Drive: open files from Drive into any tool, and save a result back to Drive.
   Off unless googleClientId, googleApiKey and googleAppId are set in config.js (see SETUP.md, Part K).
   Nothing from Google loads until someone points at, focuses or taps a Google Drive button.
   Files travel Google → this browser and this browser → Google. They never pass through Fileutilo's servers.
   Access is limited to the files the person picks or saves (the drive.file permission). */
(()=>{
const cfg=()=>window.FILEUTILO_CONFIG||{};
const on=()=>{const c=cfg();return !!(c.googleClientId&&c.googleApiKey&&c.googleAppId)};
const SCOPE='https://www.googleapis.com/auth/drive.file';
const API='https://www.googleapis.com';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ICON='<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 4h7l5.5 9.5-3.5 6h-11L3 13.5z"/><path d="M8.5 4 12 10.5M15.5 4 9.5 14M3 13.5h12"/></svg>';
// Google's own formats are exported to the matching Office or image file.
const EXPORT={'application/vnd.google-apps.document':['application/vnd.openxmlformats-officedocument.wordprocessingml.document','.docx'],
  'application/vnd.google-apps.spreadsheet':['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.xlsx'],
  'application/vnd.google-apps.presentation':['application/vnd.openxmlformats-officedocument.presentationml.presentation','.pptx'],
  'application/vnd.google-apps.drawing':['image/png','.png']};

let token=null,tokenExp=0,client=null,ready=null;
const load=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=res;
  s.onerror=()=>{s.remove();rej(new Error('Couldn’t reach Google Drive. Check your connection and try again.'))};document.head.appendChild(s)});
function loadGoogle(){return ready||(ready=(async()=>{
  await Promise.all([window.gapi?.load?0:load('https://apis.google.com/js/api.js'),window.google?.accounts?.oauth2?0:load('https://accounts.google.com/gsi/client')]);
  await new Promise((res,rej)=>gapi.load('picker',{callback:res,onerror:()=>rej(new Error('Google Drive picker didn’t load. Try again.'))}));
})().catch(e=>{ready=null;throw e}))}
function getToken(){return new Promise((res,rej)=>{
  if(token&&Date.now()<tokenExp-60000)return res(token);
  client=client||google.accounts.oauth2.initTokenClient({client_id:cfg().googleClientId,scope:SCOPE,callback:()=>{}});
  client.callback=r=>{if(r.error)return rej(new Error(r.error==='access_denied'?'Google Drive access wasn’t allowed.':'Google sign-in didn’t work ('+r.error+'). Try again.'));
    token=r.access_token;tokenExp=Date.now()+(+r.expires_in||3600)*1000;res(token)};
  client.error_callback=e=>rej(new Error(e&&e.type==='popup_closed'?'The Google window was closed.':
    'Your browser blocked the Google window. Allow pop-ups for this site, or tap Google Drive again.'));
  client.requestAccessToken({prompt:''})})}
async function auth(r){if(r&&r.status===401){token=null;tokenExp=0}return r}

function pick(multiple){return new Promise(res=>{
  const P=google.picker,view=new P.DocsView(P.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false).setMode(P.DocsViewMode.LIST);
  const b=new P.PickerBuilder().setOAuthToken(token).setDeveloperKey(cfg().googleApiKey).setAppId(String(cfg().googleAppId))
    .addView(view).setOrigin(location.protocol+'//'+location.host).setTitle('Choose from Google Drive')
    .setCallback(d=>{if(d[P.Response.ACTION]===P.Action.PICKED)res(d[P.Response.DOCUMENTS]||[]);else if(d[P.Response.ACTION]===P.Action.CANCEL)res([])});
  if(multiple)b.enableFeature(P.Feature.MULTISELECT_ENABLED);
  b.build().setVisible(true)})}

async function fetchFile(doc){
  const id=encodeURIComponent(doc.id),mime=doc.mimeType||'',ex=EXPORT[mime];let name=doc.name||'file';
  if(/^application\/vnd\.google-apps\./.test(mime)&&!ex)throw new Error(`“${name}” is a Google ${mime.split('.').pop()} and can’t be opened as a file.`);
  const url=ex?`${API}/drive/v3/files/${id}/export?mimeType=${encodeURIComponent(ex[0])}`:`${API}/drive/v3/files/${id}?alt=media&supportsAllDrives=true`;
  const r=await auth(await fetch(url,{headers:{Authorization:'Bearer '+token}}));
  if(!r.ok)throw new Error(r.status===401?'Your Google sign-in expired. Tap Google Drive again.':r.status===403||r.status===404?`Fileutilo wasn’t given access to “${name}”.`:`Couldn’t download “${name}” from Google Drive (error ${r.status}).`);
  const blob=await r.blob();if(ex&&!name.toLowerCase().endsWith(ex[1]))name+=ex[1];
  return new File([blob],name,{type:ex?ex[0]:(mime||blob.type),lastModified:Date.now()})}

// ---------- open from Drive ----------
function addButtons(root){if(!on())return;
  for(const lab of root.querySelectorAll('label.drop:not(.o-bfz)')){if(lab.dataset.gd)continue;lab.dataset.gd='1';
    const inp=lab.querySelector('input[type=file]');if(!inp)continue;
    const row=document.createElement('div');row.className='gd-row';
    row.innerHTML=`<button type="button" class="gd-btn">${ICON}<span>Choose from Google Drive</span></button><span class="gd-msg" role="status"></span>`;
    lab.after(row);const btn=row.firstChild,msg=row.lastChild;
    const warm=()=>{loadGoogle().catch(()=>{})};
    btn.addEventListener('pointerenter',warm);btn.addEventListener('focus',warm);btn.addEventListener('touchstart',warm,{passive:true});
    btn.addEventListener('click',async()=>{if(btn.disabled)return;msg.textContent='';msg.className='gd-msg';btn.disabled=true;
      try{await loadGoogle();await getToken();const docs=await pick(inp.multiple);if(!docs.length)return;
        const files=[];for(let i=0;i<docs.length;i++){msg.textContent=docs.length>1?`Getting ${i+1} of ${docs.length} from Google Drive…`:'Getting your file from Google Drive…';files.push(await fetchFile(docs[i]))}
        const dt=new DataTransfer();files.forEach(f=>dt.items.add(f));inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}));
        msg.textContent=files.length>1?`Added ${files.length} files from Google Drive`:`Added ${files[0].name} from Google Drive`;msg.className='gd-msg ok'}
      catch(e){msg.textContent=e.message||String(e);msg.className='gd-msg err'}
      finally{btn.disabled=false}})}}

// ---------- save to Drive ----------
let toast=null;
async function upload(name,blob,set){
  await loadGoogle();await getToken();set('Saving to Google Drive…');
  const start=await auth(await fetch(`${API}/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink`,{method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':blob.type||'application/octet-stream'},body:JSON.stringify({name})}));
  if(!start.ok)throw new Error(start.status===401?'Your Google sign-in expired. Try again.':`Google Drive refused the file (error ${start.status}).`);
  const loc=start.headers.get('Location');if(!loc)throw new Error('Google Drive didn’t accept the upload. Try again.');
  const r=await fetch(loc,{method:'PUT',headers:{'Content-Type':blob.type||'application/octet-stream'},body:blob});
  if(!r.ok)throw new Error(`Saving to Google Drive failed (error ${r.status}).`);return r.json()}
window.fuSaved=(name,data)=>{if(!on())return;const blob=data instanceof Blob?data:new Blob([data]);
  if(!toast){toast=document.createElement('div');toast.className='gd-toast';toast.setAttribute('role','status');document.body.appendChild(toast)}
  clearTimeout(toast._t);toast.hidden=false;
  toast.innerHTML=`<span class="gd-t">Downloaded <b>${esc(name)}</b></span><button type="button" class="gd-save">${ICON}<span>Save a copy to Google Drive</span></button><button type="button" class="gd-x" aria-label="Close">×</button>`;
  const t=toast.querySelector('.gd-t'),save=toast.querySelector('.gd-save'),set=s=>{t.textContent=s};
  const later=ms=>{clearTimeout(toast._t);toast._t=setTimeout(()=>{toast.hidden=true},ms)};later(12000);
  toast.querySelector('.gd-x').onclick=()=>{toast.hidden=true};
  const warm=()=>{loadGoogle().catch(()=>{})};save.addEventListener('pointerenter',warm);save.addEventListener('focus',warm);
  save.onclick=async()=>{clearTimeout(toast._t);save.disabled=true;
    try{const f=await upload(name,blob,set);t.innerHTML=`Saved <b>${esc(f.name||name)}</b> to Google Drive${f.webViewLink?` · <a href="${esc(f.webViewLink)}" target="_blank" rel="noopener">Open</a>`:''}`;save.remove();later(10000)}
    catch(e){set(e.message||String(e));save.disabled=false;later(15000)}}};

// Buttons appear on every drop area, including tools that are built when they are first opened.
const scan=()=>{if(on())addButtons(document)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
let q=0;new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;scan()})}).observe(document.documentElement,{childList:true,subtree:true});
})();
