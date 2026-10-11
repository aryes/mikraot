"""Noto Sans Hebrew with heavier vowel and cantillation marks (Arye, 2026-10-11).

The site uses one font for all Hebrew, with or without marks; Noto's marks were too faint
next to the letters. This copies each mark glyph (GDEF mark class) from the weight-800 instance
of the variable font into its default outline and drops the mark's weight variation, so marks
are bold at every text weight while the letters keep their full variable range. Mark positions
(GPOS anchors) are untouched. Noto is OFL with no reserved font name, so a modified copy is fine.

Input: the Hebrew subset of the Fontsource package in node_modules. Output, committed:
src/assets/fonts/noto-bold-marks/ (the font, the package's OFL licence, the version used).
Rerun after updating that package (a unit test compares the recorded versions):

    python -m venv .venv && .venv/Scripts/python -m pip install -r scripts/fonts/requirements.txt
    .venv/Scripts/python scripts/fonts/bold-marks.py
"""

import json
import shutil
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

MARK_WEIGHT = 800
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/assets/fonts/noto-bold-marks"
FAMILIES = ["noto-sans-hebrew"]


def bold_marks(source: Path, target: Path) -> int:
    # No timestamp: the same input gives the same file, so a rerun shows no change.
    font = TTFont(source, recalcTimestamp=False)
    heavy = instantiateVariableFont(TTFont(source), {"wght": MARK_WEIGHT})
    classes = font["GDEF"].table.GlyphClassDef.classDefs
    marks = [glyph for glyph, cls in classes.items() if cls == 3]
    for glyph in marks:
        font["glyf"][glyph] = heavy["glyf"][glyph]
        font["hmtx"][glyph] = heavy["hmtx"][glyph]  # the side bearing matches the new outline
        font["gvar"].variations.pop(glyph, None)
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
        print(f"{family}: {count} marks at weight {MARK_WEIGHT}")
    (OUT / "versions.json").write_text(
        json.dumps(versions, indent=2) + "\n", encoding="utf-8", newline="\n"
    )


if __name__ == "__main__":
    main()
