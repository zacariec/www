"""Generate self-hosted fonts and outlined Node icons from licensed upstream fonts.

Run with Python 3 and fonttools[woff], brotli, cairosvg, Pillow installed.
The checked-in outputs require no Python or network access at build/runtime.
"""
from hashlib import sha1
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen

import cairosvg
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
for char in "zc":
    pen = SVGPathPen(glyphs)
    glyphs[cmap[ord(char)]].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
    paths.append(f'<path d="{pen.getCommands()}"/>')
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
(ROOT / "public/icon.svg").write_text(svg)
for name, pixels in [("apple-touch-icon.png", 180), ("icon-192.png", 192), ("icon-512.png", 512)]:
    cairosvg.svg2png(bytestring=svg.encode(), write_to=str(ROOT / "public" / name), output_width=pixels, output_height=pixels)
with Image.open(BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=64, output_height=64))) as image:
    image.save(ROOT / "public/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
display_font = instantiateVariableFont(host, {"wght": 500}, inplace=False)
display_glyphs = display_font.getGlyphSet()


def outlined_text(text, pixels, left, baseline, letter_spacing=-0.055):
    result = []
    unit = pixels / em
    for char in text:
        glyph = display_glyphs[cmap[ord(char)]]
        pen = SVGPathPen(display_glyphs)
        glyph.draw(TransformPen(pen, (unit, 0, 0, -unit, left, baseline)))
        result.append(f'<path d="{pen.getCommands()}"/>')
        left += glyph.width * unit + letter_spacing * pixels
    return "".join(result)


og = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">'
    '<title>zcarr.dev — Getting it out there.</title>'
    '<rect width="1200" height="630" fill="#EEEAE3"/>'
    '<rect x="1010" y="68" width="90" height="90" fill="#F386A1"/>'
    '<g fill="#1E1E1E">'
    + outlined_text("zcarr.dev", 48, 64, 110, -0.045)
    + outlined_text("Getting it", 170, 60, 325)
    + outlined_text("out there.", 170, 60, 475)
    + "</g></svg>\n"
)
(ROOT / "public/og.svg").write_text(og)
print("Generated self-hosted fonts, licenses, outlined icons, app PNGs, favicon and OG image.")
