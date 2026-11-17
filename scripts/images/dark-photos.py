"""
The dark-mode versions of the banner photos (Arye, 2026-11-17: "make new picture for dark mode"):
the same photo dimmer and warmer, like parchment in lamplight, with a soft vignette, so the bright
page doesn't glare beside the dark site. Writes src/assets/banner-*-dark.jpg next to each original.

Run from the repository's root (needs Pillow): python scripts/images/dark-photos.py
"""

from pathlib import Path

from PIL import Image, ImageChops

ASSETS = Path("src/assets")
PHOTOS = ["banner-cottonbro.jpg", "banner-yad.jpg"]

GAMMA = 1.6  # the dark letters stay deep while the parchment dims
LEVEL = 0.58  # the brightest white becomes this
WARMTH = (1.0, 0.86, 0.68)  # red, green and blue kept: lamplight
VIGNETTE = (0.55, 0.45, 0.9, 0.6)  # its centre (x, y, of the width and height), fall-off, floor


def curve(k: float) -> list[int]:
    return [round(255 * (v / 255) ** GAMMA * LEVEL * k) for v in range(256)]


def vignette(size: tuple[int, int]) -> Image.Image:
    cx, cy, fall, floor = VIGNETTE
    small = Image.new("L", (64, 64))
    for y in range(64):
        for x in range(64):
            d = ((x / 63 - cx) ** 2 + (y / 63 - cy) ** 2) ** 0.5
            small.putpixel((x, y), round(255 * min(1.0, max(floor, 1.15 - d * fall))))
    mask = small.resize(size, Image.Resampling.BICUBIC)
    return Image.merge("RGB", (mask, mask, mask))


for name in PHOTOS:
    source = ASSETS / name
    photo = Image.open(source).convert("RGB")
    channels = [c.point(curve(k)) for c, k in zip(photo.split(), WARMTH)]
    dark = ImageChops.multiply(Image.merge("RGB", channels), vignette(photo.size))
    target = source.with_name(source.stem + "-dark.jpg")
    dark.save(target, quality=88, optimize=True, progressive=True)
    print(target)
