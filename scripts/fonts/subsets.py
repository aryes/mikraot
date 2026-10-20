"""
Trims the site's helper fonts to the characters they are used for (the review, 2026-10-19;
Arye, 2026-10-20). Taamey David CLM, the font of all text, is never trimmed.

1. Taamey D (the logo): only the letters of the site's name, pointed and plain
   (src/lib/site.ts `pointedTitle`, src/data/site.json `title`). 21 KB on every page before.
2. Noto Sans Arabic (the Arabic letters of the pronunciation tables): the basic Arabic block,
   U+0600-06FF; the joined letter shapes come from its rules, not from the presentation-form
   blocks the full file also carries. 162 KB before, on the two pages with Arabic.
3. Noto Sans Hebrew (the symbols Taamey David lacks, such as ©): only the characters of
   Fontsource's Latin and Latin Extended ranges that Taamey David has no glyph for. It loaded its
   whole Latin file (20 KB) on every page for the footer's ©. The ranges it is declared for in
   astro.config.mjs come from this script's output, so browsers fetch it only for those.

All layout rules and the weight axis are kept. The Noto inputs are the installed
@fontsource-variable packages: a Renovate update of them changes nothing on the site until this
script is run again (and its output committed). Run from the repository root (see taamey-david.py
for the environment), after changing the site's name or a font:

    .venv/Scripts/python scripts/fonts/subsets.py

Outputs in src/assets/fonts/{taamey-d,noto-sans-arabic,noto-sans-hebrew}/ and the ranges printed
for astro.config.mjs. Licences: Taamey D, GPL v2 with the font exception (the trimmed file is a
modified version, as its README says); Noto, SIL Open Font License 1.1 (copied beside them).
"""

import re
import shutil
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

FONTS = Path("src/assets/fonts")
FONTSOURCE = Path("node_modules/@fontsource-variable")


def unicodes(ranges: str) -> set[int]:
    """The code points of a CSS unicode-range list ("U+0000-00FF,U+0131")."""
    points: set[int] = set()
    for part in ranges.split(","):
        first, _, last = part.strip().removeprefix("U+").partition("-")
        points.update(range(int(first, 16), int(last or first, 16) + 1))
    return points


def css_range(points: set[int]) -> str:
    """Code points as a compact CSS unicode-range list."""
    runs: list[tuple[int, int]] = []
    for point in sorted(points):
        if runs and point == runs[-1][1] + 1:
            runs[-1] = (runs[-1][0], point)
        else:
            runs.append((point, point))
    return ",".join(f"U+{a:04X}" if a == b else f"U+{a:04X}-{b:04X}" for a, b in runs)


def trim(source: Path, target: Path, points: set[int]) -> int:
    """Writes `source` with only `points` (and every layout feature) as WOFF2; returns its size."""
    options = subset.Options()
    options.layout_features = ["*"]
    options.flavor = "woff2"
    options.notdef_outline = True
    font = TTFont(source)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=points)
    subsetter.subset(font)
    target.parent.mkdir(parents=True, exist_ok=True)
    font.save(target)
    return target.stat().st_size


def cmap(path: Path) -> set[int]:
    return set(TTFont(path).getBestCmap())


# 1. The logo.
pointed = re.search(r"pointedTitle = '([^']+)'", Path("src/lib/site.ts").read_text("utf-8"))
plain = re.search(r'"title": "([^"]+)"', Path("src/data/site.json").read_text("utf-8"))
assert pointed and plain, "site name not found"
logo_text = pointed.group(1) + plain.group(1) + " "
size = trim(FONTS / "taamey-d/Taamey_D.woff2", FONTS / "taamey-d/Taamey_D-logo.woff2", {ord(c) for c in logo_text})
print(f"Taamey D (logo): {size // 1024} KB, {len(set(logo_text))} characters")

# 2. Arabic.
arabic = FONTSOURCE / "noto-sans-arabic"
size = trim(
    arabic / "files/noto-sans-arabic-arabic-wght-normal.woff2",
    FONTS / "noto-sans-arabic/NotoSansArabic-arabic.woff2",
    unicodes("U+0600-06FF"),
)
shutil.copy(arabic / "LICENSE", FONTS / "noto-sans-arabic/LICENSE")
print(f"Noto Sans Arabic: {size // 1024} KB, range U+0600-06FF")

# 3. The symbols Taamey David lacks.
taamey = cmap(FONTS / "taamey-david/TaameyDavidCLM-Medium.woff2") & cmap(
    FONTS / "taamey-david/TaameyDavidCLM-Bold.woff2"
)
hebrew = FONTSOURCE / "noto-sans-hebrew"
for name, ranges in {
    "latin": "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    "latin-ext": "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
}.items():
    source = hebrew / f"files/noto-sans-hebrew-{name}-wght-normal.woff2"
    lacking = (unicodes(ranges) & cmap(source)) - taamey
    size = trim(source, FONTS / f"noto-sans-hebrew/NotoSansHebrew-{name}-symbols.woff2", lacking)
    print(f"Noto Sans Hebrew {name}: {size // 1024} KB, range {css_range(lacking)}")
shutil.copy(hebrew / "LICENSE", FONTS / "noto-sans-hebrew/LICENSE")

# Every character the site's text fonts draw (Taamey David, the symbols, Arabic), for the browser
# test that no page shows a character in a system font (e2e/fonts.spec.ts).
covered = taamey | (unicodes("U+0600-06FF") & cmap(FONTS / "noto-sans-arabic/NotoSansArabic-arabic.woff2"))
for name in ("latin", "latin-ext"):
    covered |= cmap(FONTS / f"noto-sans-hebrew/NotoSansHebrew-{name}-symbols.woff2")
logo = cmap(FONTS / "taamey-d/Taamey_D-logo.woff2")
Path("e2e/fixtures/font-coverage.json").write_text(
    '{"ranges": "' + css_range(covered) + '", "logo": "' + css_range(logo) + '"}\n',
    encoding="utf-8",
)
print(f"Covered: {len(covered)} characters")
