# Fileutilo 16.1.1: a version number on every page. The page carries the placeholder "dev"; scripts/build-site.mjs
# fills in the number from the VERSION file, so a page served straight from web/ says "dev". Run after apply_v161_vendor.py.
import pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')
if 'name="fileutilo-version"' in s:
    raise SystemExit('already applied')

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:110])
    s = s.replace(a, b)

# machine-readable, for support and for AutoQA (it also reads /version.json)
rep('<meta name="viewport" content="width=device-width,initial-scale=1">\n',
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="fileutilo-version" content="dev">\n')
# small, in the footer, so a customer's screenshot shows which build they had
rep('Kalaburagi Labs. All rights reserved.<br>',
    'Kalaburagi Labs. All rights reserved. <span class="fver" title="Fileutilo version">v<span data-fu-ver>dev</span></span><br>')
rep('footer .fbottom{border-top:1px solid var(--line);padding-top:16px;max-width:1100px;margin:0 auto}',
    'footer .fbottom{border-top:1px solid var(--line);padding-top:16px;max-width:1100px;margin:0 auto}footer .fver{opacity:.75;font-size:12px;white-space:nowrap}')
P.write_text(s, encoding='utf-8')
print('version placeholder added to the page head and footer')
