"""Noto Sans/Serif Hebrew with bolder, larger vowel and cantillation marks (Arye, 2026-10-11).

The site uses one font for all Hebrew, with or without marks; Noto's marks were too faint and
small next to the letters (a segol was a few blurred pixels). This copies each mark glyph (GDEF
mark class) from the weight-800 instance of the variable font into its default outline, scales
it 1.3x about its own centre, and drops the mark's weight variation, so marks are bold and
larger at every text weight while the letters keep their full variable range. Mark positions
(GPOS anchors) are untouched. Noto is OFL with no reserved font name, so a modified copy is fine.

Input: the Hebrew subsets of the Fontsource packages in node_modules. Output, committed:
src/assets/fonts/noto-bold-marks/ (the fonts, each package's OFL licence, the versions used).
Rerun after updating those packages (a unit test compares the recorded versions):

    python -m venv .venv && .venv/Scripts/python -m pip install -r scripts/fonts/requirements.txt
    .venv/Scripts/python scripts/fonts/bold-marks.py
"""

import json
import shutil
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

MARK_WEIGHT = 800
MARK_SCALE = 1.3  # chosen by Arye from 1, 1.3 and 1.6 (1.6 crowded the dagesh)
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/assets/fonts/noto-bold-marks"
FAMILIES = ["noto-sans-hebrew", "noto-serif-hebrew"]


def bold_marks(source: Path, target: Path) -> int:
    # No timestamp: the same input gives the same file, so a rerun shows no change.
    font = TTFont(source, recalcTimestamp=False)
    heavy = instantiateVariableFont(TTFont(source), {"wght": MARK_WEIGHT})
    classes = font["GDEF"].table.GlyphClassDef.classDefs
    marks = [glyph for glyph, cls in classes.items() if cls == 3]
    glyf = font["glyf"]
    for glyph in marks:
        outline = heavy["glyf"][glyph]
        glyf[glyph] = outline
        font["gvar"].variations.pop(glyph, None)
        # The side bearing must match the outline (marks have no advance).
        font["hmtx"][glyph] = heavy["hmtx"][glyph]
        # Composite marks (U+0307 and U+0308, Latin, built from `dotaccent` and `dieresis`) and
        # empty ones keep their size.
        if not outline.isComposite() and outline.numberOfContours > 0:
            outline.recalcBounds(glyf)
            cx, cy = (outline.xMin + outline.xMax) / 2, (outline.yMin + outline.yMax) / 2
            coords = outline.coordinates
            for i, (x, y) in enumerate(coords):
                coords[i] = (round(cx + (x - cx) * MARK_SCALE), round(cy + (y - cy) * MARK_SCALE))
            outline.recalcBounds(glyf)
            font["hmtx"][glyph] = (font["hmtx"][glyph][0], outline.xMin)
    font.flavor = "woff2"
    font.save(target)
    return len(marks)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    versions = {}
    for family in FAMILIES:
        package = ROOT / "node_modules/@fontsource-variable" / family
        source = package / f"files/{family}-hebrew-wght-normal.woff2"
        count = bold_marks(source, OUT / f"{family}-hebrew-wght-normal.woff2")
        shutil.copyfile(package / "LICENSE", OUT / f"OFL-{family}.txt")
        versions[f"@fontsource-variable/{family}"] = json.loads(
            (package / "package.json").read_text(encoding="utf-8")
        )["version"]
        print(f"{family}: {count} marks at weight {MARK_WEIGHT}, scale {MARK_SCALE}")
    (OUT / "versions.json").write_text(
        json.dumps(versions, indent=2) + "\n", encoding="utf-8", newline="\n"
    )


if __name__ == "__main__":
    main()
