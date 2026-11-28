# Fileutilo 16, step 2: fixes found by the AutoQA run of 27 November 2026. Run after apply_v16_drive.py.
#  1. Unlock PDF: a damaged file was reported as "This PDF isn't password-protected".
#  2. Word count (and other tools that read text from PDFs): a damaged or locked PDF gave raw library messages
#     ("Invalid PDF structure.", "No password given") that screen readers did not announce.
#  3. File comparison: when a file could not be read, the old text stayed on that side and was compared anyway.
#  4. Table cleaner: any file (e.g. .xyz) was opened as if it were CSV, with no warning.
#  5. Data converter: the status line said "Read as JSON" even when the JSON was invalid.
import pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')
if '/*fixes-v16*/' in s:
    raise SystemExit('already applied')

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:120])
    s = s.replace(a, b)

DAMAGED = 'This file can’t be opened — it’s damaged or isn’t a PDF'

# 1. unlock
rep("const E=readEncrypt(L,first.context);if(!E)throw new Error('This PDF isn’t password-protected');",
    "/*fixes-v16*/if(!/%PDF-/.test(new TextDecoder('latin1').decode(bytes.subarray?bytes.subarray(0,1024):new Uint8Array(bytes).subarray(0,1024))))throw new Error('" + DAMAGED + "');"
    "let pc=0;try{pc=first.getPageCount()}catch(_){}const E=readEncrypt(L,first.context);if(!E){if(!pc)throw new Error('" + DAMAGED + "');throw new Error('This PDF isn’t password-protected')}")

# 2. text from PDFs: plain-language errors, announced
rep("if(e==='pdf'){const pdf=await pdfOpen(await bytesOf(f));",
    "if(e==='pdf'){const pdf=await pdfOpen(await bytesOf(f)).catch(er=>{throw new Error(er&&er.name==='PasswordException'?'This PDF is password-protected — unlock it first (PDF → Unlock)':er&&er.name==='LibError'?er.message:'" + DAMAGED + "')});")
rep("catch(e){h+=`<p class=\"errc\">${esc(f.name)}: ${esc(e.message)}</p>`}}",
    "catch(e){h+=`<p class=\"errc\" role=\"alert\">${esc(f.name)}: ${esc(e.message)}</p>`}}")

# 3. file comparison: an unreadable file empties its side and says so; nothing is compared until it's fixed
rep('<div class="stats" id="dstats"></div>',
    '<div class="msg err" id="dmsg" role="alert" hidden></div><div class="stats" id="dstats"></div>')
rep("function hookFile(inp,area,fn,key){inp.onchange=async e=>{const f=e.target.files[0];if(!f)return;try{area.value=await readAny(f);$(fn).textContent=f.name;store.set(fn,f.name);store.set(key,area.value.slice(0,500000));runDiff()}catch(err){$(fn).textContent='Could not read '+f.name}e.target.value=''}}",
    "const dBad={};function diffMsg(){const m=$('dmsg'),v=Object.values(dBad);m.textContent=v.join(' ');m.hidden=!v.length}\n"
    "function diffBad(side,f,err){dBad[side]=`${f.name} couldn’t be read — ${err&&/password/i.test(err.message)?'it’s password-protected':'it’s damaged or not a supported file'}. Nothing was compared.`;diffMsg();$('dout').innerHTML='';$('dstats').innerHTML='';lastOps=null}\n"
    "function diffOk(side){if(dBad[side]){delete dBad[side];diffMsg()}}\n"
    "function hookFile(inp,area,fn,key){const side=fn==='fnA'?'A':'B';inp.onchange=async e=>{const f=e.target.files[0];if(!f)return;try{area.value=await readAny(f);$(fn).textContent=f.name;store.set(fn,f.name);store.set(key,area.value.slice(0,500000));diffOk(side);runDiff()}catch(err){area.value='';store.set(key,'');$(fn).textContent='Could not read '+f.name;store.set(fn,'Pasted text');diffBad(side,f,err)}e.target.value=''}}")
rep("el.addEventListener('drop',async e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){el.value=await readAny(f);$(i?'fnB':'fnA').textContent=f.name;runDiff()}})",
    "el.addEventListener('drop',async e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){try{el.value=await readAny(f);$(i?'fnB':'fnA').textContent=f.name;diffOk(i?'B':'A');runDiff()}catch(err){el.value='';$(i?'fnB':'fnA').textContent='Could not read '+f.name;diffBad(i?'B':'A',f,err)}}})")
rep("[ta,tb].forEach((el,i)=>{el.addEventListener('input',()=>{",
    "[ta,tb].forEach((el,i)=>{el.addEventListener('input',()=>{diffOk(i?'B':'A');")
rep("function runDiff(){",
    "function runDiff(){if(Object.keys(dBad).length){diffMsg();$('dout').innerHTML='';$('dstats').innerHTML='';lastOps=null;return}")

# 4. table cleaner: only CSV, TSV, text and spreadsheet files
rep("r.q('.o-f').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const ex=extOf(f.name);",
    "r.q('.o-f').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const ex=extOf(f.name);"
    "if(!['csv','tsv','txt','xlsx','xls','ods'].includes(ex))return toast(`${f.name} isn’t a CSV or Excel file — open a .csv, .tsv, .txt, .xlsx, .xls or .ods file`,'err');")

# 5. data converter: the status line reports a failed read
rep("catch(e){o.value=e.message;o.classList.add('err');value=null}",
    "catch(e){o.value=e.message;o.classList.add('err');value=null;const inf=r.q('.o-info');if(inf)inf.textContent='Couldn’t convert — '+e.message.split('\\n')[0]}")
P.write_text(s, encoding='utf-8')
print('5 fixes applied')
