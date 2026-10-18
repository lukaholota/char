import copy
import json
import re
import tempfile
import unittest
from pathlib import Path

import article_worksheet as worksheet


ROOT = Path(__file__).resolve().parents[2]
PAGE_URL = "https://rpgbot.net/dnd5/characters/classes/monk/subclasses/shadow/"
REVISION_ID = "rpgbot-test0000000000000-aaaaaaaaaaaaaaaa"
SPLASH_DETAIL = '<figure class="wp-block-image size-large article-splash-image"><img src="data:image/gif,GIF89a"'


def text(value):
    return {"type": "text", "text": value}


def link(value, anchor):
    return {"type": "link", "text": value, "href": f"{PAGE_URL}{anchor}"}


def paragraph(block_id, *nodes):
    return {"blockId": block_id, "type": "paragraph", "content": list(nodes)}


def issue(code, detail):
    return {"code": code, "detail": detail}


def build_stage():
    legend = [issue("rating-signal-review", f"rating-{color} {color.title()}")
              for color in ("red", "orange", "green", "blue")]
    return {
        "canonicalUrl": PAGE_URL,
        "sourceRevision": {"revisionId": REVISION_ID, "sourceId": "rpgbot-test0000000000000",
                           "title": "Shadow Monk Guide", "authors": ["A"]},
        "sections": [
            {"sectionId": "section-introduction", "heading": "Introduction", "blocks": [
                paragraph("block-section-introduction-1", text("Shadow is "), {"type": "emphasis", "text": "great"},
                          text(", see "), link("the guide", "#features"), text(" and "),
                          {"type": "strong", "text": "more"}, text("."))]},
            {"sectionId": "section-2", "heading": "Table of Contents", "blocks": [
                {"blockId": "block-section-2-1", "type": "list", "ordered": False,
                 "items": [[link("Introduction", "#introduction")], [link("Features", "#features")]]}]},
            {"sectionId": "section-disclaimer", "heading": "Rating System", "blocks": [
                {"blockId": "block-section-disclaimer-1", "type": "list", "ordered": False,
                 "items": [[text("Red: bad")], [text("Orange: ok")], [text("Green: good")], [text("Blue: best")]]}]},
            {"sectionId": "section-features", "heading": "Features", "blocks": [
                {"blockId": "block-section-features-1", "type": "list", "ordered": False,
                 "items": [[text("Shadow Arts: casts spells.")], [text("Tipsy Sway: wobbles.")],
                           [text("Darkvision: sees. See "), link("Fog Cloud", "#fog")]]},
                {"blockId": "block-section-features-2", "type": "table", "headers": [[text("Level")], [text("Feature")]],
                 "rows": [[[text("3")], [text("Shadow Arts")]], [[text("11")], [text("Shadow Step")]]]}]},
        ],
        "issues": legend + [
            issue("rating-signal-review", "wp-block-heading rating- Features"),
            issue("rating-signal-review", "rating-green Shadow Arts"),
            issue("rating-signal-review", "rating-none Tipsy Sway"),
            issue("rating-signal-review", "rating-blue Darkvision"),
            issue("provisional-id", "block-section-features-1"),
            issue("unsupported-block", SPLASH_DETAIL),
            issue("table-header-review", "First row has no explicit th cells"),
        ],
    }


def fill_worksheet(sheet, translate):
    lines = sheet.split("\n")
    key = None
    for index, line in enumerate(lines):
        header = re.match(r"### ([^ ]+) · ", line)
        if header:
            key = header.group(1)
        elif line.startswith("<!-- sectionId:"):
            key = re.match(r"<!-- sectionId: ([^;]+);", line).group(1)
        elif line in ("**Український заголовок:**", "**Українською:**") and lines[index + 1] == "":
            lines[index + 1] = translate(key, line)
    return "\n".join(lines)


def translate_synthetic(key, label):
    answers = {
        "section-introduction": "Вступ",
        "section-2": "Зміст",
        "section-disclaimer": "Система оцінок",
        "section-features": "Уміння",
        "block-section-introduction-1": "Тінь — *чудова*, дивіться [[1|гайд]] і **більше**.",
        "block-section-features-1/item/0": "Тіньові мистецтва{{Shadow Arts}}: накладає заклинання.",
        "block-section-features-1/item/1": "Пʼяна хиткість: хитається.",
        "block-section-features-1/item/2": "Темний зір: бачить. Дивіться [[1|Туманну хмару]]",
        "block-section-features-2/header/0": "Рівень",
        "block-section-features-2/header/1": "Уміння",
        "block-section-features-2/row/0/1": "Тіньові мистецтва",
        "block-section-features-2/row/1/1": "Тіньовий крок",
        "block-section-disclaimer-1/item/0": "Червоний: поганий",
        "block-section-disclaimer-1/item/1": "Помаранчевий: нормальний",
        "block-section-disclaimer-1/item/2": "Зелений: хороший",
        "block-section-disclaimer-1/item/3": "Синій: найкращий",
    }
    return answers[key]


def render_synthetic_sheet(stage=None):
    stage = stage or build_stage()
    sheet, _ = worksheet.render_worksheet(stage, "monk-shadow", "RULES_2014", ["Монах", "підклас"])
    return stage, sheet


def finish_sheet(sheet, extra_answers=None):
    sheet = sheet.replace("# Shadow Monk Guide", "# Монах Тіні — гайд", 1)
    sheet = sheet.replace("<!-- issueReviewedAt: pending -->", "<!-- issueReviewedAt: 2026-10-01T10:00:00Z -->")
    extra_answers = extra_answers or {}
    return fill_worksheet(sheet, lambda key, label: extra_answers.get(key) or translate_synthetic(key, label))


def compile_synthetic(stage, sheet, decisions=None):
    return worksheet.compile_article(stage, finish_sheet(sheet), decisions or {})


class RenderTest(unittest.TestCase):
    def test_partial_rating_legend_remains_rejected(self):
        stage = build_stage()
        del stage["issues"][3]
        with self.assertRaisesRegex(ValueError, "Unexpected rating legend"):
            worksheet.render_worksheet(stage, "monk-shadow", "RULES_2014", ["feats"])

    def test_unrated_option_heading_uses_a_valid_none_tag(self):
        stage = build_stage()
        stage["issues"][4] = {"code": "rating-signal-review", "detail": "rating-none Features", "location": "h2/span[1]"}
        sheet, _ = worksheet.render_worksheet(stage, "monk-shadow", "RULES_2014", ["feats"])
        self.assertIn("<!-- sectionId: section-features; rating: none -->", sheet)
        worksheet.compile_article(stage, finish_sheet(sheet), {})

    def test_unrated_article_compiles_without_a_legend(self):
        stage = build_stage()
        stage["issues"] = []
        stage["sections"] = [stage["sections"][0]]
        sheet, _ = worksheet.render_worksheet(stage, "unrated", "RULES_2014", ["feats"], {})
        sheet = finish_sheet(sheet)
        document, review, metrics = worksheet.compile_article(stage, sheet, {})
        self.assertEqual(document["ratings"], [])
        self.assertEqual(len(document["translations"][0]["sections"]), 1)
        self.assertEqual(metrics["links"], 1)
        self.assertEqual(review["issueDecisions"], [])

    def test_sheet_shows_markup_ratings_and_auto_contents(self):
        _, sheet = render_synthetic_sheet()
        self.assertIn("> Shadow is *great*, see [[1|the guide]] and **more**.", sheet)
        self.assertIn("### block-section-features-1/item/0 · пункт · rating-green", sheet)
        self.assertIn("### block-section-features-1/item/1 · пункт · rating-none", sheet)
        self.assertIn("### block-section-2-1/item/0 · зміст · без оцінки", sheet)
        fragment_headers = len(re.findall(r"^### ", sheet, re.M))
        self.assertEqual(sheet.count("· зміст ·"), 2)
        self.assertEqual(sheet.count("**Українською:**"), fragment_headers - 2)

    def test_numeric_table_cells_are_prefilled_and_text_cells_are_not(self):
        _, sheet = render_synthetic_sheet()
        self.assertRegex(sheet, r"row/0/0 · комірка таблиці · без оцінки\n\n> 3\n\n\*\*Українською:\*\*\n3\n")
        self.assertRegex(sheet, r"row/0/1 · комірка таблиці · без оцінки\n\n> Shadow Arts\n\n\*\*Українською:\*\*\n\n")

    def test_numeric_table_cell_with_an_asterisk_is_prefilled_escaped_and_compiles_unchanged(self):
        stage = build_stage()
        stage["sections"][3]["blocks"][1]["rows"][1][0] = [text("11.08*2")]
        _, sheet = render_synthetic_sheet(stage)
        self.assertRegex(sheet, r"> 11\.08\\\*2\n\n\*\*Українською:\*\*\n11\.08\\\*2\n")
        document, _, _ = compile_synthetic(stage, sheet)
        cell = document["translations"][0]["sections"][3]["blocks"][1]["rows"][1][0]
        self.assertEqual(cell, [{"type": "text", "text": "11.08*2"}])

    def test_shared_translations_prefill_headings_and_matching_fragments_only(self):
        shared = {"headings": {"Introduction": "Вступ"},
                  "fragments": {"Red: bad": "Червоний: поганий", "Orange: ok": "Не той переклад"}}
        sheet, _ = worksheet.render_worksheet(build_stage(), "monk-shadow", "RULES_2014", [], shared)
        self.assertIn("**Український заголовок:**\nВступ\n", sheet)
        self.assertRegex(sheet, r"> Red: bad\n\n\*\*Українською:\*\*\nЧервоний: поганий\n")
        self.assertRegex(sheet, r"> Green: good\n\n\*\*Українською:\*\*\n\n")
        self.assertRegex(sheet, r"> Orange: ok\n\n\*\*Українською:\*\*\nНе той переклад\n")

    def test_bracket_markup_in_source_is_rejected(self):
        stage = build_stage()
        stage["sections"][0]["blocks"][0]["content"][0]["text"] = "see [[x]]"
        with self.assertRaisesRegex(ValueError, "markup characters"):
            worksheet.render_worksheet(stage, "monk-shadow", "RULES_2014", [])

    def test_literal_asterisk_is_escaped_in_the_sheet_and_restored_in_the_translation(self):
        stage = build_stage()
        stage["sections"][0]["blocks"][0]["content"][0]["text"] = "Hit 10*65% of the time. "
        _, sheet = render_synthetic_sheet(stage)
        self.assertIn("> Hit 10\\*65% of the time. *great*", sheet)
        filled = finish_sheet(sheet).replace("Тінь — *чудова*", "Влучання 10\\*65% — *чудова*", 1)
        document, _, _ = worksheet.compile_article(stage, filled, {})
        nodes = document["translations"][0]["sections"][0]["blocks"][0]["content"]
        self.assertEqual(nodes[0], {"type": "text", "text": "Влучання 10*65% — "})
        stray = filled.replace("Влучання 10\\*65%", "Влучання 10*65%", 1)
        with self.assertRaisesRegex(ValueError, "Emphasis|Unbalanced"):
            worksheet.compile_article(stage, stray, {})

    def test_superscript_book_tag_parentheses_are_rendered_translated_and_counted(self):
        stage = build_stage()
        stage["sections"][0]["blocks"][0]["content"].extend([
            text(" Tag "), {"type": "superscript", "text": "("}, link("PHB", "#phb"), {"type": "superscript", "text": ")"}])
        _, sheet = render_synthetic_sheet(stage)
        self.assertIn("**more**. Tag ^^(^^[[2|PHB]]^^)^^", sheet)
        filled = finish_sheet(sheet).replace("і **більше**.", "і **більше**. Тег ^^(^^[[2|PHB]]^^)^^", 1)
        document, _, _ = worksheet.compile_article(stage, filled, {})
        nodes = document["translations"][0]["sections"][0]["blocks"][0]["content"]
        self.assertEqual([node["text"] for node in nodes if node["type"] == "superscript"], ["(", ")"])
        flattened = filled.replace("Тег ^^(^^[[2|PHB]]^^)^^", "Тег ^^(^^[[2|PHB]])", 1)
        with self.assertRaisesRegex(ValueError, "Emphasis"):
            worksheet.compile_article(stage, flattened, {})

    def test_blank_superscripts_around_a_link_may_be_dropped_in_the_translation(self):
        stage = build_stage()
        stage["sections"][0]["blocks"][0]["content"].extend([
            text(" Tag"), {"type": "superscript", "text": " "}, link("PHB", "#phb"), {"type": "superscript", "text": " "}, text(": ok")])
        _, sheet = render_synthetic_sheet(stage)
        self.assertIn("Tag^^ ^^[[2|PHB]]^^ ^^: ok", sheet)
        filled = finish_sheet(sheet).replace("і **більше**.", "і **більше**. Тег [[2|PHB]]: гаразд", 1)
        document, _, _ = worksheet.compile_article(stage, filled, {})
        nodes = document["translations"][0]["sections"][0]["blocks"][0]["content"]
        self.assertEqual([node["type"] for node in nodes if node["type"] == "superscript"], [])
        kept = finish_sheet(sheet).replace("і **більше**.", "і **більше**. Тег^^ ^^[[2|PHB]]^^ ^^: гаразд", 1)
        worksheet.compile_article(stage, kept, {})

    def test_visible_superscript_still_has_to_be_kept(self):
        stage = build_stage()
        stage["sections"][0]["blocks"][0]["content"].extend([text(" Tag "), {"type": "superscript", "text": "2"}])
        _, sheet = render_synthetic_sheet(stage)
        filled = finish_sheet(sheet).replace("і **більше**.", "і **більше**. Тег 2", 1)
        with self.assertRaisesRegex(ValueError, "Emphasis"):
            worksheet.compile_article(stage, filled, {})

    def test_double_caret_in_source_text_is_rejected(self):
        stage = build_stage()
        stage["sections"][0]["blocks"][0]["content"][0]["text"] = "a ^^ b"
        with self.assertRaisesRegex(ValueError, "markup characters"):
            worksheet.render_worksheet(stage, "monk-shadow", "RULES_2014", [])

    def test_subscript_is_still_rejected(self):
        stage = build_stage()
        stage["sections"][0]["blocks"][0]["content"].append({"type": "subscript", "text": "2"})
        with self.assertRaisesRegex(ValueError, "Unsupported inline node"):
            worksheet.render_worksheet(stage, "monk-shadow", "RULES_2014", [])


class HeadingRatingTest(unittest.TestCase):
    def test_colored_label_matching_a_section_heading_becomes_a_heading_rating(self):
        stage = build_stage()
        stage["sections"].append({"sectionId": "section-dragon", "heading": "Way of The Dragon (FToD)", "blocks": [
            paragraph("block-section-dragon-1", text("A dragon monk."))]})
        stage["issues"].append(issue("rating-signal-review", "rating-green Way of The Dragon"))
        _, plan = worksheet.render_worksheet(stage, "monk-shadow", "RULES_2014", ["Монах"])
        self.assertEqual(plan.unmatched, [])
        self.assertEqual(plan.heading_matches["section-dragon"].color, "green")

    def test_contents_link_is_not_taken_for_the_colored_label_of_its_section_heading(self):
        stage = build_stage()
        stage["sections"][1]["blocks"][0]["items"].append([link("Way of The Dragon (FToD)", "#dragon")])
        stage["sections"].append({"sectionId": "section-dragon", "heading": "Way of The Dragon (FToD)", "blocks": [
            paragraph("block-section-dragon-1", text("A dragon monk."))]})
        stage["issues"].insert(4, issue("rating-signal-review", "rating-green Way of The Dragon"))
        sheet, plan = worksheet.render_worksheet(stage, "monk-shadow", "RULES_2014", ["Монах"])
        self.assertEqual(plan.heading_matches["section-dragon"].color, "green")
        self.assertNotIn("block-section-2-1/item/2", plan.matches)

    def test_colored_heading_link_rates_the_heading_not_a_paragraph_that_starts_with_its_name(self):
        stage = build_stage()
        stage["sections"].append({"sectionId": "section-dragon", "heading": "Way of The Dragon (FToD)", "blocks": [
            paragraph("block-section-dragon-1", text("Way of The Dragon is a flying monk."))]})
        stage["issues"].append({"code": "rating-signal-review", "detail": "rating-blue Way of The Dragon", "location": "h3/a[1]"})
        _, plan = worksheet.render_worksheet(stage, "monk-shadow", "RULES_2014", ["Монах"])
        self.assertEqual(plan.heading_matches["section-dragon"].color, "blue")
        self.assertNotIn("block-section-dragon-1", plan.matches)

    def test_heading_with_the_rating_class_before_the_heading_class_rates_the_heading(self):
        stage = build_stage()
        stage["sections"].append({"sectionId": "section-dragon", "heading": "Way of The Dragon Features", "blocks": [
            paragraph("block-section-dragon-1", text("A dragon monk."))]})
        stage["issues"].append(issue("rating-signal-review", "rating-green wp-block-heading Way of The Dragon Features"))
        _, plan = worksheet.render_worksheet(stage, "monk-shadow", "RULES_2014", ["Монах"])
        self.assertEqual(plan.unmatched, [])
        self.assertEqual(plan.heading_matches["section-dragon"].color, "green")

    def test_label_that_matches_neither_a_row_nor_a_heading_stays_unmatched(self):
        stage = build_stage()
        stage["issues"].append(issue("rating-signal-review", "rating-green Nothing Like It"))
        _, plan = worksheet.render_worksheet(stage, "monk-shadow", "RULES_2014", ["Монах"])
        self.assertEqual([signal.label for signal in plan.unmatched], ["Nothing Like It"])


class RatingContextTest(unittest.TestCase):
    def test_fey_wanderer_source_typo_retains_blue_rating(self):
        signal = worksheet.parse_rating_signal(32, "ratin-blue blue")
        self.assertEqual((signal.kind, signal.color, signal.label), (worksheet.SIGNAL_OPTION, "blue", "blue"))
        with self.assertRaises(ValueError):
            worksheet.parse_rating_signal(32, "ratin-violet blue")

    def test_context_is_the_name_before_a_marker_colon_or_parenthesis(self):
        for translation, context in [
            ("Тіньові мистецтва{{Shadow Arts}}: накладає.", "Тіньові мистецтва"),
            ("Темний зір (PHB): бачить.", "Темний зір"),
            ("Пояс: сила.", "Пояс"),
        ]:
            self.assertEqual(worksheet.find_rating_context([{"type": "text", "text": translation}]), context)

    def test_paired_marker_at_the_start_gives_its_ukrainian_name(self):
        nodes = [{"type": "text", "text": "{{Присвячена зброя (Доповнення)|Dedicated Weapon (Addition)}}: мало розширює."}]
        self.assertEqual(worksheet.find_rating_context(nodes), "Присвячена зброя")


class ParagraphBreakTest(unittest.TestCase):
    def test_translation_with_blank_lines_keeps_paragraph_breaks_in_the_text_node(self):
        stage, sheet = render_synthetic_sheet()
        sheet = finish_sheet(sheet)
        old = "Тіньові мистецтва{{Shadow Arts}}: накладає заклинання."
        new = "Тіньові мистецтва{{Shadow Arts}}: накладає заклинання.\n\nДругий абзац пояснення.\nНовий рядок."
        self.assertIn(old, sheet)
        document, _, _ = worksheet.compile_article(stage, sheet.replace(old, new, 1), {})
        item = document["translations"][0]["sections"][3]["blocks"][0]["items"][0]
        self.assertEqual(item[0]["text"], new)


class CompileTest(unittest.TestCase):
    def test_formatted_numeric_cell_keeps_style_and_rejects_changed_value(self):
        stage = build_stage()
        stage["sections"][3]["blocks"][1]["rows"][0][0] = [{"type": "strong", "text": "3"}]
        _, sheet = render_synthetic_sheet(stage)
        original = "> **3**\n\n**Українською:**\n**3**"
        self.assertIn(original, sheet)
        document, _, _ = compile_synthetic(stage, sheet)
        cell = document["translations"][0]["sections"][3]["blocks"][1]["rows"][0][0]
        self.assertEqual(cell, [{"type": "strong", "text": "3"}])
        with self.assertRaisesRegex(ValueError, "Changed numeric table cell"):
            compile_synthetic(stage, sheet.replace(original, "> **3**\n\n**Українською:**\n**4**", 1))
        with self.assertRaisesRegex(ValueError, "Emphasis"):
            compile_synthetic(stage, sheet.replace(original, "> **3**\n\n**Українською:**\n3", 1))

    def test_nodes_ratings_contents_and_decisions(self):
        stage, sheet = render_synthetic_sheet()
        document, review, metrics = compile_synthetic(stage, sheet)
        sections = document["translations"][0]["sections"]
        intro = sections[0]["blocks"][0]["content"]
        self.assertEqual([node["type"] for node in intro], ["text", "emphasis", "text", "link", "text", "strong", "text"])
        self.assertEqual(intro[3], {"type": "link", "text": "гайд", "href": f"{PAGE_URL}#features"})
        contents = sections[1]["blocks"][0]["items"]
        self.assertEqual(contents[1], [{"type": "link", "text": "Уміння", "href": f"{PAGE_URL}#features"}])
        ratings = {rating["context"]: rating for rating in document["ratings"]}
        self.assertEqual(ratings["Тіньові мистецтва"]["score"], 3)
        self.assertNotIn("score", ratings["Пʼяна хиткість"])
        self.assertEqual(ratings["Темний зір"]["sourceColor"], "blue")
        self.assertEqual(document["article"]["articleId"], "rpgbot-monk-shadow-2014")
        self.assertEqual(document["article"]["status"], "unpublished")
        self.assertEqual(document["translations"][0]["status"], "draft")
        dispositions = {item["issueIndex"]: item["disposition"] for item in review["issueDecisions"]}
        self.assertEqual([dispositions[index] for index in range(4)], ["excluded-noncontent"] * 4)
        self.assertEqual(dispositions[4], "excluded-noncontent")
        self.assertEqual([dispositions[index] for index in (5, 6, 7)], ["preserved"] * 3)
        self.assertEqual(dispositions[9], "excluded-noncontent")
        self.assertEqual(dispositions[10], "preserved")
        self.assertNotIn(8, dispositions)
        self.assertEqual(metrics["ratings"], 3)

    def test_changed_links_formatting_rating_tags_and_numbers_are_rejected(self):
        stage, sheet = render_synthetic_sheet()

        def compile_with(replacements):
            filled = finish_sheet(sheet)
            for old, new in replacements:
                self.assertIn(old, filled)
                filled = filled.replace(old, new, 1)
            return worksheet.compile_article(stage, filled, {})

        with self.assertRaisesRegex(ValueError, "Link markers"):
            compile_with([("[[1|гайд]]", "гайд")])
        with self.assertRaisesRegex(ValueError, "Link markers"):
            compile_with([("[[1|гайд]]", "[[2|гайд]]")])
        with self.assertRaisesRegex(ValueError, "Emphasis"):
            compile_with([("*чудова*", "чудова")])
        with self.assertRaisesRegex(ValueError, "Emphasis"):
            compile_with([("**більше**", "більше")])
        with self.assertRaisesRegex(ValueError, "Changed source kind or rating"):
            compile_with([("· пункт · rating-green", "· пункт · rating-blue")])
        with self.assertRaisesRegex(ValueError, "Changed numeric table cell"):
            compile_with([("> 3\n\n**Українською:**\n3", "> 3\n\n**Українською:**\n4")])

    def test_unmatched_color_signal_needs_a_decision(self):
        stage, sheet = render_synthetic_sheet()
        stage["issues"].append(issue("rating-signal-review", "rating-green word"))
        with self.assertRaisesRegex(ValueError, "Unresolved rating signals"):
            compile_synthetic(stage, sheet)
        decision = {"disposition": "excluded-noncontent", "evidence": "Color word inside prose, not an option rating"}
        _, review, _ = compile_synthetic(stage, sheet, {str(len(stage["issues"]) - 1): decision})
        self.assertEqual(review["issueDecisions"][-1]["evidence"], decision["evidence"])

    def test_unknown_issue_needs_a_decision_and_unknown_decision_is_rejected(self):
        stage, sheet = render_synthetic_sheet()
        stage["issues"].append(issue("inline-markup-review", "s"))
        with self.assertRaisesRegex(ValueError, "Unreviewed source issue"):
            compile_synthetic(stage, sheet)
        decision = {"disposition": "preserved", "evidence": "Struck-through text retained as plain text"}
        compile_synthetic(stage, sheet, {str(len(stage["issues"]) - 1): decision})
        with self.assertRaisesRegex(ValueError, "Decision for a handled issue"):
            compile_synthetic(stage, sheet, {"0": decision})

    def test_video_embed_is_excluded_by_owner_decision(self):
        stage, sheet = render_synthetic_sheet()
        stage["issues"].append(issue("unsupported-block", '<figure class="wp-block-embed is-type-video is-provider-youtube">'))
        _, review, _ = compile_synthetic(stage, sheet)
        self.assertIn("video", review["issueDecisions"][-1]["evidence"].lower())

    def test_source_revision_must_match(self):
        stage, sheet = render_synthetic_sheet()
        other = copy.deepcopy(stage)
        other["sourceRevision"]["revisionId"] = "rpgbot-other-bbbbbbbbbbbbbbbb"
        with self.assertRaisesRegex(ValueError, "another source revision"):
            compile_synthetic(other, sheet)


class OutputTest(unittest.TestCase):
    def test_outputs_are_created_once_and_never_replaced(self):
        stage, sheet = render_synthetic_sheet()
        document, review, _ = compile_synthetic(stage, sheet)
        with tempfile.TemporaryDirectory() as directory:
            paths = worksheet.plan_outputs(Path(directory), document, review)
            worksheet.write_outputs(paths)
            self.assertEqual(json.loads(paths[0][0].read_text())["article"]["slug"], "monk-shadow-2014")
            with self.assertRaises(FileExistsError):
                worksheet.write_outputs(paths)


class RealPagesTest(unittest.TestCase):
    def test_every_2014_monk_page_renders(self):
        coverage = json.loads((ROOT / "data/rpgbot/translation.coverage.json").read_text())
        pages = [row for row in coverage["rows"] if "/dnd5/characters/classes/monk/" in row["canonicalUrl"]]
        self.assertEqual(len(pages), 11)
        for row in pages:
            with self.subTest(url=row["canonicalUrl"]):
                stage = json.loads((ROOT / f"data/rpgbot/staging/{row['sourceRevisionId']}.json").read_text())
                sheet, plan = worksheet.render_worksheet(stage, "x", "RULES_2014", [])
                self.assertIn(f"sourceRevisionId: {row['sourceRevisionId']}", sheet)
                self.assertGreater(len(plan.matches), 0)



class NeutralPunctuationTest(unittest.TestCase):
    def test_tortle_neutral_parentheses_are_decorative(self):
        for index, character in enumerate("()"):
            signal = worksheet.parse_rating_signal(index, "font-size: revert; color: initial; " + character)
            self.assertEqual(signal.kind, worksheet.SIGNAL_DECORATIVE)
            self.assertEqual(signal.label, character)
            self.assertEqual(signal.color, "")




class MarkerRatingContextTest(unittest.TestCase):
    def test_english_marker_keeps_rating_option_name(self):
        self.assertEqual(worksheet.find_rating_context([text("{{Carapace}}: defense")]), "Carapace")

    def test_translated_marker_keeps_rating_option_name(self):
        self.assertEqual(worksheet.find_rating_context([text("{{Панцир|Carapace}}: defense")]), "Панцир")


class SourceBookHeadingRatingTest(unittest.TestCase):
    def test_source_book_superscripts_keep_heading_ratings_without_matching_longer_names(self):
        self.assertTrue(worksheet.starts_with_heading_label("Dwarven FortitudeXGtE", "Dwarven Fortitude"))
        self.assertTrue(worksheet.starts_with_heading_label("Squat NimblenessXGtE", "Squat Nimbleness"))
        self.assertTrue(worksheet.starts_with_heading_label("MobilePHB", "Mobile"))
        self.assertTrue(worksheet.starts_with_heading_label("Svirfneblin MagicEEPC / SCAG", "Svirfneblin Magic"))
        self.assertFalse(worksheet.starts_with_heading_label("Dwarven FortitudeExtra", "Dwarven Fortitude"))



class ChallengeRatingLabelsTest(unittest.TestCase):
    def test_colored_beast_name_after_cr_prefix_maps_to_its_paragraph(self):
        for prefix in ("CR 3 – ", "CR 1/8 — "):
            with self.subTest(prefix=prefix):
                stage = build_stage()
                stage["sections"][-1]["blocks"].append(paragraph("beast-form", text(prefix), text("Giant Scorpion")))
                stage["issues"].append(issue("rating-signal-review", "rating-green Giant Scorpion"))
                plan = worksheet.plan_ratings(stage, worksheet.collect_fragments(stage))
                self.assertEqual(plan.matches["beast-form"].color, "green")

    def test_cr_prefix_does_not_match_a_name_elsewhere_in_prose(self):
        self.assertFalse(worksheet.starts_with_label([text("CR 3 – Consider Giant Scorpion")], "Giant Scorpion"))

def signal_issue(location, detail):
    return {"code": "rating-signal-review", "location": location, "detail": detail}


def build_list_stage(*extra_blocks, items=("Ankylosaurus: tanks.",)):
    stage = build_stage()
    stage["sections"].append({"sectionId": "section-forms", "heading": "Forms", "blocks": [
        *extra_blocks, {"blockId": "block-forms", "type": "list", "ordered": False, "items": [[text(item)] for item in items]}]})
    return stage


class ListItemRatingTest(unittest.TestCase):
    def test_list_item_signal_skips_an_intro_paragraph_that_starts_with_the_same_name(self):
        stage = build_list_stage(paragraph("block-intro", text("Ankylosaurus forms are covered below.")))
        stage["issues"].append(signal_issue("li/span[1]", "rating-blue Ankylosaurus"))
        plan = worksheet.plan_ratings(stage, worksheet.collect_fragments(stage))
        self.assertEqual([key for key, signal in plan.matches.items() if signal.label == "Ankylosaurus"],
                         ["block-forms/item/0"])

    def test_list_item_signal_takes_an_orphan_list_item_paragraph(self):
        stage = build_list_stage(paragraph("block-intro", text("Ankylosaurus forms are covered below.")),
                                 paragraph("block-orphan", text("Ankylosaurus: tanks.")), items=("Other: text.",))
        stage["issues"] += [signal_issue("li/span[1]", "rating-blue Ankylosaurus"),
                            {"code": "provisional-id", "location": "div/li[1]", "detail": "block-orphan"}]
        plan = worksheet.plan_ratings(stage, worksheet.collect_fragments(stage))
        self.assertIn("block-orphan", plan.matches)

    def test_paragraph_signal_still_takes_the_first_row_with_its_name(self):
        stage = build_list_stage(paragraph("block-intro", text("Ankylosaurus forms are covered below.")))
        stage["issues"].append(signal_issue("p/span[1]", "rating-blue Ankylosaurus"))
        plan = worksheet.plan_ratings(stage, worksheet.collect_fragments(stage))
        self.assertIn("block-intro", plan.matches)


class TwoColourRatingTest(unittest.TestCase):
    def render_split(self, second_color="red"):
        stage = build_list_stage(items=("Reef Shark: bites.",))
        stage["issues"] += [signal_issue("li/span[1]", "rating-blue Reef"),
                            signal_issue("li/span[2]", f"rating-{second_color} Shark")]
        return render_synthetic_sheet(stage)

    def compile_split(self, stage, sheet, condition=None):
        sheet = sheet if condition is None else sheet.replace("умова: \n", f"умова: {condition}\n")
        answers = {"section-forms": "Форми", "block-forms/item/0": "Рифова акула: кусає."}
        return worksheet.compile_article(stage, finish_sheet(sheet, answers), {})

    def test_second_colour_becomes_the_alternative_of_the_first(self):
        stage, sheet = self.render_split()
        self.assertIn("### block-forms/item/0 · пункт · rating-blue+red\n\n> Reef Shark: bites.\n\nумова: \n", sheet)
        document, review, _ = self.compile_split(stage, sheet, "Коло Місяця | CIRCLE_OF_THE_MOON")
        rating = document["ratings"][-1]
        self.assertEqual((rating["sourceColor"], rating["score"], rating["alternative"]),
                         ("blue", 4, {"score": 1, "sourceColor": "red", "condition": "Коло Місяця",
                                      "subclassKey": "CIRCLE_OF_THE_MOON"}))
        decisions = review["issueDecisions"][-2:]
        self.assertEqual([decision["ratingIds"] for decision in decisions], [[rating["ratingId"]]] * 2)
        self.assertEqual([decision["disposition"] for decision in decisions], ["preserved"] * 2)

    def test_condition_without_subclass_key_is_kept_alone(self):
        stage, sheet = self.render_split()
        document, _, _ = self.compile_split(stage, sheet, "для інших пройдисвітів")
        self.assertEqual(document["ratings"][-1]["alternative"],
                         {"score": 1, "sourceColor": "red", "condition": "для інших пройдисвітів"})

    def test_two_colour_rating_needs_a_condition(self):
        stage, sheet = self.render_split()
        with self.assertRaisesRegex(ValueError, "Missing alternative condition: block-forms/item/0"):
            self.compile_split(stage, sheet)
        with self.assertRaisesRegex(ValueError, "SUBCLASS_KEY"):
            self.compile_split(stage, sheet, "Коло Місяця | moon")

    def test_condition_on_a_one_colour_rating_is_rejected(self):
        stage, sheet = self.render_split("blue")
        self.assertNotIn("умова:", sheet)
        sheet = sheet.replace("> Reef Shark: bites.\n\n", "> Reef Shark: bites.\n\nумова: Коло Місяця\n\n")
        with self.assertRaisesRegex(ValueError, "rated in one color"):
            self.compile_split(stage, sheet)

    def test_same_colour_second_span_follows_the_first_without_an_alternative(self):
        stage, sheet = self.render_split("blue")
        document, review, _ = self.compile_split(stage, sheet)
        self.assertNotIn("alternative", document["ratings"][-1])
        self.assertEqual(review["issueDecisions"][-1]["ratingIds"], [document["ratings"][-1]["ratingId"]])


if __name__ == "__main__":
    unittest.main()
