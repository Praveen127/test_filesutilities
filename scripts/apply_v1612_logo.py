# Fileutilo 16.1.2: the header logo is the app icon (blue gradient, white lines, coral dot) on every page and in
# dark mode, instead of black (cream in dark mode). Run after apply_v1611_version.py.
import pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')
OLD = 'background:light-dark(#1a1a1a,#f2efe8);color:light-dark(#fff,#1a1a1a);box-shadow:none'
NEW = 'background:linear-gradient(135deg,#5b97ff,#2f6fed);color:#fff;box-shadow:0 4px 12px -4px rgba(47,111,237,.55)'
if NEW in s:
    raise SystemExit('already applied')
assert s.count(OLD) == 2, s.count(OLD)   # home page, and tool / info pages
s = s.replace(OLD, NEW)
P.write_text(s, encoding='utf-8')
print('header logo: blue, like the app icon')
