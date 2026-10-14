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
3. Size: its letters are about 7% shorter than Noto's at the same font size. Both weights are
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
from fontTools.ttLib import TTFont

SOURCE = Path("scripts/fonts/taamey-david")
OUTPUT = Path("src/assets/fonts/taamey-david")
# Medium's Hebrew letters (ב מ ה ש ם) are 0.93 of Noto Sans Hebrew's height.
ENLARGE = 1.07
CHANGE = (
    "modified 2026-10-14 for mikraot.net: enlarged 7%, bold rebuilt from medium,"
    " telisha and gershayim on one letter brought together"
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
    for font in (medium, bold):
        bring_together(font)
    save(medium, "TaameyDavidCLM-Medium.woff2")
    save(bold, "TaameyDavidCLM-Bold.woff2")


if __name__ == "__main__":
    main()
