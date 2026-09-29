"""Generate self-hosted fonts and outlined Node icons from licensed upstream fonts.

Run with Python 3 and fonttools[woff], brotli, cairosvg, Pillow installed.
The checked-in outputs require no Python or network access at build/runtime.
"""
import argparse
from hashlib import sha1
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen

import cairosvg
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "public/fonts"
FONTS.mkdir(parents=True, exist_ok=True)
SOURCE = "https://raw.githubusercontent.com/google/fonts/main/ofl/"


def fetch(path, blob):
    data = urlopen(SOURCE + path, timeout=30).read()
    actual = sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    if actual != blob:
        raise ValueError(f"Upstream changed: review {path} before regenerating")
    return data


def font(path, blob):
    return TTFont(BytesIO(fetch(path, blob)))


def save_woff2(face, name):
    face.flavor = "woff2"
    face.save(FONTS / name)


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "--app-icons-only",
    action="store_true",
    help="Regenerate installed-app icons from the bundled font without changing fonts or favicons.",
)
args = parser.parse_args()
if args.app_icons_only:
    host = TTFont(FONTS / "host-grotesk-400-600.woff2")
else:
    host = font("hostgrotesk/HostGrotesk%5Bwght%5D.ttf", "25174036d06c95274f77cb85c157564aaabd6e35")
    save_woff2(instantiateVariableFont(host, {"wght": (400, 400, 600)}, inplace=False), "host-grotesk-400-600.woff2")
    for weight, name, blob in [
        (400, "Regular", "0c9770d5183ba60dc4350d3e011b782a320761ae"),
        (500, "Medium", "33c546f68b6007a45a3f10e845523abb2db25399"),
    ]:
        save_woff2(font(f"ibmplexmono/IBMPlexMono-{name}.ttf", blob), f"ibm-plex-mono-{weight}.woff2")
    for family, blob in [
        ("hostgrotesk", "058e7cdd2b6cab179224ccd28ecf7f1d62be2ffe"),
        ("ibmplexmono", "c35c4c618fab33da8695177b3a6cefe0810b7b28"),
    ]:
        (FONTS / f"{family}-OFL.txt").write_bytes(fetch(f"{family}/OFL.txt", blob))

# Outline Host Grotesk 600: same -0.075em tracking and 0.2em node as Logo.astro.
mark_font = instantiateVariableFont(host, {"wght": 600}, inplace=False)
glyphs = mark_font.getGlyphSet()
cmap = mark_font.getBestCmap()
em = mark_font["head"].unitsPerEm
size = 80
scale = size / em
tracking = -0.075 * size
advance = sum(glyphs[cmap[ord(c)]].width * scale for c in "zc") + 2 * tracking
width = advance + 0.09 * size + 0.2 * size
x = (128 - width) / 2
baseline = 86
paths = []
bounds = []
for char in "zc":
    pen = SVGPathPen(glyphs)
    glyphs[cmap[ord(char)]].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
    paths.append(f'<path d="{pen.getCommands()}"/>')
    bound_pen = BoundsPen(glyphs)
    glyphs[cmap[ord(char)]].draw(TransformPen(bound_pen, (scale, 0, 0, -scale, x, baseline)))
    bounds.append(bound_pen.bounds)
    x += glyphs[cmap[ord(char)]].width * scale + tracking
svg = '\n'.join([
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">',
    '  <title>zcarr.dev</title>',
    '  <path fill="#EEEAE3" d="M0 0h128v128H0z"/>',
    '  <g fill="#1E1E1E">' + ''.join(paths) + '</g>',
    f'  <path fill="#F386A1" d="M{x + 0.09 * size} {baseline - 0.2 * size}h16v16h-16z"/>',
    '</svg>',
    '',
])
if not args.app_icons_only:
    (ROOT / "public/favicon.svg").write_text(svg)
    with Image.open(BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=64, output_height=64))) as image:
        image.save(ROOT / "public/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

# Center the actual outlines, not their font advance/baseline. Maskable artwork
# fits inside the central 80%-diameter safe circle; the paper remains full bleed.
node_x = x + 0.09 * size
bounds.append((node_x, baseline - 0.2 * size, node_x + 0.2 * size, baseline))
left = min(bound[0] for bound in bounds)
top = min(bound[1] for bound in bounds)
right = max(bound[2] for bound in bounds)
bottom = max(bound[3] for bound in bounds)


def app_icon_svg(width_fraction):
    mark_scale = 128 * width_fraction / (right - left)
    return '\n'.join([
        '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">',
        '  <title>zcarr.dev</title>',
        '  <path fill="#EEEAE3" d="M0 0h128v128H0z"/>',
        f'  <g transform="translate(64 64) scale({mark_scale}) translate({-(left + right) / 2} {-(top + bottom) / 2})">',
        '    <g fill="#1E1E1E">' + ''.join(paths) + '</g>',
        f'    <path fill="#F386A1" d="M{node_x} {baseline - 0.2 * size}h16v16h-16z"/>',
        '  </g>',
        '</svg>',
        '',
    ])


app_svg = app_icon_svg(0.76)
maskable_svg = app_icon_svg(0.66)
(ROOT / "public/app-icon.svg").write_text(app_svg)
for name, pixels, source in [
    ("apple-touch-icon.png", 180, app_svg),
    ("app-icon-192.png", 192, app_svg),
    ("app-icon-512.png", 512, app_svg),
    ("app-icon-maskable-512.png", 512, maskable_svg),
]:
    cairosvg.svg2png(bytestring=source.encode(), write_to=str(ROOT / "public" / name), output_width=pixels, output_height=pixels)
print("Generated installed-app SVG, standard/maskable PNGs and Apple touch icon."
      if args.app_icons_only else "Generated fonts, licenses, favicons and installed-app icons.")
