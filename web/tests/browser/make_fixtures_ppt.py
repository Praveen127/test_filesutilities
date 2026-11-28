# Sample presentations for the PowerPoint tool tests (python-pptx + Pillow).
import io, random, pathlib
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image, ImageDraw, ImageFilter
FX = pathlib.Path(__file__).parent / 'fixtures'
random.seed(7)

def photo(w, h, seed):
    r = random.Random(seed); im = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(im)
    for i in range(400):
        x, y = r.randrange(w), r.randrange(h); rad = r.randrange(20, 260)
        d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=(r.randrange(256), r.randrange(256), r.randrange(256)))
    im = im.filter(ImageFilter.GaussianBlur(3))
    noise = Image.effect_noise((w, h), 40).convert('RGB'); return Image.blend(im, noise, .18)

def save(im, fmt, **kw):
    b = io.BytesIO(); im.save(b, fmt, **kw); b.seek(0); return b

# ---- deck A: 16:9, mixed content ----
p = Presentation(); p.slide_width, p.slide_height = Inches(13.333), Inches(7.5)
s = p.slides.add_slide(p.slide_layouts[0]); s.shapes.title.text = 'Quarterly Review FUPPTA'; s.placeholders[1].text = 'Kalaburagi Labs · Q3'
s.notes_slide.notes_text_frame.text = 'Welcome everyone NOTEA1'
s = p.slides.add_slide(p.slide_layouts[1]); s.shapes.title.text = 'Highlights'
tf = s.placeholders[1].text_frame; tf.text = 'Revenue up 18 percent'
for t, lvl in [('New customers in Bengaluru', 1), ('Churn down to 2 percent', 0), ('Launched Fileutilo 15', 0)]:
    q = tf.add_paragraph(); q.text = t; q.level = lvl
s.notes_slide.notes_text_frame.text = 'Mention the Bengaluru team NOTEA2'
s = p.slides.add_slide(p.slide_layouts[5]); s.shapes.title.text = 'Big photo'
s.shapes.add_picture(save(photo(3200, 2000, 1), 'JPEG', quality=95), Inches(1), Inches(1.5), Inches(8))
s.shapes.add_picture(save(photo(2400, 1600, 2), 'PNG'), Inches(9), Inches(1.5), Inches(3.8))   # opaque PNG photo
s = p.slides.add_slide(p.slide_layouts[5]); s.shapes.title.text = 'Shapes and a table'
r = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(.7), Inches(1.6), Inches(3), Inches(1.4)); r.fill.solid(); r.fill.fore_color.rgb = RGBColor(0xFF, 0x6F, 0x59); r.text_frame.text = 'Coral box'
e = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(4.2), Inches(1.6), Inches(2), Inches(1.4)); e.fill.solid(); e.fill.fore_color.rgb = RGBColor(0x00, 0x46, 0x3C)
tb = s.shapes.add_table(3, 3, Inches(.7), Inches(3.6), Inches(8), Inches(2)).table
for i, row in enumerate([['City', 'Users', 'Growth'], ['Kalaburagi', '1200', '9%'], ['Mysuru', '860', '12%']]):
    for j, v in enumerate(row): tb.cell(i, j).text = v
s = p.slides.add_slide(p.slide_layouts[1]); s.shapes.title.text = 'Hidden backup slide'; s.placeholders[1].text = 'Only for questions'
s._element.set('show', '0')
p.save(FX / 'deck-a.pptx')

# ---- deck B: different design (dark background on its master), 2 slides ----
q = Presentation(); q.slide_width, q.slide_height = Inches(13.333), Inches(7.5)
bg = q.slide_masters[0].background.fill; bg.solid(); bg.fore_color.rgb = RGBColor(0x10, 0x1A, 0x33)
s = q.slides.add_slide(q.slide_layouts[0]); s.shapes.title.text = 'Deck B opening FUPPTB'; s.placeholders[1].text = 'Second presentation'
s.notes_slide.notes_text_frame.text = 'NOTEB1 should not be merged'
s = q.slides.add_slide(q.slide_layouts[6]); s.shapes.add_picture(save(photo(1200, 800, 3), 'JPEG', quality=85), Inches(2), Inches(1), Inches(9))
q.save(FX / 'deck-b.pptx')

# ---- deck C: 4:3 single slide ----
c = Presentation(); s = c.slides.add_slide(c.slide_layouts[1]); s.shapes.title.text = 'Old format deck FUPPTC'; s.placeholders[1].text = 'Four by three'
c.save(FX / 'deck-c.pptx')
print('made deck-a.pptx, deck-b.pptx, deck-c.pptx')

# ---- privacy fixture: the marker in a title, a bullet, the notes and a picture's description ----
d = Presentation(); s = d.slides.add_slide(d.slide_layouts[1]); s.shapes.title.text = 'Canary deck FUCANARY7f3a9q'; s.placeholders[1].text = 'Private point FUCANARY7f3a9q'
s.notes_slide.notes_text_frame.text = 'Speaker note FUCANARY7f3a9q'
pic = s.shapes.add_picture(save(photo(900, 600, 9), 'JPEG', quality=90), Inches(5), Inches(3), Inches(4)); pic._element.nvPicPr.cNvPr.set('descr', 'FUCANARY7f3a9q')
d.save(FX / 'canary-deck.pptx'); print('made canary-deck.pptx')
