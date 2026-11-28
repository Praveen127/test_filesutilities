# One-off: writes the new landing page (hero + home section + styles + brand themes) into web/index.html.
import re, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from landing_parts import grid, svg

P = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:90])
    s = s.replace(a, b)

LOGO = ('<svg aria-hidden="true" class="mark" width="30" height="30" viewBox="0 0 48 48">'
        '<path class="m-page" d="M14 7h14l9 9v23a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3z"/>'
        '<path class="m-fold" d="M28 7v7a2 2 0 0 0 2 2h7z"/>'
        '<path class="m-f" d="M18.5 20.5h10M18.5 20.5v14M18.5 27.5h7.5" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>')

# ---------- 1. hero ----------
i = s.index('<div class="brand"><div class="logo">'); j = s.index('<div class="scene" aria-hidden="true">')
hero = f'''<div class="brand"><div class="logo">{LOGO}</div><span class="bname">Fileutilo</span><span class="pbadge">Private by design</span></div>
<h1>Your files. Your device.<br><em>Your control.</em></h1>
<p>One simple workspace for PDFs, documents, images and data. Get work done without sending your files to a server.</p>
<div class="hero-actions"><a class="hero-cta" href="/#tools">Explore tools <span aria-hidden="true">→</span></a><a class="hero-secondary" href="/#how">See how it works</a></div>
<ul class="ticks"><li>No installation</li><li>Files processed in your browser</li><li><span class="toolcount" data-suffix=" useful tools">27 useful tools</span></li><li>Free to start</li></ul>
</div>
'''
s = s[:i] + hero + s[j:]

# ---------- 2. home section ----------
i = s.index('<section id="home" class="home-page">'); j = s.index('</section>', i) + len('</section>')
CHECK = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg>'
home = f'''<section id="home" class="home-page">
  <div class="home-trust">
    <div><b class="toolcount-n">27</b><span>tools in one workspace</span></div>
    <div><b>0 uploads</b><span>your files stay in your browser</span></div>
    <div><b>No install</b><span>works on phone and computer</span></div>
    <div><b>Free to start</b><span>Pro when you need more</span></div>
  </div>

  <div class="hsec" id="tools">
    <div class="hhead"><div><span class="home-kicker">THE TOOLKIT</span><h2>27 tools. One private workspace.</h2></div>
      <p>Every tool has its own page — bookmark the ones you use. Tools marked <em class="tfree">No limit</em> are free without daily limits.</p></div>
{grid()}
  </div>

  <div class="hsec" id="how">
    <div class="hhead"><div><span class="home-kicker">HOW IT WORKS</span><h2>Three steps. Your file never leaves the tab.</h2></div></div>
    <div class="how">
      <ol class="hsteps">
        <li><b>Pick a tool</b><p>Open any of the 27 tools — no account needed to start.</p></li>
        <li><b>Add your files</b><p>Drop them in. Your browser reads them from your disk into memory on this page; nothing is sent to us.</p></li>
        <li><b>Download the result</b><p>The work happens on your device, so it's quick even on a slow connection — and the result is saved straight from the page.</p></li>
      </ol>
      <figure class="demo"><div class="bframe"><span></span><span></span><span></span><i>fileutilo.com/img-resize</i></div>
        <video id="demoVideo" muted loop playsinline preload="none" poster="/media/demo-poster.webp" aria-label="Demo: resizing a photo to under 50 KB in Fileutilo"><source src="/media/demo.webm" type="video/webm"><source src="/media/demo.mp4" type="video/mp4"></video>
        <figcaption>Real recording: a photo resized to under 50 KB for a form upload.</figcaption></figure>
    </div>
    <div class="shots">
      <figure><img src="/media/shot-merge.webp" width="1200" height="760" loading="lazy" alt="Merge PDF: three PDFs listed in order, ready to combine"><figcaption>Merge PDF</figcaption></figure>
      <figure><img src="/media/shot-convert.webp" width="1200" height="760" loading="lazy" alt="Document converter with Word, Excel and PDF files queued"><figcaption>Document converter</figcaption></figure>
      <figure><img src="/media/shot-json.webp" width="1200" height="760" loading="lazy" alt="JSON formatter showing formatted, validated JSON"><figcaption>JSON formatter</figcaption></figure>
    </div>
  </div>

  <div class="hsec" id="privacy-explained">
    <div class="hhead"><div><span class="home-kicker">PRIVACY, PRECISELY</span><h2>What stays on your device — and what doesn't</h2></div>
      <p>“Private” should be checkable. Here is exactly what Fileutilo sends over the network, and what it never does.</p></div>
    <div class="pgrid">
      <div class="pstay"><h3>{CHECK} Stays on your device</h3>
        <ul><li><b>Your files</b> — PDFs, documents, images, spreadsheets, archives</li>
        <li><b>Their contents and file names</b></li>
        <li><b>Passwords</b> you type into Protect or Unlock PDF</li>
        <li><b>The results</b> — saved straight from the page to your downloads</li></ul>
        <p>This is true for all 27 tools, on every plan, signed in or not.</p></div>
      <div class="pnet"><h3>What does use the network</h3>
        <table><thead><tr><th>What</th><th>Why</th><th>Contains your files?</th></tr></thead><tbody>
        <tr><td>Processing code (PDF engine, Office readers, OCR language data)</td><td>Downloaded from public code libraries (jsDelivr, unpkg, esm.sh) the first time a tool needs it, then cached</td><td class="no">No</td></tr>
        <tr><td>Your account (email, plan, credits, daily task counts)</td><td>Only if you sign in — stored with Supabase. Task counts record the tool name and file count, never names or contents</td><td class="no">No</td></tr>
        <tr><td>Payments</td><td>Card and UPI details go to Razorpay; we keep the order ID, amount and status</td><td class="no">No</td></tr>
        <tr><td>Visit statistics</td><td>Vercel Web Analytics counts page views without cookies; Google Analytics only if enabled, and only after consent in the EEA/UK</td><td class="no">No</td></tr>
        <tr><td>Ads (Free plan only)</td><td>Google AdSense shows one ad; it sees the page address and your device type, like any website ad</td><td class="no">No</td></tr>
        </tbody></table></div>
    </div>
    <div class="pproof"><div><b>How we check.</b> An automated test runs every tool on files containing a unique marker and inspects every network request the page makes — the marker, the file name and the file bytes must never appear. It runs before every release.</div>
      <div><b>Check it yourself.</b> Press <kbd>F12</kbd> → <b>Network</b>, then use any tool: you'll see code downloads, but no request carrying your file. Or switch your connection off after the page loads — tools you've used before keep working.</div>
      <a href="/privacy">Full privacy policy →</a></div>
  </div>

  <div class="hsec" id="formats">
    <div class="hhead"><div><span class="home-kicker">SUPPORTED FORMATS</span><h2>Open it. Convert it. Clean it.</h2></div></div>
    <div class="fgrid">
      <div><h3>Documents</h3><p>Open</p><div class="chips2"><i>DOCX</i><i>DOC</i><i>ODT</i><i>RTF</i><i>PDF</i><i>XLSX</i><i>XLS</i><i>ODS</i><i>CSV</i><i>PPTX</i><i>PPT</i><i>HTML</i><i>TXT</i><i>PS</i></div>
        <p>Create</p><div class="chips2"><i>PDF</i><i>DOCX</i><i>ODT</i><i>RTF</i><i>DOC</i><i>XLSX</i><i>XLS</i><i>PPTX</i><i>HTML</i><i>TXT</i><i>PS</i></div></div>
      <div><h3>Images</h3><p>Open</p><div class="chips2"><i>JPG</i><i>PNG</i><i>WEBP</i><i>AVIF</i><i>HEIC</i><i>GIF</i><i>BMP</i><i>TIFF</i><i>ICO</i><i>SVG</i></div>
        <p>Create</p><div class="chips2"><i>JPG</i><i>PNG</i><i>WEBP</i><i>AVIF</i><i>GIF</i><i>BMP</i><i>TIFF</i><i>ICO</i><i>SVG</i><i>PDF</i></div></div>
      <div><h3>Data</h3><p>Open and create</p><div class="chips2"><i>JSON</i><i>CSV</i><i>TSV</i><i>XLSX</i><i>XML</i><i>YAML</i><i>Markdown</i><i>HTML table</i></div>
        <p>Also</p><div class="chips2"><i>JSONPath</i><i>JSON Schema</i><i>MD5</i><i>SHA-256</i><i>Base64</i></div></div>
      <div><h3>Archives</h3><p>Open</p><div class="chips2"><i>ZIP</i><i>JAR</i><i>EPUB</i><i>APK</i><i>DOCX/XLSX/PPTX</i></div>
        <p>Create</p><div class="chips2"><i>ZIP</i></div></div>
    </div>
    <p class="fnote">Scanned PDFs and photos have no text layer — run <a href="/pdf-ocr">OCR</a> first. Converting complex layouts keeps text, headings, lists and tables; see each tool's page for details.</p>
  </div>

  <div class="hsec" id="plans">
    <div class="hhead"><div><span class="home-kicker">FREE AND PRO</span><h2>Free for everyday tasks. Pro for heavy days.</h2></div></div>
    <div class="ptable" role="region" aria-label="Free and Pro compared" tabindex="0"><table>
      <thead><tr><th></th><th>Without an account</th><th>Free account</th><th class="pro">Pro</th></tr></thead>
      <tbody>
      <tr><td>All 27 tools</td><td>{CHECK}</td><td>{CHECK}</td><td class="pro">{CHECK}</td></tr>
      <tr><td>Tasks a day</td><td>10</td><td>25</td><td class="pro">Unlimited</td></tr>
      <tr><td>Files per task</td><td>5</td><td>5</td><td class="pro">No limit</td></tr>
      <tr><td>File size</td><td>Up to 20 MB</td><td>Up to 20 MB</td><td class="pro">No limit</td></tr>
      <tr><td>OCR pages a day</td><td>5</td><td>5</td><td class="pro">Unlimited</td></tr>
      <tr><td>JSON, data, diff and other “No limit” tools</td><td>Unlimited</td><td>Unlimited</td><td class="pro">Unlimited</td></tr>
      <tr><td>Ads</td><td>One ad</td><td>One ad</td><td class="pro">None</td></tr>
      <tr><td>Files processed on your device</td><td>{CHECK}</td><td>{CHECK}</td><td class="pro">{CHECK}</td></tr>
      <tr><td>Price</td><td>₹0</td><td>₹0</td><td class="pro">₹149/month · ₹999/year · ₹2,999 lifetime</td></tr>
      </tbody></table></div>
    <div class="pcta"><span>Need a few extra tasks? <b>Credits</b> start at ₹49 for 50 and never expire.</span><a href="/pricing">See plans <span aria-hidden="true">→</span></a></div>
  </div>

  <div class="hsec help" id="support">
    <div><span class="home-kicker">HELP</span><h2>Stuck, or found a bug? Talk to a person.</h2>
      <p>Email <a class="cmail" href="mailto:support@fileutilo.com">support@fileutilo.com</a> — tell us the tool and what happened. Please don't attach confidential files; a description or a sample is enough.</p></div>
    <div class="hbtns"><a class="hbtn" href="mailto:support@fileutilo.com?subject=Fileutilo%20help">Email support</a><a class="hbtn ghost" href="mailto:support@fileutilo.com?subject=Bug%20report&body=Tool%3A%0ABrowser%20and%20device%3A%0AWhat%20happened%3A%0A">Report a problem</a></div>
  </div>

  <div class="home-faq">
    <span class="home-kicker">GOOD TO KNOW</span><h3>Questions people ask</h3>
    <details><summary>Do I need to install anything?</summary><p>No. Fileutilo runs in any modern browser on Windows, Mac, Linux, Android and iPhone.</p></details>
    <details><summary>Are my files uploaded?</summary><p>No. All 27 tools process files inside your browser. Fileutilo's servers only store account, usage-count and payment records if you sign in or buy something — never your files, their names or their contents.</p></details>
    <details><summary>Why does a tool download something the first time?</summary><p>Some tools need processing code — for example the PDF engine or OCR language data. It's fetched from a public code library once and cached by your browser. Those downloads don't contain anything from your files.</p></details>
    <details><summary>Can I use Fileutilo for free?</summary><p>Yes: 10 tasks a day without an account, 25 with a free account, and the data tools have no daily limit. Pro removes all limits and ads.</p></details>
    <details><summary>Does it work offline?</summary><p>Once a tool's code has been loaded, it keeps working if your connection drops — another sign the work happens on your device.</p></details>
  </div>
</section>'''
s = s[:i] + home + s[j:]

# ---------- 3. styles ----------
i = s.index('/* ---------- Fileutilo brand + conversion-focused landing page ---------- */'); j = s.index('.seo-about{max-width:760px')
css = r'''/* ---------- Brand themes: data-brand="navy" | "green" on <html> ---------- */
:root{--hero:#00463c;--hero2:#0a6b58;--heroInk:#cde3d9;--heroInk2:#e5f1eb;--accent:#c9ec8a;--accentH:#e6f5c8;--accentInk:#103e34;
 --tile:#c9ec8a;--tileFold:#9fd067;--tileInk:#00463c;--okBg:rgba(201,236,138,.14);--okInk:#c9ec8a;--card2:linear-gradient(145deg,#00463c,#0b6654)}
:root[data-brand=navy]{
 --bg:light-dark(#eef1f7,#0a0f1c);--sheet:light-dark(#ffffff,#121a2b);--panel:light-dark(#f4f6fb,#172136);--line:light-dark(#dde3ee,#26324a);
 --ink:light-dark(#0f172a,#e6ebf5);--mute:light-dark(#5b6478,#9aa6bd);
 --green:#1d4ed8;--green2:light-dark(#2457d6,#8fb0ff);--lime:#e3ebff;--limeD:#8fb0ff;
 --code:#0c1222;--codeInk:#dbe4f5;--codeLine:#202b44;
 --sh:0 1px 2px rgba(10,20,50,.06),0 8px 24px -8px rgba(10,20,50,.16);--sh2:0 2px 4px rgba(10,20,50,.08),0 22px 48px -16px rgba(10,20,50,.3);
 --hero:#101a33;--hero2:#1f3a73;--heroInk:#c3cde3;--heroInk2:#e3e9f6;--accent:#4f8cff;--accentH:#6b9dff;--accentInk:#ffffff;
 --tile:#4f8cff;--tileFold:#2d6be8;--tileInk:#ffffff;--okBg:rgba(34,197,94,.14);--okInk:#4ade80;--card2:linear-gradient(145deg,#101a33,#1f3a73)}
.hero{background-color:var(--hero);background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px),radial-gradient(120% 90% at 85% 10%,var(--hero2) 0,transparent 60%)}
.hero p{color:var(--heroInk)}nav a{color:var(--heroInk)}.badges span{color:var(--heroInk2)}
/* logo: page with folded corner and an F — reads at 16 px */
.logo{width:46px;height:46px;border-radius:13px;background:var(--tile);display:grid;place-items:center;box-shadow:0 6px 18px -6px rgba(0,0,0,.45)}
.mark .m-page{fill:var(--tileInk)}.mark .m-fold{fill:var(--tileFold)}.mark .m-f{stroke:var(--tile)}
.brand{gap:12px;flex-wrap:wrap}.brand .bname{font:700 20px 'Inter Tight',Inter,sans-serif;color:#fff;letter-spacing:-.01em}
.pbadge{font:700 10.5px Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--okInk);background:var(--okBg);border:1px solid color-mix(in srgb,var(--okInk) 35%,transparent);padding:5px 10px;border-radius:99px}
.hero h1{max-width:760px}.hero h1 em{font-style:normal;color:var(--limeD)}
.home-kicker{display:block;font:700 11px/1.4 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--green2);margin-bottom:9px}
.hero-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:22px}
.hero-cta,.hero-secondary{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:46px;padding:0 20px;border-radius:12px;text-decoration:none;font:700 15px Inter,sans-serif;transition:transform .18s,background .18s}
.hero-cta{background:var(--accent);color:var(--accentInk);box-shadow:0 10px 24px -12px rgba(0,0,0,.6)}.hero-cta:hover{transform:translateY(-2px);background:var(--accentH)}
.hero-secondary{color:#fff;border:1px solid rgba(255,255,255,.32);background:rgba(255,255,255,.06)}.hero-secondary:hover{background:rgba(255,255,255,.14)}
.ticks{list-style:none;display:flex;flex-wrap:wrap;gap:6px 18px;margin:18px 0 0;padding:0;font-size:13.5px;color:var(--heroInk2)}
.ticks li::before{content:"✓";color:var(--okInk);font-weight:800;margin-right:6px}
.hero-cta:focus-visible,.hero-secondary:focus-visible,.tcard:focus-visible,.hbtn:focus-visible,.pcta a:focus-visible{outline:3px solid var(--coral);outline-offset:3px}
/* scene colours follow the brand */
.scene .s-floor{fill:color-mix(in srgb,var(--hero) 70%,#000)}.scene .s-tint{fill:var(--lime)}.scene .s-ok{fill:var(--limeD)}
/* home */
.home-page{padding:4px 0 30px}
.home-trust{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:8px 0 10px;padding:17px 20px;background:var(--panel);border:1px solid var(--line);border-radius:16px}
.home-trust div{display:grid;gap:2px;padding-left:16px;border-left:1px solid var(--line)}.home-trust div:first-child{border:0;padding-left:0}
.home-trust b{font:700 18px 'Inter Tight',Inter,sans-serif;color:var(--ink)}.home-trust span{font-size:13px;color:var(--mute)}
.hsec{padding-top:46px;scroll-margin-top:12px}
.hhead{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:18px}
.hhead h2{font-size:clamp(26px,3.4vw,36px);letter-spacing:-.03em}.hhead>p{max-width:420px;margin:0;font-size:14px;color:var(--mute)}
.tgroup{margin-top:18px}.tgroup h4{font:700 13px Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin:0 0 10px}
.tgroup h4 span{font-weight:600;color:var(--green2);margin-left:4px}
.tgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.tcard{position:relative;display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--sheet);color:var(--ink);text-decoration:none;transition:transform .15s,border-color .15s,box-shadow .15s}
.tcard:hover{transform:translateY(-2px);border-color:var(--green2);box-shadow:var(--sh)}
.tico{flex:none;width:40px;height:40px;border-radius:11px;display:grid;place-items:center}
.ttx b{display:block;font:700 15px 'Inter Tight',Inter,sans-serif}.ttx small{display:block;font-size:12.5px;color:var(--mute);line-height:1.4;margin-top:2px}
.tfree{font:700 9.5px Inter,sans-serif;font-style:normal;letter-spacing:.06em;text-transform:uppercase;color:var(--green2);background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:2px 7px;white-space:nowrap}
.tcard .tfree{position:absolute;top:9px;right:9px}
.c-pdf .tico{background:light-dark(#ffe9e5,#3a1d19);color:light-dark(#c4361f,#ff9d8a)}
.c-img .tico{background:light-dark(#efe8ff,#2a2145);color:light-dark(#6b3fd1,#c3a8ff)}
.c-doc .tico{background:light-dark(#e5efff,#1b2848);color:light-dark(#2459c7,#9dbcff)}
.c-data .tico{background:light-dark(#e2f6e8,#163224);color:light-dark(#1d7a45,#86dca6)}
.c-arch .tico{background:light-dark(#fff3d6,#3a2e12);color:light-dark(#a86a00,#f3c56b)}
.how{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:26px;align-items:center}
.hsteps{list-style:none;counter-reset:st;margin:0;padding:0;display:grid;gap:18px}
.hsteps li{counter-increment:st;position:relative;padding-left:52px}
.hsteps li::before{content:counter(st);position:absolute;left:0;top:0;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--green);color:#fff;font:700 15px Inter,sans-serif}
.hsteps b{font:700 18px 'Inter Tight',Inter,sans-serif}.hsteps p{margin:4px 0 0;color:var(--mute);font-size:14.5px}
.demo{margin:0;border-radius:14px;overflow:hidden;border:1px solid var(--line);background:var(--sheet);box-shadow:var(--sh2)}
.bframe{display:flex;align-items:center;gap:6px;padding:9px 12px;background:var(--panel);border-bottom:1px solid var(--line)}
.bframe span{width:10px;height:10px;border-radius:50%;background:var(--line)}.bframe i{font:500 12px var(--mono);font-style:normal;color:var(--mute);margin-left:10px;padding:3px 10px;background:var(--sheet);border-radius:6px}
.demo video{display:block;width:100%;height:auto;aspect-ratio:16/10;background:var(--panel)}
.demo figcaption{font-size:12.5px;color:var(--mute);padding:8px 12px}
.shots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:22px}
.shots figure{margin:0}.shots img{display:block;width:100%;height:auto;border-radius:12px;border:1px solid var(--line);box-shadow:var(--sh)}
.shots figcaption{font-size:13px;color:var(--mute);margin-top:7px;font-weight:600}
.pgrid{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.25fr);gap:14px}
.pstay,.pnet{border:1px solid var(--line);border-radius:16px;padding:20px;background:var(--sheet)}
.pstay{background:light-dark(#effaf2,#11261b);border-color:light-dark(#bfe6cc,#24513a)}
.pgrid h3{display:flex;align-items:center;gap:8px;font-size:19px;margin-bottom:10px}.pstay h3 svg{color:#16a34a}
.pstay ul{margin:0;padding-left:18px;display:grid;gap:6px;font-size:14.5px}.pstay p{margin:12px 0 0;font-size:13.5px;font-weight:600;color:light-dark(#166534,#86efac)}
.pnet table{width:100%;border-collapse:collapse;font-size:13.5px}.pnet th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);padding:0 8px 8px 0}
.pnet td{padding:9px 8px 9px 0;border-top:1px solid var(--line);vertical-align:top}.pnet td:first-child{font-weight:600;width:34%}.pnet td:nth-child(2){color:var(--mute)}
.pnet td.no{font-weight:700;color:light-dark(#15803d,#4ade80);white-space:nowrap}
.pproof{display:grid;grid-template-columns:1fr 1fr auto;gap:18px;align-items:start;margin-top:14px;padding:16px 18px;border-radius:14px;background:var(--panel);border:1px solid var(--line);font-size:13.5px;color:var(--mute)}
.pproof b{color:var(--ink)}.pproof a{color:var(--green2);font-weight:700;text-decoration:none;white-space:nowrap}
kbd{font:600 12px var(--mono);padding:1px 6px;border:1px solid var(--line);border-bottom-width:2px;border-radius:5px;background:var(--sheet);color:var(--ink)}
.fgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.fgrid>div{border:1px solid var(--line);border-radius:14px;padding:16px;background:var(--sheet)}.fgrid h3{font-size:17px}
.fgrid p{margin:12px 0 6px;font:700 10.5px Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}
.chips2{display:flex;flex-wrap:wrap;gap:5px}.chips2 i{font:600 11.5px var(--mono);font-style:normal;padding:3px 7px;border-radius:6px;background:var(--panel);border:1px solid var(--line)}
.fnote{font-size:13px;color:var(--mute);margin:12px 0 0}.fnote a{color:var(--green2)}
.ptable{overflow-x:auto;border:1px solid var(--line);border-radius:16px;background:var(--sheet)}
.ptable table{width:100%;border-collapse:collapse;font-size:14px;min-width:560px}
.ptable th,.ptable td{padding:11px 16px;text-align:left;border-top:1px solid var(--line)}.ptable thead th{border-top:0;font:700 14px 'Inter Tight',Inter,sans-serif}
.ptable td:first-child{color:var(--mute)}.ptable td svg{color:#16a34a;vertical-align:middle}
.ptable .pro{background:color-mix(in srgb,var(--green) 7%,transparent);font-weight:700}.ptable thead .pro{color:var(--green2)}
.pcta{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-top:12px;padding:14px 18px;border-radius:14px;background:var(--card2);color:#fff;font-size:14px}
.pcta a{display:inline-flex;gap:10px;align-items:center;padding:11px 16px;border-radius:11px;background:var(--accent);color:var(--accentInk);font-weight:700;text-decoration:none}
.help{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;margin-top:46px;padding:22px 24px!important;border:1px solid var(--line);border-radius:18px;background:var(--panel)}
.help h2{font-size:24px;letter-spacing:-.02em}.help p{margin:8px 0 0;font-size:14px;color:var(--mute);max-width:640px}.help .cmail{color:var(--green2);font-weight:700}
.hbtns{display:flex;gap:10px;flex-wrap:wrap}.hbtn{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:11px;background:var(--green);color:#fff;font-weight:700;font-size:14px;text-decoration:none}
.hbtn.ghost{background:transparent;color:var(--green2);border:1px solid var(--line)}
.home-faq{max-width:800px;margin:40px auto 0}.home-faq h3{font-size:24px;letter-spacing:-.02em;margin:0 0 10px}.home-faq details{border-top:1px solid var(--line);padding:13px 0}
.home-faq summary{cursor:pointer;font-weight:600}.home-faq details p{color:var(--mute);font-size:14px;margin:8px 0 0}
@media(max-width:980px){.how,.pgrid{grid-template-columns:minmax(0,1fr)}.fgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.pproof{grid-template-columns:minmax(0,1fr)}}
@media(max-width:860px){.home-trust{grid-template-columns:repeat(2,minmax(0,1fr))}.home-trust div:nth-child(3){border:0;padding-left:0}.hhead{flex-direction:column;align-items:flex-start;gap:8px}.shots{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.shots figure:last-child{display:none}}
@media(max-width:600px){.hero-actions{gap:8px}.hero-cta,.hero-secondary{flex:1;padding:0 12px;font-size:14px}.fgrid{grid-template-columns:minmax(0,1fr)}.shots{grid-template-columns:minmax(0,1fr)}.shots figure:last-child{display:block}
 .pnet table,.pnet tbody,.pnet tr,.pnet td{display:block;width:auto!important}.pnet thead{display:none}.pnet tr{border-top:1px solid var(--line);padding:8px 0}.pnet td{border:0;padding:2px 0}.pnet td.no::before{content:"Contains your files: "}
 .help{padding:18px!important}}
@media(prefers-reduced-motion:reduce){.tcard,.hero-cta,.hero-secondary{transition:none}}
@media (pointer:coarse){.pproof a,.fnote a{display:inline-flex;align-items:center;min-height:44px}}
'''
s = s[:i] + css + s[j:]

# ---------- 4. scene: brand-coloured parts ----------
rep('<ellipse cx="215" cy="226" rx="190" ry="12" fill="#00342c"/>', '<ellipse class="s-floor" cx="215" cy="226" rx="190" ry="12"/>')
rep('<rect x="40" y="154" width="88" height="28" rx="6" fill="#e6f5c8"/>', '<rect class="s-tint" x="40" y="154" width="88" height="28" rx="6"/>')
rep('<text x="214" y="179" font-family="Inter" font-size="10" font-weight="600" fill="#c9ec8a" text-anchor="middle">', '<text class="s-ok" x="214" y="179" font-family="Inter" font-size="10" font-weight="600" text-anchor="middle">')

# ---------- 5. tool-page heading + home heading in JS ----------
rep("h1.innerHTML=m.h?esc(m.h)+'<br><em>Free &amp; private.</em>':'Less file busywork.<br><em>More work, done.</em>';",
    "h1.innerHTML=m.h?esc(m.h)+'<br><em>Free &amp; private.</em>':'Your files. Your device.<br><em>Your control.</em>';")

# ---------- 6. "/#section" links: stay in the app, then scroll ----------
rep("const raw=a.getAttribute('href');const m=/^\\/([a-z0-9-]*)\\/?$/.exec(raw);if(!m)return;const id=m[1]||'home';if(!isRoute(id))return;\n  e.preventDefault();go(id)});",
    "const raw=a.getAttribute('href');const sec=/^\\/#([a-z-]+)$/.exec(raw);\n  if(sec&&!isRoute(sec[1])&&location.protocol!=='file:'){const el=document.getElementById(sec[1]);if(!el)return;e.preventDefault();if(location.pathname!=='/'||curRoute())go('home');el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});return}\n  const m=/^\\/([a-z0-9-]*)\\/?$/.exec(raw);if(!m)return;const id=m[1]||'home';if(!isRoute(id))return;\n  e.preventDefault();go(id)});")

# ---------- 7. demo video plays only while visible ----------
rep("document.querySelectorAll('.toolcount').forEach(",
    "(()=>{const v=document.getElementById('demoVideo');if(!v||!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion:reduce)').matches){if(v)v.controls=true;return}\n  new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){if(v.preload==='none')v.preload='auto';v.play().catch(()=>{v.controls=true})}else v.pause()}),{threshold:.35}).observe(v)})();\ndocument.querySelectorAll('.toolcount').forEach(")

# ---------- 8. brand attribute (build sets it; default green) ----------
s = s.replace('<html lang="en">', '<html lang="en" data-brand="green">', 1)
P.write_text(s, encoding='utf-8')
print('ok')
