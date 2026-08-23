"""Tests for the PowerPoint builder.

The costly failure mode here is a deck that renders without raising but that
PowerPoint refuses to open, so most of these assertions inspect the saved
package rather than the in-memory objects.
"""

import re
import zipfile

import pytest
from lxml import etree
from pptx.util import Inches

from src.pptx_builder import SLIDE_TYPES, build_presentation

P_NS = "{http://schemas.openxmlformats.org/presentationml/2006/main}"
A_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)
FOOTER_TOP = SLIDE_H - Inches(0.62)
TOLERANCE = Inches(0.03)

# One minimal but valid spec per slide type, so the suite fails when a new type
# is added without coverage.
SPECS = {
    "title": {"type": "title", "title": "表題\n2行目", "subtitle": "副題", "footnote": "脚注"},
    "section": {"type": "section", "number": "02", "title": "章"},
    "closing": {"type": "closing", "title": "締め", "subtitle": "連絡先"},
    "statement": {"type": "statement", "title": "見出し", "body": "一行の主張"},
    "bullets": {"type": "bullets", "title": "見出し", "bullets": ["あ", "い", "う"]},
    "agenda": {"type": "agenda", "title": "見出し", "items": ["一", "二", "三"]},
    "takeaways": {"type": "takeaways", "title": "見出し", "items": ["甲", "乙"]},
    "columns": {
        "type": "columns",
        "title": "見出し",
        "columns": [
            {"title": "左", "items": ["a", "b"]},
            {"title": "右", "items": ["c"], "highlight": True},
        ],
    },
    "kpi": {
        "type": "kpi",
        "title": "見出し",
        "items": [
            {"label": "売上", "value": "100", "unit": "千円", "note": "前年比"},
            {"label": "粗利", "value": "28", "unit": "%"},
        ],
    },
    "table": {
        "type": "table",
        "title": "見出し",
        "rows": [["列1", "列2"], ["値1", "値2"], ["値3", "値4"]],
        "column_widths": [2, 1],
    },
    "chart": {
        "type": "chart",
        "title": "見出し",
        "categories": ["1月", "2月"],
        "series": [{"name": "売上", "values": [1, 2]}],
        "insight": ["伸びている"],
    },
    "architecture": {
        "type": "architecture",
        "title": "見出し",
        "nodes": [{"label": "A", "note": "説明"}, {"label": "B", "highlight": True}],
    },
    "beforeafter": {
        "type": "beforeafter",
        "title": "見出し",
        "before": {"title": "前", "items": ["旧1", "旧2"]},
        "after": {"title": "後", "items": ["新1"]},
    },
    "quote": {"type": "quote", "quote": "引用文", "author": "著者", "source": "出典"},
    "code": {"type": "code", "title": "見出し", "code": "x = 1\n# コメント", "caption": "説明"},
    "swimlane": {
        "type": "swimlane",
        "title": "見出し",
        "columns": ["8月", "9月", "10月"],
        "lanes": [
            {"name": "設計", "bars": [{"start": 0, "span": 2, "label": "作業"}]},
            {"name": "実装", "bars": [{"start": 1, "span": 1, "label": "作業", "tone": "accent"}]},
        ],
        "milestones": [{"column": 2, "label": "公開"}],
        "today": 1.5,
    },
    "sequence": {
        "type": "sequence",
        "title": "見出し",
        "actors": ["利用者", "UI", "Runtime"],
        "highlight": "Runtime",
        "messages": [
            {"from": 0, "to": 1, "label": "依頼"},
            {"from": 1, "to": 2, "label": "呼び出し"},
            {"from": 2, "to": 2, "label": "自己処理"},
            {"from": 2, "to": 0, "label": "返却", "return": True},
        ],
    },
    "orgchart": {
        "type": "orgchart",
        "title": "見出し",
        # A node with a single child used to collapse the connector to zero size.
        "root": {
            "name": "親",
            "children": [
                {"name": "子1", "children": [{"name": "孫1"}, {"name": "孫2"}]},
                {"name": "子2", "children": [{"name": "孫3"}]},
            ],
        },
    },
    "logictree": {
        "type": "logictree",
        "title": "見出し",
        "root": {
            "label": "問い",
            "children": [
                {"label": "枝1", "highlight": True, "children": [{"label": "葉1"}]},
                {"label": "枝2", "children": [{"label": "葉2"}, {"label": "葉3"}]},
            ],
        },
    },
    "flow": {
        "type": "flow",
        "title": "見出し",
        "steps": [
            {"type": "start", "label": "開始"},
            {"type": "decision", "label": "条件", "no_branch": "別処理"},
            {"type": "end", "label": "終了"},
        ],
    },
    "quadrant": {
        "type": "quadrant",
        "title": "見出し",
        "x_axis": "横軸",
        "y_axis": "縦軸",
        "quadrants": {"top_left": "左上\n2行", "top_right": "右上"},
        "points": [
            {"label": "点1", "x": 0.2, "y": 0.3},
            {"label": "点2", "x": 0.8, "y": 0.7, "highlight": True},
        ],
    },
}


@pytest.fixture(scope="module")
def hero_image(tmp_path_factory):
    from PIL import Image

    path = tmp_path_factory.mktemp("img") / "hero.png"
    Image.new("RGB", (320, 180), (20, 40, 60)).save(path)
    return str(path)


@pytest.fixture(scope="module")
def all_specs(hero_image):
    specs = dict(SPECS)
    specs["fullimage"] = {"type": "fullimage", "image": hero_image, "title": "全面", "subtitle": "副題"}
    return specs


def save(prs, tmp_path, name="deck.pptx"):
    path = tmp_path / name
    prs.save(str(path))
    return path


def parts(path):
    z = zipfile.ZipFile(path)
    return z, set(z.namelist())


def test_every_slide_type_has_a_spec(all_specs):
    assert sorted(all_specs) == SLIDE_TYPES


@pytest.mark.parametrize("kind", sorted(SPECS))
def test_each_type_renders_without_degenerate_shapes(kind, tmp_path):
    """A shape with zero width or height makes PowerPoint reject the file."""
    prs = build_presentation([SPECS[kind]], "テスト")
    path = save(prs, tmp_path, f"{kind}.pptx")
    z, names = parts(path)
    for name in names:
        if re.match(r"ppt/slides/slide\d+\.xml$", name):
            root = etree.fromstring(z.read(name))
            for ext in root.iter(A_NS + "ext"):
                assert ext.get("cx") != "0" and ext.get("cy") != "0", f"{kind}: zero-sized shape"


@pytest.mark.parametrize("kind", sorted(SPECS))
def test_each_type_stays_inside_the_slide(kind, tmp_path):
    prs = build_presentation([SPECS[kind]], "テスト")
    slide = prs.slides[0]
    for shape in slide.shapes:
        if shape.rotation:
            continue  # a rotated box is placed by its centre
        assert shape.left >= -TOLERANCE, f"{kind}: shape starts left of the slide"
        assert shape.left + shape.width <= SLIDE_W + TOLERANCE, f"{kind}: shape runs off the right"
        assert shape.top + shape.height <= SLIDE_H + TOLERANCE, f"{kind}: shape runs off the bottom"


@pytest.mark.parametrize("kind", sorted(SPECS))
def test_body_never_reaches_the_footer(kind, tmp_path):
    """Footer furniture is 9pt; anything larger must stop above the rule."""
    prs = build_presentation([SPECS[kind]], "テスト")
    for shape in prs.slides[0].shapes:
        if not shape.has_text_frame or not shape.text_frame.text.strip():
            continue
        runs = [r for p in shape.text_frame.paragraphs for r in p.runs]
        if runs and runs[0].font.size and runs[0].font.size.pt <= 9.5:
            continue
        assert shape.top + shape.height <= FOOTER_TOP + TOLERANCE, f"{kind}: {shape.text_frame.text[:20]!r} overlaps the footer"


def test_all_parts_are_well_formed_xml(all_specs, tmp_path):
    prs = build_presentation(list(all_specs.values()), "テスト")
    z, names = parts(save(prs, tmp_path))
    for name in names:
        if name.endswith((".xml", ".rels")):
            etree.fromstring(z.read(name))


def test_notes_declare_a_notes_master(tmp_path):
    """python-pptx adds the notesMaster relationship but not the declaration,
    and PowerPoint then reports the file as invalid."""
    prs = build_presentation([{"type": "bullets", "title": "見出し", "bullets": ["あ"], "notes": "メモ"}])
    z, names = parts(save(prs, tmp_path))
    assert any(n.startswith("ppt/notesSlides/notesSlide") for n in names)
    presentation = etree.fromstring(z.read("ppt/presentation.xml"))
    declared = presentation.find(P_NS + "notesMasterIdLst")
    assert declared is not None, "notesMasterIdLst is missing"
    children = [etree.QName(c).localname for c in presentation]
    # The schema fixes the order of CT_Presentation's children.
    assert children.index("notesMasterIdLst") == children.index("sldMasterIdLst") + 1
    assert children.index("notesMasterIdLst") < children.index("sldIdLst")


def test_no_notes_means_no_notes_master(tmp_path):
    prs = build_presentation([{"type": "bullets", "title": "見出し", "bullets": ["あ"]}])
    z, _ = parts(save(prs, tmp_path))
    presentation = etree.fromstring(z.read("ppt/presentation.xml"))
    assert presentation.find(P_NS + "notesMasterIdLst") is None


def test_notes_text_is_stored(tmp_path):
    prs = build_presentation([{"type": "bullets", "title": "見出し", "bullets": ["あ"], "notes": "話す内容"}])
    assert prs.slides[0].notes_slide.notes_text_frame.text == "話す内容"


def test_fullimage_scrim_is_actually_transparent(hero_image, tmp_path):
    """python-pptx has no transparency API; without the fix the image is hidden."""
    prs = build_presentation([{"type": "fullimage", "image": hero_image, "title": "全面"}])
    z, _ = parts(save(prs, tmp_path))
    xml = z.read("ppt/slides/slide1.xml").decode()
    assert re.search(r'<a:alpha val="\d+"/>', xml), "the scrim is fully opaque"


def test_newlines_become_separate_paragraphs(tmp_path):
    prs = build_presentation([{"type": "title", "title": "一行目\n二行目"}])
    texts = [s.text_frame.text for s in prs.slides[0].shapes if s.has_text_frame]
    assert "一行目\n二行目" in texts
    assert not any("\\n" in t for t in texts), "a literal backslash-n reached the slide"


def test_key_message_pushes_the_body_down(tmp_path):
    without = build_presentation([{"type": "bullets", "title": "見出し", "bullets": ["あ"]}])
    with_message = build_presentation([{"type": "bullets", "title": "見出し", "message": "一行目\n二行目", "bullets": ["あ"]}])

    def bullet_top(prs):
        return next(s.top for s in prs.slides[0].shapes if s.has_text_frame and s.text_frame.text == "あ")

    assert bullet_top(with_message) > bullet_top(without)


def test_key_message_is_larger_than_the_body(tmp_path):
    prs = build_presentation([{"type": "bullets", "title": "見出し", "message": "主張", "bullets": ["あ"]}])
    sizes = {s.text_frame.text: s.text_frame.paragraphs[0].runs[0].font.size.pt for s in prs.slides[0].shapes if s.has_text_frame and s.text_frame.paragraphs[0].runs}
    assert sizes["主張"] > sizes["あ"]


def test_deck_title_and_page_numbers_appear_only_on_body_slides(tmp_path):
    prs = build_presentation(
        [
            {"type": "title", "title": "表紙"},
            {"type": "bullets", "title": "本文1", "bullets": ["あ"]},
            {"type": "section", "title": "章"},
            {"type": "bullets", "title": "本文2", "bullets": ["い"]},
        ],
        "デッキ名",
    )
    numbers = []
    for slide in prs.slides:
        texts = [s.text_frame.text for s in slide.shapes if s.has_text_frame]
        numbers.append([t for t in texts if t.isdigit()])
    # Full-bleed slides carry no footer, and numbering skips them.
    assert numbers == [[], ["1"], [], ["2"]]


def test_deck_title_is_optional(tmp_path):
    prs = build_presentation([{"type": "bullets", "title": "見出し", "bullets": ["あ"]}])
    texts = [s.text_frame.text for s in prs.slides[0].shapes if s.has_text_frame]
    assert not any(t.isdigit() for t in texts)


@pytest.mark.parametrize(
    "spec, expected",
    [
        ({"type": "unknown"}, "unknown type"),
        ({"type": "bullets", "message": "1\n2\n3", "bullets": ["あ"]}, "up to 2 lines"),
        (
            {"type": "swimlane", "columns": [str(i) for i in range(11)], "lanes": [{"name": "a", "bars": []}]},
            "up to 10 columns",
        ),
        (
            {"type": "sequence", "actors": ["a", "b"], "messages": [{"from": 0, "to": 1, "label": "x"}] * 11},
            "up to 10 messages",
        ),
        (
            {"type": "sequence", "actors": ["a", "b"], "messages": [{"from": 0, "to": 5}]},
            "does not exist",
        ),
        (
            {"type": "swimlane", "columns": ["1", "2"], "lanes": [{"name": "a", "bars": [{"start": 1, "span": 5}]}]},
            "outside the 2 columns",
        ),
        ({"type": "agenda", "items": [f"項目{i}" for i in range(20)]}, "does not fit"),
        ({"type": "code", "code": "\n".join(f"line {i}" for i in range(30))}, "up to 18 lines"),
        ({"type": "columns", "columns": [{"title": "a", "items": []}]}, "2 to 4 columns"),
        ({"type": "table", "rows": [["a", "b"]]}, "at least one body row"),
        ({"type": "table", "rows": [["a", "b"], ["c"]]}, "same number of cells"),
        (
            {"type": "chart", "categories": ["1", "2"], "series": [{"name": "s", "values": [1]}]},
            "one value per category",
        ),
        (
            {"type": "chart", "chart_type": "donut", "categories": ["1"], "series": [{"name": "s", "values": [1]}]},
            "chart_type must be one of",
        ),
        (
            {"type": "quadrant", "points": [{"label": "x", "x": 1.4, "y": 0.5}]},
            "between 0 and 1",
        ),
        ({"type": "fullimage"}, "requires an image path"),
    ],
)
def test_invalid_specs_raise_with_a_useful_message(spec, expected):
    with pytest.raises(ValueError, match=re.escape(expected)):
        build_presentation([spec])


def test_errors_name_the_slide_that_failed():
    with pytest.raises(ValueError, match=r"slide 2 \(table\)"):
        build_presentation(
            [
                {"type": "bullets", "title": "見出し", "bullets": ["あ"]},
                {"type": "table", "rows": [["a", "b"], ["c"]]},
            ]
        )


def test_empty_deck_is_rejected():
    with pytest.raises(ValueError, match="at least one slide"):
        build_presentation([])


def test_non_object_slide_is_rejected():
    with pytest.raises(ValueError, match="must be an object"):
        build_presentation(["タイトル"])


def test_deck_is_widescreen():
    prs = build_presentation([{"type": "title", "title": "表紙"}])
    assert prs.slide_width == int(SLIDE_W)
    assert prs.slide_height == int(SLIDE_H)


def test_east_asian_typeface_is_set(tmp_path):
    """Setting only the latin typeface leaves CJK glyphs on the theme font."""
    prs = build_presentation([{"type": "bullets", "title": "見出し", "bullets": ["日本語"]}])
    z, _ = parts(save(prs, tmp_path))
    root = etree.fromstring(z.read("ppt/slides/slide1.xml"))
    faces = {(e.tag.split("}")[1], e.get("typeface")) for e in root.iter() if e.tag.endswith(("}latin", "}ea"))}
    assert ("latin", "Yu Gothic") in faces
    assert ("ea", "Yu Gothic") in faces
