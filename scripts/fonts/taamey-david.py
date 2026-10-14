"""
Prepares Taamey David CLM, the site's font since 2026-10-14, for the web.

Chosen because it places cantillation marks correctly where Noto Sans Hebrew, the earlier font,
didn't (a mark before the letter's vowel, two marks on one letter, a mark beside niqqud).

1. Bold: Culmus's TaameyDavidCLM-Bold has empty cantillation glyphs and no rules placing them, so
   bold words lost their marks. The bold is built from the complete Medium weight instead: the
   letters (Hebrew, Latin, digits, punctuation) come from the Bold, with their widths, and the
   anchors where marks attach to a letter move with the letter's new width. All marks, niqqud
   included, and all positioning rules stay Medium's: the Bold draws its marks at other heights,
   so its niqqud with Medium's rules misplaced the holam, for one.
2. Size: its letters are about 7% shorter than Noto's at the same font size. Both weights are
   enlarged by that much (a smaller unitsPerEm draws every glyph larger, outlines unchanged), so
   the site's sizes stay as they were designed.

Run from the repository root, in a Python environment with fontTools:

    python -m venv .venv && .venv/Scripts/python -m pip install -r scripts/fonts/requirements.txt
    .venv/Scripts/python scripts/fonts/taamey-david.py

Inputs: scripts/fonts/taamey-david/TaameyDavidCLM-{Medium,Bold}.ttf (Culmus, by Yoram Gnat, GPL
v2 with the font exception; see LICENSE and GNU-GPL there). Outputs: src/assets/fonts/taamey-david/TaameyDavidCLM-{Medium,Bold}.woff2.
"""

from pathlib import Path

from fontTools.ttLib import TTFont

SOURCE = Path("scripts/fonts/taamey-david")
OUTPUT = Path("src/assets/fonts/taamey-david")
# Medium's Hebrew letters (ב מ ה ש ם) are 0.93 of Noto Sans Hebrew's height.
ENLARGE = 1.07
CHANGE = "modified 2026-10-14 for mikraot.net: enlarged 7%, bold rebuilt from medium"


def build_bold() -> TTFont:
    medium = TTFont(SOURCE / "TaameyDavidCLM-Medium.ttf")
    bold = TTFont(SOURCE / "TaameyDavidCLM-Bold.ttf")
    # Marks (GDEF class 3: niqqud, cantillation, dots) stay Medium's. The precomposed
    # letter-with-mark glyphs the Bold lacks (לֹ, ג with rafe…) stay too, and so combine the Bold
    # letter with Medium's mark at Medium's offset.
    classes = medium["GDEF"].table.GlyphClassDef.classDefs
    keep = {name for name, cls in classes.items() if cls == 3}

    # How much wider each letter is in bold: the mark anchors on it move by the same ratio.
    ratio = {}
    for name in bold.getGlyphOrder():
        if name in keep or name not in medium["glyf"].glyphs:
            continue
        glyph = bold["glyf"][name]
        if glyph.numberOfContours == 0:
            continue  # nothing drawn in Bold (spaces, the empty marks): keep Medium's
        if medium["hmtx"][name][0]:
            ratio[name] = bold["hmtx"][name][0] / medium["hmtx"][name][0]
        medium["glyf"][name] = glyph
        medium["hmtx"][name] = bold["hmtx"][name]

    for lookup in medium["GPOS"].table.LookupList.Lookup:
        for wrapper in lookup.SubTable:
            subtable = getattr(wrapper, "ExtSubTable", wrapper)
            if type(subtable).__name__ != "MarkBasePos":
                continue
            bases = subtable.BaseCoverage.glyphs
            for name, record in zip(bases, subtable.BaseArray.BaseRecord):
                for anchor in record.BaseAnchor:
                    if anchor is not None:
                        anchor.XCoordinate = round(anchor.XCoordinate * ratio.get(name, 1))

    # The bold's own names and weight, so tools see a bold face.
    medium["OS/2"].usWeightClass = bold["OS/2"].usWeightClass
    medium["OS/2"].fsSelection = bold["OS/2"].fsSelection
    medium["head"].macStyle = bold["head"].macStyle
    medium["name"] = bold["name"]
    return medium


def save(font: TTFont, name: str) -> None:
    """Enlarged (ENLARGE), marked as modified (GPL v2 section 2a), compressed for the web."""
    font["head"].unitsPerEm = round(font["head"].unitsPerEm / ENLARGE)
    for record in font["name"].names:
        if record.nameID == 5:  # version string
            record.string = f"{record.toUnicode()}; {CHANGE}"
    font.flavor = "woff2"
    font.save(OUTPUT / name)
    print("wrote", OUTPUT / name)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    save(TTFont(SOURCE / "TaameyDavidCLM-Medium.ttf"), "TaameyDavidCLM-Medium.woff2")
    save(build_bold(), "TaameyDavidCLM-Bold.woff2")


if __name__ == "__main__":
    main()
