# Fileutilo 16, step 1: Google Drive. Adds "Choose from Google Drive" under every drop area and a
# "Save a copy to Google Drive" offer after each download. Both stay hidden until googleClientId, googleApiKey and
# googleAppId are set in config.js (SETUP.md, Part K). Run after apply_v15_business.py.
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
P = ROOT / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')
if '/*gdrive:start*/' in s:
    raise SystemExit('already applied')

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:110])
    s = s.replace(a, b)

# 1. the module, as its own script at the end of the page
JS = (ROOT / 'scripts' / 'parts' / 'gdrive.js').read_text(encoding='utf-8')
i = s.rindex('</body>')
s = s[:i] + '<script>/*gdrive:start*/\n' + JS + '/*gdrive:end*/</script>\n' + s[i:]

# 2. after a normal browser download, offer to save the same file to Drive
rep("a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();",
    "a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();try{window.fuSaved&&window.fuSaved(name,blob)}catch(e){}")

# 3. privacy policy
rep('<h3>Your files</h3><p>Files you open in Fileutilo are processed inside your web browser, on your own device. They are not uploaded to our servers and we cannot see them.</p>',
    '<h3>Your files</h3><p>Files you open in Fileutilo are processed inside your web browser, on your own device. They are not uploaded to our servers and we cannot see them.</p>'
    '<h3>Google Drive (only if you use it)</h3><p>If you choose “Choose from Google Drive” or “Save a copy to Google Drive”, you sign in to Google in a Google window and allow Fileutilo to see only the files you pick or save. The file goes straight between Google and your browser; it never passes through our servers. The Google permission lasts for that browser session, and you can remove it at any time in your Google Account under “Third-party apps &amp; services”.</p>')
rep('<li>Google — “Sign in with Google”, Google AdSense ads shown on the free plan, and Google Analytics visit statistics where used.</li>',
    '<li>Google — “Sign in with Google”, Google Drive when you choose to open or save files there, Google AdSense ads shown on the free plan, and Google Analytics visit statistics where used.</li>')

# 4. styles
CSS = '''/*gdrive-v16*/
.gd-row{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;margin:10px 0 2px}
.gd-btn,.gd-save{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 16px;border-radius:999px;border:1.5px solid var(--line,#d8d2c4);background:var(--sheet,#fff);color:var(--ink,#1a1a1a);font:600 14px Inter,sans-serif;cursor:pointer}
.gd-btn:hover,.gd-save:hover{border-color:var(--ink,#1a1a1a)}.gd-btn:focus-visible,.gd-save:focus-visible,.gd-x:focus-visible{outline:3px solid var(--ink,#1a1a1a);outline-offset:2px}
.gd-btn[disabled],.gd-save[disabled]{opacity:.6;cursor:progress}
.gd-msg{font-size:13px;color:var(--mute,#5a5850)}.gd-msg.ok{color:light-dark(#0d6b3f,#8fe0b4)}.gd-msg.err{color:light-dark(#a8361d,#ff9d86)}
.gd-toast{position:fixed;right:16px;bottom:16px;z-index:60;display:flex;align-items:center;flex-wrap:wrap;gap:10px 14px;max-width:min(520px,calc(100vw - 32px));padding:12px 12px 12px 18px;border-radius:16px;background:#1a1a1a;color:#f2efe8;box-shadow:0 10px 30px rgba(0,0,0,.25);font-size:14px}
.gd-toast[hidden]{display:none}.gd-toast b{color:#fff;word-break:break-all}.gd-toast a{color:#ff9d86;font-weight:600}
.gd-toast .gd-save{background:#fff;color:#1a1a1a;border-color:#fff}
.gd-x{width:36px;height:36px;border-radius:50%;border:0;background:transparent;color:#f2efe8;font-size:22px;line-height:1;cursor:pointer}
@media(max-width:600px){.gd-toast{left:12px;right:12px;bottom:12px;max-width:none}}
/* result rows: name and size beside the icon, Preview and Download on their own line on phones (was squeezing the name) */
.rlist li{grid-template-columns:auto minmax(0,1fr) auto auto}
.rlist li .fi{grid-row:1/3;grid-column:1}.rlist li .nm{grid-row:1;grid-column:2;overflow-wrap:anywhere}.rlist li .fm{grid-row:2;grid-column:2}
.rlist li .pvbtn{grid-row:1/3;grid-column:3}.rlist li .pri{grid-row:1/3;grid-column:4}
@media(max-width:700px){.rlist li{grid-template-columns:auto minmax(0,1fr) auto;row-gap:4px}.rlist li .nm,.rlist li .fm{grid-column:2/4}
 .rlist li .pri{grid-row:3;grid-column:1/-1;justify-content:center;margin-top:8px}.rlist li .pvbtn{grid-row:4;grid-column:1/-1;min-height:40px}}
'''
rep('</style>\n<!-- Vercel Web Analytics', CSS + '</style>\n<!-- Vercel Web Analytics')
P.write_text(s, encoding='utf-8')

# 5. config.js gets the three settings (empty = Google Drive buttons stay hidden)
C = ROOT / 'web' / 'config.js'
c = C.read_text(encoding='utf-8')
if 'googleClientId' not in c:
    a = '  ga4Id:'
    assert c.count(a) == 1
    c = c.replace(a, '''  // Google Drive buttons (SETUP.md, Part K). Leave all three empty to hide them.
  googleClientId:  "",            // OAuth client ID, ends in .apps.googleusercontent.com
  googleApiKey:    "",            // API key restricted to fileutilo.com and the Google Picker API
  googleAppId:     "",            // the Google Cloud project NUMBER (digits only)
''' + a)
    C.write_text(c, encoding='utf-8')
print('Google Drive open and save added (hidden until configured)')
