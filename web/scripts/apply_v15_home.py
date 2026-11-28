# Fileutilo 15, step 2: the new home page (search, popular tasks, recent & favourites for signed-in users,
# tools grouped by job, new footer). Run after apply_v15_tools.py and seo_content.py.
# Re-running only refreshes the tool grid between <!--grid:start--> and <!--grid:end-->.
import pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import importlib, landing_parts
importlib.reload(landing_parts)
from landing_parts import task_grid

P = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:110])
    s = s.replace(a, b)

GRID = '<!--grid:start-->\n' + task_grid() + '\n<!--grid:end-->'
if '<!--grid:start-->' in s:
    s = re.sub(r'<!--grid:start-->[\s\S]*?<!--grid:end-->', lambda m: GRID, s)
    P.write_text(s, encoding='utf-8'); print('tool grid refreshed'); raise SystemExit

POP_GLOBAL = [('JPG to PDF', 'jpg-to-pdf'), ('PDF to JPG', 'pdf-to-jpg'), ('Word to PDF', 'word-to-pdf'), ('PDF to Word', 'pdf-to-word'),
              ('PowerPoint to PDF', 'powerpoint-to-pdf'), ('PDF to PowerPoint', 'pdf-to-powerpoint'), ('Excel to PDF', 'excel-to-pdf'),
              ('Merge PDF', 'merge-pdf'), ('Compress PDF', 'compress-pdf'), ('Edit PDF', 'edit-pdf'), ('Sign PDF', 'sign-pdf'), ('HEIC to JPG', 'heic-to-jpg')]
POP_INDIA = [('JPG to PDF', 'jpg-to-pdf'), ('PDF to JPG', 'pdf-to-jpg'), ('Word to PDF', 'word-to-pdf'), ('PDF to Word', 'pdf-to-word'),
             ('PowerPoint to PDF', 'powerpoint-to-pdf'), ('PDF to PowerPoint', 'pdf-to-powerpoint'), ('Merge PDF', 'merge-pdf'), ('Compress PDF', 'compress-pdf'),
             ('Compress PDF to 200 KB', 'compress-pdf-to-200kb'), ('Compress photo to 50 KB', 'compress-image-to-50kb'),
             ('Passport size photo', 'passport-size-photo'), ('Mask Aadhaar', 'mask-aadhaar')]
chips = ''.join(f'<a role="listitem" href="{u}">{n}</a>' for n, u in POP_GLOBAL)
SEARCH_I = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'

# ---------- 1. hero: subline, search and popular tasks instead of the buttons and ticks ----------
rep('''<p>One simple workspace for PDFs, documents, images and data. Get work done without sending your files to a server.</p>
<div class="hero-actions"><a class="hero-cta" href="./#tools">Explore tools <span aria-hidden="true">→</span></a><a class="hero-secondary" href="./#how">See how it works</a></div>
<ul class="ticks"><li>No installation</li><li>Files processed in your browser</li><li><span class="toolcount" data-suffix=" useful tools">31 useful tools</span></li><li>Free to start</li></ul>''',
f'''<p>One simple workspace for PDFs, documents, PowerPoint, images and data — free to start, and your files never leave your device.</p>
<form class="hsearch" role="search" action="./" onsubmit="return false"><label for="hq" class="sr-only">Search tools</label>{SEARCH_I}<input id="hq" type="search" autocomplete="off" spellcheck="false" enterkeyhint="go" placeholder="Search tools — try “compress”, “sign” or “excel”" role="combobox" aria-expanded="false" aria-controls="hqList" aria-autocomplete="list"><ul id="hqList" class="hqlist" role="listbox" aria-label="Matching tools" hidden></ul></form>
<div class="hpop"><span class="hpop-k" id="hpopK">Popular tasks</span><div class="hchips" id="hchips" role="list" aria-labelledby="hpopK">{chips}</div></div>''')

# ---------- 2. styles ----------
rep(':root[data-view=tool] .hero .scene,:root[data-view=tool] .hero .heroin p,:root[data-view=tool] .hero-actions,:root[data-view=tool] .ticks,',
    ':root[data-view=tool] .hero .scene,:root[data-view=tool] .hero .heroin p,:root[data-view=tool] .hero-actions,:root[data-view=tool] .ticks,:root[data-view=tool] .hsearch,:root[data-view=tool] .hpop,:root[data-view=page] .hsearch,:root[data-view=page] .hpop,')
CSS = '''
/* ---------- Fileutilo 15 home: search, popular tasks, job groups, favourites, footer ---------- */
.hsearch{position:relative;display:flex;align-items:center;gap:12px;max-width:640px;margin:22px 0 0;background:#fff;color:#0f1a16;border-radius:16px;padding:4px 10px 4px 18px;box-shadow:0 14px 34px -14px rgba(0,0,0,.55)}
.hsearch>svg{flex:none;color:#4b5a55}.hsearch:focus-within{outline:3px solid var(--limeD);outline-offset:2px}
.hsearch input{flex:1;min-width:0;border:0;outline:0;font:500 17px Inter,sans-serif;padding:13px 0;background:transparent;color:#0f1a16;min-height:48px}
.hsearch input::placeholder{color:#5f6d67}
.hqlist{position:absolute;left:0;right:0;top:calc(100% + 8px);margin:0;padding:6px;list-style:none;background:var(--sheet);color:var(--ink);border:1px solid var(--line);border-radius:16px;box-shadow:var(--sh2);z-index:30;max-height:min(60vh,440px);overflow:auto}
.hqlist a{display:flex;flex-direction:column;gap:2px;padding:10px 14px;border-radius:10px;color:inherit;text-decoration:none}
.hqlist a b{font:600 15px Inter,sans-serif}.hqlist a small{color:var(--mute);font-size:13px}
.hqlist [aria-selected=true] a,.hqlist a:hover{background:var(--panel)}.hqlist .none{padding:12px 14px;color:var(--mute);font-size:14px}
.hpop{margin:18px 0 6px;max-width:860px}
.hpop-k{display:block;font:700 11px/1.4 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--heroInk,#cde3d9);margin-bottom:10px}
.hchips{display:flex;flex-wrap:wrap;gap:8px}
.hchips a{display:inline-flex;align-items:center;min-height:40px;padding:0 15px;border-radius:99px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.24);color:#fff;font:600 14px Inter,sans-serif;text-decoration:none;transition:background .15s}
.hchips a:hover,.hchips a:focus-visible{background:rgba(255,255,255,.22)}
.jgroup{display:grid;grid-template-columns:minmax(170px,230px) minmax(0,1fr);gap:22px;align-items:start;border-top:1px solid var(--line);padding:22px 0 8px;scroll-margin-top:12px}
.jgroup:first-of-type{border-top:0;padding-top:4px}
.jhead h3{font:800 22px/1.15 'Inter Tight',Inter,sans-serif;letter-spacing:-.02em;margin:2px 0 4px}.jhead p{margin:0;font-size:14px;color:var(--mute)}
.jnum{font:700 13px Inter,sans-serif;color:var(--green2)}
.jgroup .tgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.tcw{position:relative;display:flex}.tcw .tcard{flex:1;padding-right:46px}
.tstar{display:none;position:absolute;top:6px;right:6px;width:40px;height:40px;min-height:40px;padding:0;border:0;border-radius:10px;background:transparent;color:var(--mute);cursor:pointer;place-items:center}
.tstar svg path{fill:none}.tstar[aria-pressed=true]{color:#b7791f}.tstar[aria-pressed=true] svg path{fill:#f5b72d}
.tstar:hover{background:var(--panel)}.tstar:focus-visible{outline:3px solid var(--coral);outline-offset:1px}
:root.can-fav .tstar{display:grid}
.c-ppt .tico{background:light-dark(#ffe6dc,#3b2016);color:light-dark(#b8410e,#ffab85)}
.mgrid.mine2{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)}
.nudge{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;margin-top:34px;padding:18px 22px;border-radius:18px;background:var(--panel);border:1px solid var(--line)}
.nudge p{margin:0;font-size:16px}.nudge .pri{min-height:44px}
footer .fcols{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:26px;text-align:left;max-width:1100px;margin:0 auto 22px}
footer .fcols h2{font:700 14px Inter,sans-serif;margin:0 0 8px;color:var(--ink)}footer .fcols p{margin:0 0 6px;font-size:14px;line-height:1.55;color:var(--mute)}
footer .fcols a{color:var(--green2)}footer .fcols .flegal{display:flex;flex-direction:column;align-items:flex-start;gap:6px;font-size:14px}
footer .fbrand{font:800 18px 'Inter Tight',Inter,sans-serif;color:var(--ink);display:block;margin-bottom:6px}
footer .fbottom{border-top:1px solid var(--line);padding-top:16px;max-width:1100px;margin:0 auto}
@media(max-width:720px){.jgroup{grid-template-columns:minmax(0,1fr);gap:12px}.mgrid.mine2{grid-template-columns:minmax(0,1fr)}.hsearch input{font-size:16px}}
'''
rep('</style>\n<!-- Vercel Web Analytics', CSS + '</style>\n<!-- Vercel Web Analytics')

# ---------- 3. home sections ----------
rep('''  <div class="home-trust">
    <div><b class="toolcount-n">31</b><span>tools in one workspace</span></div>
    <div><b>0 uploads</b><span>your files stay in your browser</span></div>
    <div><b>No install</b><span>works on phone and computer</span></div>
    <div><b>Free to start</b><span>Pro when you need more</span></div>
  </div>
''', '')
rep('''  <div class="hsec mine" id="mine" hidden>
    <div class="hhead"><div><span class="home-kicker">ON THIS DEVICE</span><h2>Pick up where you left off</h2></div>
      <p>Favourites and recent activity are kept only in this browser — never on our servers. <button type="button" class="linkb findtool">Find a tool <kbd>/</kbd></button></p></div>
    <div class="mgrid"><div class="mcard"><h3>Favourites</h3><div class="mine-favs"></div></div>
      <div class="mcard"><h3>Recent activity</h3><ul class="mine-recent"></ul>
        <div class="row mine-ctl"><button type="button" class="linkb mine-clear">Clear</button><label class="chk"><input type="checkbox" class="mine-off">Don’t keep recent activity on this device</label></div></div></div>
  </div>''',
'''  <div class="hsec mine" id="mine" hidden>
    <div class="hhead"><div><span class="home-kicker">YOUR TOOLS</span><h2>Pick up where you left off</h2></div>
      <p>Your recent tools and favourites are kept only in this browser — never on our servers. <button type="button" class="linkb findtool">Find a tool <kbd>/</kbd></button></p></div>
    <div class="mgrid mine2"><div class="mcard"><h3>Recently used</h3><ul class="mine-recent"></ul>
        <div class="row mine-ctl"><button type="button" class="linkb mine-clear">Clear</button><label class="chk"><input type="checkbox" class="mine-off">Don’t keep recent activity on this device</label></div></div>
      <div class="mcard"><h3>Favourites</h3><div class="mine-favs"></div></div></div>
  </div>
  <div class="nudge" id="nudge" hidden><p>Sign in to keep your recently used and favourite tools one click away.</p><button type="button" class="pri nudge-in">Sign in</button></div>''')
i = s.index('<div class="hhead"><div><span class="home-kicker">THE TOOLKIT</span><h2>31 tools. One private workspace.</h2></div>')
j = s.index('<!--seo:popular-->', i)
s = s[:i] + '''<div class="hhead"><div><span class="home-kicker">THE TOOLKIT</span><h2>What do you want to do?</h2></div>
      <p>All <span class="toolcount-n">37</span> tools, grouped by job — each has its own page you can bookmark. Tools marked <em class="tfree">No limit</em> are free without daily limits.</p></div>
''' + GRID + '\n' + s[j:]
for a, b in [('Open any of the 31 tools', 'Open any of the <span class="toolcount-n">37</span> tools'),
             ('This is true for all 31 tools,', 'This is true for all <span class="toolcount-n">37</span> tools,'),
             ('<tr><td>All 31 tools</td>', '<tr><td>All <span class="toolcount-n">37</span> tools</td>'),
             ('No. All 31 tools process', 'No. All <span class="toolcount-n">37</span> tools process')]:
    rep(a, b)
s = s.replace('31 free online tools to convert, merge, split, compress and clean PDFs, Word, Excel, images and data.',
              '37 free online tools to convert, merge, split, compress and clean PDFs, Word, Excel, PowerPoint, images and data.')

# ---------- 4. footer with the privacy statement and company details ----------
rep('''<footer>© <span id="yr">2026</span> Kalaburagi Labs. All rights reserved.<br><span class="fsub">Fileutilo — a practical, privacy-first file workspace by Kalaburagi Labs.</span><br><span class="flinks fapp"><button type="button" class="linkb installbtn" hidden>⤓ Install app</button><button type="button" class="linkb findtool">Find a tool <kbd>/</kbd></button><button type="button" class="linkb kbdhint">Keyboard shortcuts <kbd>?</kbd></button></span><br><span class="flinks"><a href="pricing">Pricing</a><a href="privacy">Privacy</a><a href="terms">Terms</a><a href="refunds">Refunds</a></span><!--seo:toollinks--></footer>''',
'''<footer><div class="fcols">
 <div><span class="fbrand">Fileutilo</span><p>Private file tools for PDF, Word, Excel, PowerPoint, images and data — they run in your browser.</p></div>
 <div><h2>Your privacy</h2><p>Your files are processed in your browser and are never uploaded to our servers. If you sign in, we keep only your account, plan, credits and daily task counts — never your files or their names.</p><a href="privacy">Read the privacy policy</a></div>
 <div><h2>Company</h2><p>Fileutilo is a product of Kalaburagi Labs.</p><p><a href="mailto:support@fileutilo.com">support@fileutilo.com</a></p></div>
 <div class="flegal" role="navigation" aria-label="Plans and legal"><h2>Plans &amp; legal</h2><a href="pricing">Pricing</a><a href="terms">Terms of use</a><a href="refunds">Refund policy</a><a href="privacy">Privacy policy</a></div>
</div>
<div class="fbottom">© <span id="yr">2026</span> Kalaburagi Labs. All rights reserved.<br><span class="flinks fapp"><button type="button" class="linkb installbtn" hidden>⤓ Install app</button><button type="button" class="linkb findtool">Find a tool <kbd>/</kbd></button><button type="button" class="linkb kbdhint">Keyboard shortcuts <kbd>?</kbd></button></span></div><!--seo:toollinks--></footer>''')

# ---------- 5. header: All tools · Pricing · Privacy · Sign in; signed-in state for the page ----------
rep('bar.innerHTML=`<a href="pricing" class="plink">Pricing</a><button id="acctBtn">Sign in</button>`;',
    'bar.innerHTML=`<a href="./#tools" class="plink">All tools</a><a href="pricing" class="plink">Pricing</a><a href="privacy" class="plink">Privacy</a><button id="acctBtn">Sign in</button>`;')
rep("function renderBar(){const b=$('acctBtn');",
    "function renderBar(){const b=$('acctBtn');const R=document.documentElement;R.classList.toggle('signed-in',!!S.session);R.classList.toggle('can-fav',!!S.session||!LIVE);try{paintMine()}catch(e){}")

# ---------- 6. behaviour: who sees recent & favourites, tile stars, home search, popular tasks by region ----------
rep("function paintMine(){const box=$('mine');if(!box)return;const f=favs(),r=recentOn()?LS.get('fu_recent',[]).filter(x=>palOf(x.k)):[];\n  box.hidden=!f.length&&!r.length&&recentOn();",
    "function paintMine(){const box=$('mine');if(!box)return;const f=favs(),r=recentOn()?LS.get('fu_recent',[]).filter(x=>palOf(x.k)):[];\n"
    "  const live=!!(window.FB&&FB.isLive()),signed=!!(window.FB&&FB.state&&FB.state.session);   // with accounts on: signed-in users only\n"
    "  box.hidden=live?!signed:(!f.length&&!r.length&&recentOn());const nd=$('nudge');if(nd)nd.hidden=!(live&&!signed);\n"
    "  document.documentElement.classList.toggle('can-fav',signed||!live);try{paintStars()}catch(e){}")
rep("box.querySelector('.mine-favs').innerHTML=f.length?f.map(k=>`<a class=\"mchip\" href=\"${routeUrl(k)}\">${STAR}${esc(nameOf(k))}</a>`).join(''):'<p class=\"note\">Tap the ☆ next to a tool’s name to pin it here.</p>';",
    "box.querySelector('.mine-favs').innerHTML=f.length?f.map(k=>`<a class=\"mchip\" href=\"${routeUrl(k)}\">${STAR}${esc(nameOf(k))}</a>`).join(''):'<p class=\"note\">Tap the ☆ on any tool to pin it here.</p>';")
rep("function paintStars(){const f=favs();",
    "function paintStars(){const f=favs();document.querySelectorAll('.tstar').forEach(b=>{const on=f.includes(b.dataset.k);b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',(on?'Remove ':'Add ')+nameOf(b.dataset.k)+(on?' from':' to')+' favourites')});")
HOME_JS = r'''
/* ---------- home: stars on tool tiles, sign-in prompt, search box, popular tasks for India ---------- */
document.addEventListener('click',e=>{const st=e.target.closest('.tstar');if(st){e.preventDefault();const on=toggleFav(st.dataset.k);toast(on?`${nameOf(st.dataset.k)} added to favourites`:`${nameOf(st.dataset.k)} removed from favourites`);return}
  if(e.target.closest('.nudge-in')&&window.FB)FB.openAuth()});
(()=>{const inp=$('hq'),list=$('hqList');if(!inp||!list)return;let hits=[],sel=-1;if(matchMedia('(max-width:600px)').matches)inp.placeholder='Search tools…';
  const close=()=>{list.hidden=true;inp.setAttribute('aria-expanded','false');inp.removeAttribute('aria-activedescendant');sel=-1};
  const paint=()=>{const q=inp.value.trim();if(!q){close();return}hits=cmdSearch(q);
    list.innerHTML=hits.length?hits.map((p,i)=>`<li role="option" id="hq-${i}" aria-selected="${i===sel}"><a href="${routeUrl(p[0])}" tabindex="-1"><b>${esc(p[1])}</b><small>${esc(p[2])}</small></a></li>`).join(''):'<li class="none" role="option" aria-disabled="true">No tool matches that yet — try a file type like “pdf”, “pptx” or “png”.</li>';
    list.hidden=false;inp.setAttribute('aria-expanded','true');if(sel>=0)inp.setAttribute('aria-activedescendant','hq-'+sel);else inp.removeAttribute('aria-activedescendant')};
  const go=k=>{close();inp.value='';const a=document.createElement('a');a.href=routeUrl(k);document.body.appendChild(a);a.click();a.remove()};   // in-app navigation
  inp.addEventListener('input',()=>{sel=-1;paint()});
  inp.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(!hits.length)return;e.preventDefault();sel=(sel+(e.key==='ArrowDown'?1:-1)+hits.length)%hits.length;paint()}
    else if(e.key==='Enter'){const h=hits[sel>=0?sel:0];if(h&&inp.value.trim()){e.preventDefault();go(h[0])}}else if(e.key==='Escape'){if(!list.hidden){e.stopPropagation();close()}}});
  list.addEventListener('mousedown',e=>{const a=e.target.closest('a');if(a){e.preventDefault();const i=+a.parentElement.id.slice(3);if(hits[i])go(hits[i][0])}});
  inp.addEventListener('blur',()=>setTimeout(close,120))})();
(()=>{const box=$('hchips');if(!box)return;let tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
  const india=/^Asia\/(Kolkata|Calcutta)$/.test(tz)||(navigator.languages||[navigator.language]).some(l=>/-IN$/i.test(l||''));
  if(india)box.innerHTML=POP_IN.map(([n,u])=>`<a role="listitem" href="${u}">${esc(n)}</a>`).join('')})();
paintStars();
'''
POP_IN_JS = 'const POP_IN=' + repr([list(x) for x in POP_INDIA]).replace("'", '"') + ';'
rep("window.fuAfterRoute=(h,k)=>{ensureStar(h,k||h);if(h==='home')paintMine()};\npaintMine();\n",
    "window.fuAfterRoute=(h,k)=>{ensureStar(h,k||h);if(h==='home')paintMine()};\npaintMine();\n" + POP_IN_JS + HOME_JS)

P.write_text(s, encoding='utf-8')
print('home page updated:', s.count('class="tcw"'), 'tool tiles')
