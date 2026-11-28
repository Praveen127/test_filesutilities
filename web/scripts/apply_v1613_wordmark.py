# Fileutilo 16.1.3: the "Fileutilo" name next to the logo is deep navy (#1e3a8a) on light pages and soft blue
# (#c7d8ff) in dark mode, on every view, so name and blue logo read as one mark. Run after apply_v1612_logo.py.
# The rule sits in its own <style> at the end of <head>, outside every @media block, so it applies at all widths.
import pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')
MARK = '/*wordmark-v1613*/'
if MARK in s:
    raise SystemExit('already applied')
i = s.index('</head>')            # the page's own head (a later '</head>' is inside a script template)
assert i < s.index('<body')
RULE = ('<style>' + MARK + ':root .brand .bname,:root[data-view=home] .brand .bname,'
        ':root:is([data-view=tool],[data-view=page]) .brand .bname{color:light-dark(#1e3a8a,#c7d8ff)}</style>\n')
s = s[:i] + RULE + s[i:]
P.write_text(s, encoding='utf-8')
print('wordmark: deep navy, soft blue in dark mode')
