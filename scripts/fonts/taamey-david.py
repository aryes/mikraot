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
2. Telisha with gershayim on one letter (זֶ֠֞ה, קִ֠רְב֠֞וּ): the font pushes the two far apart, the
   gershayim onto the next letter. A rule added to the positioning moves the pair together,
   centred over the letter (Arye, 2026-10-14). The two marks are each about as wide as a zayin, so
   on a narrow letter the pair still overhangs a little.
3. Vertical metrics: the font reserves more room below its letters than above (for niqqud), so
   text centred in a box (a button, a menu item) sat ~0.1em high (Arye, 2026-10-15). The ascent
   and descent are rebalanced around the letters' middle, their sum unchanged.
4. Size: its letters are about 7% shorter than Noto's at the same font size. Both weights are
   enlarged by that much (a smaller unitsPerEm draws every glyph larger, outlines unchanged), so
   the site's sizes stay as they were designed.

Run from the repository root, in a Python environment with fontTools:

    python -m venv .venv && .venv/Scripts/python -m pip install -r scripts/fonts/requirements.txt
    .venv/Scripts/python scripts/fonts/taamey-david.py

Inputs: scripts/fonts/taamey-david/TaameyDavidCLM-{Medium,Bold}.ttf (Culmus, by Yoram Gnat, GPL
v2 with the font exception; see LICENSE and GNU-GPL there). Outputs: src/assets/fonts/taamey-david/TaameyDavidCLM-{Medium,Bold}.woff2.
"""

from pathlib import Path

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.otlLib.maxContextCalc import maxCtxFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

SOURCE = Path("scripts/fonts/taamey-david")
OUTPUT = Path("src/assets/fonts/taamey-david")
# Medium's Hebrew letters (ב מ ה ש ם) are 0.93 of Noto Sans Hebrew's height.
ENLARGE = 1.07
CHANGE = (
    "modified 2026-10-14 for mikraot.net: enlarged 7%, bold rebuilt from medium,"
    " telisha and gershayim on one letter brought together, vertical metrics centred on the letters"
)


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


# Telisha gedola then gershayim on one letter: the font's own rules put the telisha ~770 units
# from the letter's start and the gershayim at -110, out over the next letter (shaped with
# HarfBuzz). These shifts centre the pair on the letter, a small gap between them: the telisha
# moves 210 units in, the gershayim 230 out; the gershayim is attached to the telisha, so its own
# shift also undoes the telisha's (210 + 230).
CLOSER = """
lookup telishaGershayim {
    pos telishagedola' <-210 0 0 0> gershayimaccent' <440 0 0 0>;
} telishaGershayim;
feature mkmk { lookup telishaGershayim; } mkmk;
"""


def bring_together(font: TTFont) -> None:
    """Adds CLOSER after the font's own positioning rules (feaLib alone would replace them)."""
    rules = TTFont(SOURCE / "TaameyDavidCLM-Medium.ttf")
    del rules["GPOS"]
    addOpenTypeFeaturesFromString(rules, CLOSER, tables=["GPOS"])
    lookups = font["GPOS"].table.LookupList.Lookup
    first = len(lookups)
    added = rules["GPOS"].table.LookupList.Lookup
    for lookup in added:  # the chain's references move with the lookups
        for subtable in lookup.SubTable:
            for record in getattr(subtable, "PosLookupRecord", None) or []:
                record.LookupListIndex += first
        lookups.append(lookup)
    font["GPOS"].table.LookupList.LookupCount = len(lookups)
    chain = first + next(
        i for i, lookup in enumerate(added) if lookup.LookupType in (7, 8)
    )
    for record in font["GPOS"].table.FeatureList.FeatureRecord:
        if record.FeatureTag == "mkmk":
            record.Feature.LookupListIndex.append(chain)
            record.Feature.LookupCount = len(record.Feature.LookupListIndex)


# Letters whose tops give the Hebrew letter height (no ascenders like ל or descenders like ק).
LETTERS = "במהשטס"


def letters_middle(font: TTFont) -> float:
    """Half the Hebrew letters' height, in font units."""
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    tops = []
    for letter in LETTERS:
        pen = BoundsPen(glyphs)
        glyphs[cmap[ord(letter)]].draw(pen)
        tops.append(pen.bounds[3])
    return sum(tops) / len(tops) / 2


def centre_letters(font: TTFont, middle: float) -> None:
    """Moves ascent and descent so that the line's middle is `middle` (see 3 above).

    Both weights get the same values (Medium's middle), so a bold word doesn't change a line's
    height. The line gap is dropped: `line-height: normal` is then ascent + descent everywhere,
    as Windows already had it (it read the win metrics, which have no gap).
    """
    hhea, os2 = font["hhea"], font["OS/2"]
    height = hhea.ascent - hhea.descent
    ascent = round(height / 2 + middle)
    descent = ascent - height
    hhea.ascent, hhea.descent, hhea.lineGap = ascent, descent, 0
    os2.usWinAscent, os2.usWinDescent = ascent, -descent
    os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = ascent, descent, 0
    # The typo metrics, now the same as the others, are what browsers on every system should use
    # (fsSelection bit 7, USE_TYPO_METRICS, defined from OS/2 version 4).
    if os2.version < 4:
        os2.version = 4
        os2.sxHeight = os2.sCapHeight = round(middle * 2)
        os2.usDefaultChar, os2.usBreakChar = 0, 32
        os2.usMaxContext = maxCtxFont(font)
    os2.fsSelection |= 1 << 7


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
    medium, bold = TTFont(SOURCE / "TaameyDavidCLM-Medium.ttf"), build_bold()
    middle = letters_middle(medium)
    for font in (medium, bold):
        bring_together(font)
        centre_letters(font, middle)
    save(medium, "TaameyDavidCLM-Medium.woff2")
    save(bold, "TaameyDavidCLM-Bold.woff2")


if __name__ == "__main__":
    main()
