# Fileutilo 16.1: libraries from fileutilo.com first, the public CDNs as backup; Supabase pinned; SheetJS 0.20.3.
# The page reads vendor/manifest.json (written by scripts/vendor-libs.mjs) and tries only the files listed there,
# so a site without vendored files works exactly as before. Run after apply_v16_fixes.py.
import pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')
if '/*vendor-v161*/' in s:
    raise SystemExit('already applied')

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:110])
    s = s.replace(a, b)

SUPABASE_VER = '2.104.1'
SHEETJS = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'

# SheetJS 0.20.3 from SheetJS's own CDN (the npm registry stops at 0.18.5, which has known issues with crafted files)
rep("XLSX:'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'", "XLSX:['" + SHEETJS + "']")

# the manifest of files on fileutilo.com, read once (5-second limit, so a slow answer never holds a tool up)
rep("class LibError extends Error{constructor(n){const label=LIB_LABEL[n]||n;",
    "/*vendor-v161*/let VENDOR=null,VENDOR_P=null;const SITE_ROOT=location.origin+'/';\n"
    "function vendorReady(){return VENDOR_P||(VENDOR_P=Promise.race([fetch(SITE_ROOT+'vendor/manifest.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}),new Promise(r=>setTimeout(()=>r({}),5000))]).catch(()=>({})).then(v=>VENDOR=v&&typeof v==='object'?v:{}))}\n"
    "async function vendorUrl(n){const v=await vendorReady();return v.libs&&typeof v.libs[n]==='string'?new URL(v.libs[n],SITE_ROOT).href:null}\n"
    "window.fuVendorUrl=vendorUrl;\n"
    "function tessPaths(langs){const t=VENDOR&&VENDOR.tesseract;if(!t)return{};const o={workerPath:new URL(t.workerPath,SITE_ROOT).href,corePath:new URL(t.corePath,SITE_ROOT).href};"
    "if((langs||['eng']).every(l=>l==='eng'))o.langPath=new URL(t.langPath,SITE_ROOT).href;return o}\n"
    "class LibError extends Error{constructor(n){const label=LIB_LABEL[n]||n;const own=!!(VENDOR&&VENDOR.libs&&VENDOR.libs[n]);")
rep("    :`Couldn’t download the ${label} (it loads from cdn.jsdelivr.net${n==='jsquashAvif'?', unpkg.com or esm.sh':' or unpkg.com'} the first time you use this tool). A slow connection, firewall or content blocker may be stopping it. Please try again.`);",
    "    :own?`Couldn’t download the ${label} from fileutilo.com or its backup servers. A slow connection, firewall or content blocker may be stopping it. Please try again.`"
    ":`Couldn’t download the ${label} (it loads from ${n==='XLSX'?'cdn.sheetjs.com':'cdn.jsdelivr.net'}${n==='jsquashAvif'?', unpkg.com or esm.sh':n==='XLSX'?'':' or unpkg.com'} the first time you use this tool). A slow connection, firewall or content blocker may be stopping it. Please try again.`);")

# fileutilo.com first, then the CDNs
rep("const urls=Array.isArray(LIBS[n])?LIBS[n]:LIB_MIRRORS.map(m=>m(LIBS[n]));",
    "const own=await vendorUrl(n);const urls=[...new Set([...(own?[own]:[]),...(Array.isArray(LIBS[n])?LIBS[n]:LIB_MIRRORS.map(m=>m(LIBS[n])))])];")

# OCR engine and English data from fileutilo.com when they're there (other languages still come from the CDN)
rep("Tesseract.createWorker(langs,1,{logger:", "Tesseract.createWorker(langs,1,{...tessPaths(langs),logger:")
rep("Tesseract.createWorker(['eng'],1)", "Tesseract.createWorker(['eng'],1,tessPaths(['eng']))")

# Supabase pinned to one version, from fileutilo.com first
rep("try{await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js')}catch(e){toast(e.message,'err');return}",
    "{const own=window.fuVendorUrl?await window.fuVendorUrl('supabase'):null;let err=null;"
    "for(const u of [own,'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@" + SUPABASE_VER + "/dist/umd/supabase.js','https://unpkg.com/@supabase/supabase-js@" + SUPABASE_VER + "/dist/umd/supabase.js'].filter(Boolean)){"
    "try{await loadScript(u);if(window.supabase){err=null;break}}catch(e){err=e}}if(!window.supabase){toast((err&&err.message)||'Couldn’t load sign-in. Check your connection or ad blocker.','err');return}}")
P.write_text(s, encoding='utf-8')
print('libraries: fileutilo.com first; Supabase ' + SUPABASE_VER + '; SheetJS 0.20.3')
