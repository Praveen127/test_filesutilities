# Fileutilo 15, step 5: a lighter home page. The headline is just "Your files." (no badge, no second line), the
# search box is shorter and narrower, the "The toolkit / What do you want to do?" heading above the tool tiles is
# gone (a hidden "All tools" heading keeps the outline), and so is the three-screenshot gallery.
# Run after apply_v15_look_all.py.
import pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')
if '/*hero-v15*/' in s:
    raise SystemExit('already applied')

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:110])
    s = s.replace(a, b)

OLD, NEW = 'Your files. Your device.<br><em>Your control.</em>', 'Your files.'
rep('<span class="hbadge">Private by design</span>\n<h1>' + OLD + '</h1>', '<h1>' + NEW + '</h1>')
import re
s, n = re.subn(r'    <div class="hhead"><div><span class="home-kicker">THE TOOLKIT</span>.*?</p></div>\n',
               '    <h2 class="sr-only">All tools</h2>\n', s, count=1, flags=re.S); assert n == 1
s, n = re.subn(r'    <div class="shots">\n(      <figure>.*?</figure>\n){3}    </div>\n', '', s, count=1); assert n == 1
rep(":'" + OLD + "';", ":'" + NEW + "';")

H = ':root[data-view=home]'
CSS = f'''/*hero-v15*/
{H} .hsearch{{max-width:560px;margin-top:20px;border-width:1.5px;border-radius:14px;padding:2px 10px 2px 14px;gap:10px}}
{H} .hsearch>svg{{width:17px;height:17px}}
{H} .hsearch input{{font-size:15px;padding:9px 0;min-height:42px}}
'''
rep('</style>\n<!-- Vercel Web Analytics', CSS + '</style>\n<!-- Vercel Web Analytics')
P.write_text(s, encoding='utf-8')
print('home: short headline, smaller search, no toolkit heading or screenshot gallery')
