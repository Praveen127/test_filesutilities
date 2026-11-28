# Fileutilo 15, step 4: tool pages and info pages (pricing, privacy, terms, refunds) take the design 11 look too —
# light warm page, white header bar, black Outfit headline, light category tabs joined to the white tool panel.
# Run after apply_v15_look.py.
import pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')
if '.v15all{' in s:
    raise SystemExit('already applied')
T = ':root:is([data-view=tool],[data-view=page])'
CSS = f'''
.v15all{{}}
/* ---------- tool and info pages: the design 11 look ---------- */
{T}{{--bg:light-dark(#f8f7f4,#131210);--sheet:light-dark(#ffffff,#1d1b18);--panel:light-dark(#f4f2ec,#26231f);--line:light-dark(#e6e3dc,#36322c);
  --ink:light-dark(#1a1a1a,#f2efe8);--mute:light-dark(#5a5850,#b6b0a4)}}
{T} body{{background:var(--bg);font-family:Outfit,Inter,system-ui,sans-serif}}
{T} .hero{{background:var(--bg);background-image:none;color:var(--ink);padding:16px max(5vw,16px) 0}}
{T} .hero::before{{content:"";position:absolute;left:0;right:0;top:0;height:78px;background:var(--sheet);border-bottom:1px solid var(--line)}}
{T} .top{{max-width:1240px}}
{T} .brand .pbadge{{display:none}}
{T} #catnav a:not([data-cat=home]){{display:none}}   /* only the Home tab, to go back to the home page */
{T} #catnav{{margin-top:6px}}{T} #catnav a[data-cat=home]{{flex:0 0 auto;min-width:150px}}
{T} .brand{{margin-bottom:30px;min-height:46px}}
{T} .logo{{width:40px;height:40px;border-radius:11px;background:light-dark(#1a1a1a,#f2efe8);color:light-dark(#fff,#1a1a1a);box-shadow:none}}
{T} .brand .bname{{color:var(--ink);font:700 22px Outfit,'Inter Tight',sans-serif}}
{T} .hero h1{{font:700 clamp(28px,3.8vw,42px)/1.08 Outfit,'Inter Tight',sans-serif;letter-spacing:-.025em;color:var(--ink);margin:0}}
{T} .hero h1 em{{color:light-dark(#a8361d,#ff9d86)}}
{T} .acctbar{{top:0}}
{T} .acctbar a,{T} .acctbar button{{background:transparent;border-color:transparent;color:var(--ink);font:500 16px Outfit,Inter,sans-serif}}
{T} .acctbar a:hover,{T} .acctbar button:hover{{background:var(--panel)}}
{T} #acctBtn{{background:#ff6f59;border-color:#ff6f59;color:#2b0a04;font-weight:700}}
:root.signed-in:is([data-view=tool],[data-view=page]) #acctBtn{{background:transparent;border-color:transparent;color:var(--ink);font-weight:500}}
{T} .acctbar .av{{width:38px;height:38px;background:#ff6f59;color:#2b0a04;font:800 15px Outfit,Inter,sans-serif;margin-left:0}}
{T} .acctbar .pb{{background:var(--panel);color:var(--ink)}}
{T} nav a{{background:transparent;border:1px solid transparent;border-bottom:0;color:var(--mute)}}
{T} nav a:hover{{background:light-dark(rgba(26,26,26,.05),rgba(255,255,255,.06))}}
{T} nav a b{{color:var(--ink);font-family:Outfit,'Inter Tight',sans-serif}}{T} nav a small{{opacity:1;color:var(--mute)}}
{T} nav a .ic{{background:var(--sheet);border:1px solid var(--line)}}{T} nav a .ic svg{{stroke:var(--ink)}}
{T} nav a[aria-current=true]{{background:var(--sheet);border-color:var(--line)}}
{T} nav a[aria-current=true] .ic{{background:light-dark(#1a1a1a,#f2efe8);border-color:light-dark(#1a1a1a,#f2efe8);box-shadow:none}}{T} nav a[aria-current=true] .ic svg{{stroke:light-dark(#fff,#1a1a1a)}}
{T} main{{background:var(--sheet);border:1px solid var(--line);border-top:0;box-shadow:0 14px 36px -18px rgba(26,26,26,.18)}}
{T} .subnav a{{font-family:Outfit,Inter,sans-serif;font-size:15px;background:var(--sheet);color:var(--ink)}}
{T} .subnav a[aria-current=true]{{background:light-dark(#1a1a1a,#f2efe8);border-color:light-dark(#1a1a1a,#f2efe8);color:light-dark(#fff,#1a1a1a)}}
{T} .lead h2,{T} .seo-about h2,{T} .seo-about h3{{font-family:Outfit,'Inter Tight',sans-serif}}
@media(max-width:600px){{{T} .acctbar{{position:absolute;top:0;right:0;margin:0}}{T} .brand .bname{{font-size:20px}}{T} .hero::before{{height:76px}}}}
'''
a = '</style>\n<!-- Vercel Web Analytics'
assert s.count(a) == 1
s = s.replace(a, CSS + a)
P.write_text(s, encoding='utf-8')
print('tool and info pages now use the design 11 look')
