# Fileutilo 15, step 6: the final hero wording and a "For business" page.
#  - Headline "Free PDF, image, Word and other Office tools", with the tagline "Your files never leave your device."
#    under it (smaller, "never leave" in coral) and a shorter line below that mentions work documents.
#  - A new info page at /for-business, linked from the header and the footer.
# Run after apply_v15_hero.py.
import pathlib, re
P = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')
if '/*biz-v15*/' in s:
    raise SystemExit('already applied')

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:110])
    s = s.replace(a, b)

H1 = 'Free PDF, image, Word and other Office tools<span class="htag">Your files <em>never leave</em> your&nbsp;device.</span>'
rep('<h1>Your files.</h1>', '<h1>' + H1 + '</h1>')
rep(":'Your files.';", ":'" + H1 + "';")
rep('<p>One simple workspace for PDFs, documents, PowerPoint, images and data — free to start, and your files never leave your device.</p>',
    '<p>No uploads, no installs — safe for confidential and work documents. Free to start.</p>')

# header and footer links
rep('<a href="pricing" class="plink">Pricing</a><a href="privacy" class="plink">Privacy</a>',
    '<a href="pricing" class="plink">Pricing</a><a href="for-business" class="plink">For business</a><a href="privacy" class="plink">Privacy</a>')
rep('aria-label="Plans and legal"><h2>Plans &amp; legal</h2><a href="pricing">Pricing</a>',
    'aria-label="Plans and legal"><h2>Plans &amp; legal</h2><a href="pricing">Pricing</a><a href="for-business">For business</a>')

# the page is a route like pricing and privacy
rep("const PAGE_IDS=['pricing','privacy','terms','refunds'];", "const PAGE_IDS=['pricing','privacy','terms','refunds','for-business'];")
rep("const PAGES=['pricing','privacy','terms','refunds'];", "const PAGES=['pricing','privacy','terms','refunds','for-business'];")

def ico(paths):
    return ('<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>')
LOCK = ico('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/>')
SHIELD = ico('<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>')
BOLT = ico('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>')
GRID = ico('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>'
           '<rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>')
MAIL = 'mailto:support@fileutilo.com?subject=Fileutilo%20for%20business'

PAGE = f'''<section id="for-business" hidden class="biz">
<span class="biz-kick">FILEUTILO FOR BUSINESS</span>
<h2 class="biz-h">Work on confidential files — <em>without uploading</em> them.</h2>
<p class="biz-lead">Contracts, payslips, ID scans and client data are processed in each employee’s browser. Nothing reaches our servers, so there is no file data for us to store, leak or hand over.</p>
<div class="biz-cta"><a class="biz-btn" href="{MAIL}">Talk to us</a><a class="biz-btn o" href="privacy">Read our privacy policy</a></div>
<div class="biz-cards">
<div class="biz-card"><span class="biz-ic i1">{LOCK}</span><h3>No data processing risk</h3><p>Files never leave the device, so there is no file data on our side to cover in a data-processing agreement.</p></div>
<div class="biz-card"><span class="biz-ic i2">{SHIELD}</span><h3>Easier security review</h3><p>No uploads, no file storage and no third-party processors for documents. Our privacy policy lists everything the site sends.</p></div>
<div class="biz-card"><span class="biz-ic i3">{BOLT}</span><h3>Fast on any connection</h3><p>Work happens on the laptop, so large PDFs and decks don’t wait on an upload — even on busy office Wi-Fi.</p></div>
<div class="biz-card"><span class="biz-ic i4">{GRID}</span><h3><span class="toolcount-n">37</span> tools, one place</h3><p>PDF, Word, PowerPoint, Excel and images: merge, compress, convert, sign, redact and more.</p></div>
</div>
<h3 class="biz-sh">How it compares</h3>
<div class="biz-tw"><table class="biz-cmp"><thead><tr><th scope="col"><span class="sr-only">Question</span></th><th scope="col">Fileutilo</th><th scope="col">Typical online PDF tools</th></tr></thead><tbody>
<tr><th scope="row">Are your files uploaded?</th><td class="y">Never</td><td class="n">Yes, to their servers for processing</td></tr>
<tr><th scope="row">Files stored after use</th><td class="y">Nothing to store</td><td class="n">Usually kept 1–2 hours, then deleted</td></tr>
<tr><th scope="row">On a slow connection</th><td class="y">Only the tool is downloaded, never your files</td><td class="n">Every file goes up and comes back down</td></tr>
<tr><th scope="row">Software to install</th><td class="y">None — runs in the browser</td><td>None, or a desktop app</td></tr>
</tbody></table></div>
<h3 class="biz-sh">Plans</h3>
<div class="biz-plans">
<div class="biz-plan hot"><h4>Pro</h4><p>For individuals at work</p><div class="biz-pr"><span id="bizPro">₹999</span> <small>per year</small></div><ul><li>No daily limits on any tool</li><li>All <span class="toolcount-n">37</span> tools, including PowerPoint and OCR</li><li>An invoice for every payment</li></ul><a class="biz-btn" href="pricing">Get Pro</a></div>
<div class="biz-plan"><h4>For your team</h4><p>Several people, one bill</p><div class="biz-pr">Contact us</div><ul><li>Pro for everyone on your team</li><li>One invoice, with GST details</li><li>Answers for your security or IT review</li></ul><a class="biz-btn o" href="{MAIL}">Contact us</a></div>
</div>
<div class="biz-contact"><div><h3>Bring Fileutilo to your team</h3><p>Tell us your team size and what you work on. We usually reply within one working day.</p></div><a class="biz-btn" href="{MAIL}">Email support@fileutilo.com</a></div>
<script>(()=>{{try{{const p=((window.FILEUTILO_CONFIG||{{}}).prices||{{}}).pro_yearly;if(p)document.getElementById('bizPro').textContent='₹'+Number(p).toLocaleString('en-IN')}}catch(e){{}}}})()</script>
</section>
'''
rep('<section id="terms" hidden class="legal">', PAGE + '<section id="terms" hidden class="legal">')

H = ':root[data-view=home]'
CSS = f'''/*biz-v15*/
{H} .hero h1{{font-size:clamp(28px,3.6vw,44px);line-height:1.08;max-width:none;letter-spacing:-.03em}}
{H} .hero h1 .htag{{display:block;font-size:max(.58em,20px);font-weight:600;letter-spacing:-.015em;line-height:1.2;margin-top:12px}}
{H} .hero h1 em{{color:light-dark(#c2410c,#ff9d86);font-style:normal}}
{H} .hero h1+p{{margin-top:12px}}
.hero h1 .htag{{display:block;font-size:max(.58em,18px);font-weight:600;letter-spacing:-.015em;line-height:1.2;margin-top:8px}}
:root:root .hero h1 .htag em{{font-size:inherit;display:inline;margin:0;font-style:normal;color:light-dark(#c2410c,#ff9d86)}}
.biz{{padding:8px 0 12px}}
.biz-kick{{font:700 12px Outfit,Inter,sans-serif;letter-spacing:.14em;color:light-dark(#c2410c,#ff9d86)}}
.biz-h{{font:700 clamp(28px,4vw,44px)/1.1 Outfit,'Inter Tight',sans-serif;letter-spacing:-.03em;margin:10px 0 12px;max-width:880px;color:var(--ink)}}
.biz-h em{{font-style:normal;color:light-dark(#c2410c,#ff9d86)}}
.biz-lead{{font-size:18px;color:var(--mute);max-width:760px;margin:0 0 22px}}
.biz-cta{{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:34px}}
.biz-btn{{display:inline-flex;align-items:center;min-height:44px;padding:0 20px;border-radius:999px;background:#ff6f59;color:#1a1a1a;font-weight:700;text-decoration:none;border:1.5px solid #ff6f59}}
.biz-btn.o{{background:transparent;color:var(--ink);border-color:var(--ink)}}
.biz-btn:focus-visible{{outline:3px solid var(--ink);outline-offset:2px}}
.biz-cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:40px}}
.biz-card{{background:var(--sheet);border:1px solid var(--line);border-radius:18px;padding:20px}}
.biz-card h3{{font-size:17px;margin:0 0 6px}}.biz-card p{{margin:0;color:var(--mute);font-size:15px}}
.biz-ic{{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;margin-bottom:14px}}
.biz-ic.i1{{background:light-dark(#dff3e8,#173326);color:light-dark(#0d6b3f,#8fe0b4)}}
.biz-ic.i2{{background:light-dark(#e3ecff,#18233d);color:light-dark(#1d4ed8,#9db8ff)}}
.biz-ic.i3{{background:light-dark(#fff4c7,#352c12);color:light-dark(#6e5100,#f2d27a)}}
.biz-ic.i4{{background:light-dark(#ffe1ea,#3a1823);color:light-dark(#97193f,#ff9fbb)}}
.biz-sh{{font:700 26px Outfit,'Inter Tight',sans-serif;letter-spacing:-.02em;margin:0 0 14px;color:var(--ink)}}
.biz-tw{{overflow-x:auto;margin-bottom:40px;border:1px solid var(--line);border-radius:18px}}
.biz-cmp{{width:100%;border-collapse:collapse;background:var(--sheet);min-width:520px}}
.biz-cmp th,.biz-cmp td{{text-align:left;padding:13px 16px;border-bottom:1px solid var(--line);font-size:15px;vertical-align:top}}
.biz-cmp thead th{{background:light-dark(#f1ede4,#26231f);font-size:13px}}.biz-cmp tbody th{{font-weight:500}}
.biz-cmp tr:last-child>*{{border-bottom:0}}
.biz-cmp td.y{{color:light-dark(#0d6b3f,#8fe0b4);font-weight:700}}.biz-cmp td.n{{color:light-dark(#a8361d,#ff9d86)}}
.biz-plans{{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;max-width:820px;margin-bottom:36px}}
.biz-plan{{background:var(--sheet);border:1px solid var(--line);border-radius:18px;padding:22px}}.biz-plan.hot{{border:2px solid var(--ink)}}
.biz-plan h4{{margin:0 0 4px;font-size:18px}}.biz-plan>p{{margin:0;color:var(--mute)}}
.biz-pr{{font:700 26px Outfit,'Inter Tight',sans-serif;margin:10px 0}}.biz-pr small{{font:500 15px Inter,sans-serif;color:var(--mute)}}
.biz-plan ul{{margin:0 0 18px;padding-left:18px;color:var(--mute)}}
.biz-contact{{background:#1a1a1a;color:#f2efe8;border-radius:22px;padding:28px;display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap}}
.biz-contact h3{{color:#fff;margin:0 0 6px;font:700 22px Outfit,'Inter Tight',sans-serif}}.biz-contact p{{margin:0;color:#cfcac0}}
'''
rep('</style>\n<!-- Vercel Web Analytics', CSS + '</style>\n<!-- Vercel Web Analytics')
P.write_text(s, encoding='utf-8')
print('home hero updated; For business page added')
