# Fileutilo 15, step 3: the home page takes the finalized design 11 look — light warm page, white header bar,
# black headline, outlined search, white chips, Recently used / Favourites cards with tiles, pastel tiles per job,
# dark footer. Scoped to the home view (tool pages keep their compact header). Run after apply_v15_home.py.
import pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')
if '/*look-v15*/' in s:
    raise SystemExit('already applied')

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:110])
    s = s.replace(a, b)

# Outfit, the design's typeface
rep('family=Inter+Tight:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap',
    'family=Inter+Tight:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Outfit:wght@400;500;600;700;800&display=swap')

# "Private by design" sits above the headline on the home page
rep('<h1>Your files. Your device.<br><em>Your control.</em></h1>',
    '<span class="hbadge">Private by design</span>\n<h1>Your files. Your device.<br><em>Your control.</em></h1>')

# Recently used / Favourites: card headers with a short note
rep('<div class="mgrid mine2"><div class="mcard"><h3>Recently used</h3><ul class="mine-recent"></ul>',
    '<div class="mgrid mine2"><div class="mcard"><div class="mch"><h3>Recently used</h3><span>Kept in this browser</span></div><ul class="mine-recent"></ul>')
rep('<div class="mcard"><h3>Favourites</h3><div class="mine-favs"></div></div></div>',
    '<div class="mcard"><div class="mch"><h3>Favourites</h3><span>Tap ☆ on any tool to pin it</span></div><div class="mine-favs"></div></div></div>')

# tiles (icon + name) instead of chips and text rows
rep("box.querySelector('.mine-favs').innerHTML=f.length?f.map(k=>`<a class=\"mchip\" href=\"${routeUrl(k)}\">${STAR}${esc(nameOf(k))}</a>`).join(''):'<p class=\"note\">Tap the ☆ on any tool to pin it here.</p>';",
    "const tileOf=(k,sub)=>{const w=document.querySelector(`#tools .tcw[data-k=\"${k}\"]`);const ic=w?w.querySelector('.tico').innerHTML:'';const g=w?w.closest('.jgroup').id:'';\n"
    "    return `<a class=\"mtile\" data-g=\"${g}\" href=\"${routeUrl(k)}\"><span class=\"mico\">${ic}</span><span class=\"mtx\"><b>${esc(nameOf(k))}</b>${sub?`<small>${sub}</small>`:''}</span></a>`};\n"
    "  box.querySelector('.mine-favs').innerHTML=f.length?`<div class=\"mtiles\">${f.map(k=>tileOf(k)).join('')}</div>`:'<p class=\"note\">Tap the ☆ on any tool to pin it here.</p>';")
rep("list.innerHTML=!recentOn()?'<p class=\"note\">Recent activity is turned off on this device.</p>':r.length?r.slice(0,6).map(x=>`<li><a href=\"${routeUrl(x.k)}\"><b>${esc(nameOf(x.k))}</b><span>${x.n?`${x.n} file${x.n>1?'s':''} → `:''}${esc(x.o.join(', '))}${x.m>x.o.length?` +${x.m-x.o.length} more`:''}</span></a><time datetime=\"${new Date(x.at).toISOString()}\">${ago(x.at)}</time></li>`).join(''):'<p class=\"note\">Tools you use will appear here.</p>';",
    "const seen=new Set(),ru=r.filter(x=>!seen.has(x.k)&&seen.add(x.k)).slice(0,6);\n"
    "  list.innerHTML=!recentOn()?'<li class=\"note\">Recent activity is turned off on this device.</li>':ru.length?ru.map(x=>`<li>${tileOf(x.k,`<time datetime=\"${new Date(x.at).toISOString()}\">${ago(x.at)}</time>`)}</li>`).join(''):'<li class=\"note\">Tools you use will appear here.</li>';")

CSS = '''
/*look-v15*/
/* ---------- home page: the finalized design 11 look ---------- */
:root[data-view=home]{--bg:light-dark(#f8f7f4,#131210);--sheet:light-dark(#ffffff,#1d1b18);--panel:light-dark(#f1eee7,#26231f);--line:light-dark(#e6e3dc,#36322c);
  --ink:light-dark(#1a1a1a,#f2efe8);--mute:light-dark(#5a5850,#b6b0a4);--green2:light-dark(#a8361d,#ff9d86)}
:root[data-view=home] body{background:var(--bg);font-family:Outfit,Inter,system-ui,sans-serif}
:root[data-view=home] .hero{background:var(--bg);background-image:none;color:var(--ink);padding:16px max(5vw,16px) 0}
:root[data-view=home] .hero::before{content:"";position:absolute;left:0;right:0;top:0;height:78px;background:var(--sheet);border-bottom:1px solid var(--line)}
:root[data-view=home] .hero .scene,:root[data-view=home] #catnav,:root[data-view=home] .brand .pbadge{display:none}
:root[data-view=home] .top,:root[data-view=home] .heroin{max-width:1200px}:root[data-view=home] .heroin{grid-template-columns:minmax(0,1fr)}
:root[data-view=home] .brand{margin-bottom:46px;min-height:46px}
:root[data-view=home] .logo{width:40px;height:40px;border-radius:11px;background:light-dark(#1a1a1a,#f2efe8);color:light-dark(#fff,#1a1a1a);box-shadow:none}
:root[data-view=home] .brand .bname{color:var(--ink);font:700 22px Outfit,'Inter Tight',sans-serif}
.hbadge{display:none}
:root[data-view=home] .hbadge{display:inline-block;font:700 13px Outfit,Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:6px 12px;border-radius:999px;
  border:1.5px solid light-dark(#1d6630,#7fd99b);background:light-dark(#e3f5e5,#16301d);color:light-dark(#1d6630,#9fe6b4);margin-bottom:16px}
:root[data-view=home] .hero h1{font:700 clamp(40px,6vw,62px)/1.02 Outfit,'Inter Tight',sans-serif;letter-spacing:-.03em;color:var(--ink);max-width:900px;margin:0}
:root[data-view=home] .hero h1 em{color:inherit}
:root[data-view=home] .hero p{color:var(--mute);font-size:19px;max-width:820px;margin-top:14px}
:root[data-view=home] .hsearch{max-width:760px;margin-top:26px;background:var(--sheet);color:var(--ink);border:2px solid var(--ink);border-radius:18px;box-shadow:0 10px 30px rgba(26,26,26,.08)}
:root[data-view=home] .hsearch>svg,:root[data-view=home] .hsearch input{color:var(--ink)}:root[data-view=home] .hsearch input::placeholder{color:var(--mute)}
:root[data-view=home] .hsearch:focus-within{outline:3px solid #ff6f59;outline-offset:2px}
:root[data-view=home] .hpop{margin:22px 0 8px;max-width:1000px}:root[data-view=home] .hpop-k{color:var(--mute);font-family:Outfit,Inter,sans-serif}
:root[data-view=home] .hchips a{min-height:44px;padding:0 18px;background:var(--sheet);border:1px solid light-dark(#dedad0,#3d3933);color:var(--ink);font:600 15px Outfit,Inter,sans-serif}
:root[data-view=home] .hchips a:hover,:root[data-view=home] .hchips a:focus-visible{border-color:var(--ink);background:var(--panel)}
:root[data-view=home] .acctbar{top:0}
:root[data-view=home] .acctbar a,:root[data-view=home] .acctbar button{background:transparent;border-color:transparent;color:var(--ink);font:500 16px Outfit,Inter,sans-serif}
:root[data-view=home] .acctbar a:hover,:root[data-view=home] .acctbar button:hover{background:var(--panel)}
:root[data-view=home] #acctBtn{background:#ff6f59;border-color:#ff6f59;color:#2b0a04;font-weight:700}
:root.signed-in[data-view=home] #acctBtn{background:transparent;border-color:transparent;color:var(--ink);font-weight:500}
:root[data-view=home] .acctbar .av{width:38px;height:38px;background:#ff6f59;color:#2b0a04;font:800 15px Outfit,Inter,sans-serif;margin-left:0}
:root[data-view=home] .acctbar .pb{display:none}
:root[data-view=home] .wrap{padding:0 max(5vw,16px)}
:root[data-view=home] main{max-width:1200px;background:transparent;box-shadow:none;border-radius:0;padding:6px 0 30px}
:root[data-view=home] .home-page h2,:root[data-view=home] .home-page h3{font-family:Outfit,'Inter Tight',sans-serif}
:root[data-view=home] .mine{padding-top:22px}:root[data-view=home] .mine .hhead{display:none}
:root[data-view=home] .mcard{background:var(--sheet);border:1px solid var(--line);border-radius:22px;padding:22px}
.mch{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:14px}.mch h3{margin:0!important;font-size:21px!important}.mch span{font-size:13.5px;color:var(--mute)}
.mtiles,.mine-recent{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;list-style:none;margin:0;padding:0}
.mtile{display:flex;gap:12px;align-items:center;min-height:64px;padding:10px 12px;border-radius:14px;background:var(--sheet);border:1px solid var(--line);color:var(--ink);text-decoration:none}
.mtile:hover{border-color:var(--ink)}.mtile b{font:600 15px/1.25 Outfit,Inter,sans-serif;display:block}.mtile small{font-size:12px;color:var(--mute)}
.mico{flex:none;width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:var(--jt,var(--panel));color:var(--jk,var(--ink))}
.mine-recent .note,.mine-favs .note{grid-column:1/-1;margin:0}
.mine-recent li{display:block;border:0;min-width:0}.mine-recent .mtile{display:flex;padding:10px 12px;min-height:64px}.mine-recent .mtile span.mtx{color:inherit;font-size:inherit;white-space:normal}
.mine-favs{display:block}.mtiles,:root .mine-recent{grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}.mtx{min-width:0}
:root[data-view=home] .mgrid.mine2{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
@media(max-width:720px){:root[data-view=home] .mgrid.mine2{grid-template-columns:minmax(0,1fr)}}
:root[data-view=home] .nudge{background:#1a1a1a;color:#fff;border:0;border-radius:20px;margin-top:30px}
:root[data-view=home] .nudge .pri{background:#ff6f59;color:#2b0a04;border-color:#ff6f59}
:root[data-view=home] #tools .hhead h2{font:700 clamp(28px,3.6vw,36px)/1.1 Outfit,sans-serif;letter-spacing:-.02em}
:root[data-view=home] .jgroup{grid-template-columns:minmax(200px,250px) minmax(0,1fr);gap:24px;padding:26px 0 8px}
:root[data-view=home] .jnum{font:700 15px Outfit,Inter,sans-serif;color:var(--jk)}
:root[data-view=home] .jhead h3{font:700 27px/1.1 Outfit,sans-serif;letter-spacing:-.01em;margin:4px 0 6px}:root[data-view=home] .jhead p{font-size:15px}
:root[data-view=home] .jgroup .tgrid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
:root[data-view=home] .jgroup .tcard{flex-direction:column;gap:10px;padding:18px 46px 20px 18px;border:0;border-radius:18px;background:var(--jt)}
:root[data-view=home] .jgroup .tcard:hover{transform:translateY(-3px);box-shadow:none}
:root[data-view=home] .jgroup .tico{width:auto;height:auto;background:transparent;color:var(--jk);justify-content:start}
:root[data-view=home] .jgroup .tico svg{width:30px;height:30px;stroke-width:1.7}
:root[data-view=home] .jgroup .ttx b{font:700 17px/1.25 Outfit,sans-serif;color:light-dark(#1a1a1a,#f2efe8)}
:root[data-view=home] .jgroup .ttx small{font-size:14px;line-height:1.4;color:light-dark(#3d3b35,#d6d0c4);margin-top:4px}
:root[data-view=home] .jgroup .tstar{color:light-dark(#5f5b52,#d6d0c4)}
#do-combine,[data-g=do-combine]{--jt:light-dark(#ffe7d6,#3a2416);--jk:light-dark(#9a3a06,#ffb48a)}
#do-smaller,[data-g=do-smaller]{--jt:light-dark(#dff1ff,#16293a);--jk:light-dark(#0b4f86,#8cc8ff)}
#do-protect,[data-g=do-protect]{--jt:light-dark(#e3f5e5,#17301d);--jk:light-dark(#1d6630,#8fe0a4)}
#do-convert,[data-g=do-convert]{--jt:light-dark(#efe5ff,#2a1f42);--jk:light-dark(#5626a3,#c6a8ff)}
#do-slides,[data-g=do-slides]{--jt:light-dark(#fbe0d8,#3b1f17);--jk:light-dark(#a12d12,#ffa58c)}
#do-edit,[data-g=do-edit]{--jt:light-dark(#fff4c7,#352c12);--jk:light-dark(#6e5100,#f2d27a)}
#do-read,[data-g=do-read]{--jt:light-dark(#ffe1ea,#3a1823);--jk:light-dark(#97193f,#ff9fbb)}
/* dark footer (all pages) */
.wrap{padding-bottom:0}
footer{background:#1a1a1a;color:#d8d5cc;margin:48px calc(-1 * max(5vw,16px)) 0;padding:48px max(5vw,16px) 26px;text-align:left}
footer .fcols h2{color:#fff}footer .fcols p{color:#cfcac0}footer .fcols a,footer .tool-links a{color:#fff}footer .fcols a{text-decoration:underline}
footer .fbrand{color:#fff;font-family:Outfit,'Inter Tight',sans-serif}footer .fbottom{border-top-color:#3a3833;color:#bdb8ad;text-align:center}
footer .linkb{color:#f0ece4}footer .tool-links{color:#bdb8ad;max-width:1100px;margin:14px auto 0;text-align:center}footer .tool-links b{color:#fff}
@media(max-width:720px){:root[data-view=home] .jgroup{grid-template-columns:minmax(0,1fr);gap:12px}:root[data-view=home] .brand{margin-bottom:30px}
  :root[data-view=home] .hero::before{height:76px}}
@media(max-width:600px){:root[data-view=home] .acctbar{position:absolute;top:0;right:0;margin:0}:root[data-view=home] .brand .bname{font-size:20px}}
'''
rep('</style>\n<!-- Vercel Web Analytics', CSS + '</style>\n<!-- Vercel Web Analytics')
P.write_text(s, encoding='utf-8')
print('home page now uses the design 11 look')
