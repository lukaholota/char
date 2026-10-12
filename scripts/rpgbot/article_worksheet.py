#!/usr/bin/env python3
"""Prepare and compile the translation worksheet of one RPGbot article.

Without --compile the script renders a flat worksheet from a staging file.
With --compile it turns the filled worksheet into a private unpublished
article and its technical review. Preview is read-only; --apply creates absent
outputs and refuses to replace any existing file.
"""

import argparse
import copy
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urldefrag


COLOR_SCORES = {"red": 1, "orange": 2, "green": 3, "blue": 4}
LEGEND_COLORS = list(COLOR_SCORES)
RULESET_YEARS = {"RULES_2014": "2014", "RULES_2024": "2024"}
DISPOSITIONS = ("preserved", "excluded-noncontent", "corrected-in-translation")
UNRATED_TAG = "без оцінки"
KIND_PARAGRAPH = "абзац"
KIND_ITEM = "пункт"
KIND_HEADER = "заголовок таблиці"
KIND_CELL = "комірка таблиці"
KIND_CONTENTS = "зміст"
LEGEND_SECTION_ID = "section-disclaimer"
SIGNAL_LEGEND = "legend"
SIGNAL_DECORATIVE = "decorative"
SIGNAL_HEADING = "heading"
SIGNAL_OPTION = "option"
LABEL_SUFFIX_CHARACTERS = ":.!?(—-,;"
TRANSLATION_TOKEN = re.compile(
    r"(?<!\\)\[\[(\d+)\|(.+?)\]\]|(?<!\\)\*\*(.+?)(?<!\\)\*\*|(?<!\\)\*(.+?)(?<!\\)\*|\^\^(.+?)\^\^", re.S)
STRAY_MARKER = re.compile(r"(?<!\\)\*|\[\[|\]\]|\^\^")
OPTION_SIGNAL = re.compile(r"rating-([a-z+-]*) (.+)", re.S)
HEADING_SIGNAL = re.compile(r"wp-block-heading rating-([a-z+-]*) (.+)", re.S)
FLIPPED_HEADING_SIGNAL = re.compile(r"rating- wp-block-heading (.+)", re.S)
REVERSED_HEADING_SIGNAL = re.compile(r"rating-([a-z+-]+) wp-block-heading (.+)", re.S)
HEADING_LOCATION = re.compile(r"h[1-6]/")
PAIRED_MARKER = re.compile(r"\{\{([^{}|]+)\|[^{}]*\}\}")
DUPLICATE_ID_DETAIL = re.compile(r"(\S+) -> (\S+)")
REVIEWED_AT = re.compile(r"^<!-- issueReviewedAt: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z) -->$", re.M)
FRAGMENT_HEADER = re.compile(
    rf"^### ([^ \n]+) · ({KIND_PARAGRAPH}|{KIND_ITEM}|{KIND_HEADER}|{KIND_CELL}|{KIND_CONTENTS}) · ([^\n]+)\n(.*?)(?=^### |^## |\Z)",
    re.M | re.S)
SECTION_HEADER = re.compile(
    r"^<!-- sectionId: ([^;]+); rating: (red|orange|green|blue|none) -->\n\n\*\*Український заголовок:\*\*\n([^\n]+)", re.M)

EVIDENCE = {
    "legend": "Rating legend, not an option recommendation",
    "decorative": "Uncolored decorative CSS class on heading, not an author rating",
    "matched": "Source-rated item matched by label and order; color retained",
    "uncolored": "Source class has no color; option kept without score",
    "splash": "Decorative splash image without analytical prose",
    "video": "Embedded video; videos are outside the corpus (owner decision 2026-10-01)",
    "list-paragraphs-review": "Full list item prose retained as a translated list item",
    "blockquote-review": "Quote prose and attribution retained as a translated paragraph",
    "table-header-review": "First table row retained as headers; columns and rows unchanged",
    "duplicate-id-review": "Distinct sections retained with disambiguated stable IDs",
    "nested-markup-review": "Link URL retained; the extractor stores a link inside styled text as a plain link node",
}


@dataclass
class Fragment:
    key: str
    kind: str
    section_id: str
    block_id: str
    nodes: list


@dataclass
class RatingSignal:
    issue_index: int
    kind: str
    source_class: str
    color: str
    label: str
    in_heading: bool = False


@dataclass
class RatingPlan:
    signals: list
    matches: dict
    heading_matches: dict
    unmatched: list


@dataclass
class Worksheet:
    title: str
    revision_id: str
    slug: str
    ruleset: str
    topics: list
    reviewed_at: str
    headings: dict
    fragments: dict


def collapse_whitespace(value):
    return re.sub(r"\s+", " ", value).strip()


def plain_text(nodes):
    return collapse_whitespace("".join(node["text"] for node in nodes))


def has_text(nodes):
    return bool(plain_text(nodes))


def has_letters(value):
    return bool(re.search(r"[^\W\d_]", value))


def visit_fragments(sections, visit):
    for section in sections:
        section_id = section["sectionId"]
        for block in section["blocks"]:
            block_id = block["blockId"]
            if block["type"] == "paragraph":
                block["content"] = visit(section_id, block_id, block_id, KIND_PARAGRAPH, block["content"])
            elif block["type"] == "list":
                block["items"] = [visit(section_id, block_id, f"{block_id}/item/{index}", KIND_ITEM, nodes)
                                  for index, nodes in enumerate(block["items"])]
            elif block["type"] == "table":
                block["headers"] = [visit(section_id, block_id, f"{block_id}/header/{index}", KIND_HEADER, nodes)
                                    for index, nodes in enumerate(block["headers"])]
                block["rows"] = [[visit(section_id, block_id, f"{block_id}/row/{row_index}/{cell_index}", KIND_CELL, nodes)
                                  for cell_index, nodes in enumerate(row)]
                                 for row_index, row in enumerate(block["rows"])]
            else:
                raise ValueError(f"Unsupported source block: {block['type']}")


def collect_fragments(stage):
    fragments = []

    def collect(section_id, block_id, key, kind, nodes):
        if has_text(nodes):
            fragments.append(Fragment(key, kind, section_id, block_id, nodes))
        return nodes

    visit_fragments(copy.deepcopy(stage["sections"]), collect)
    return fragments


def normalize_page_url(url):
    return urldefrag(url)[0].replace("http://", "https://").rstrip("/")


def find_contents_targets(stage, fragments):
    section_ids = {section["sectionId"] for section in stage["sections"]}
    page_url = normalize_page_url(stage["canonicalUrl"])
    targets = {}
    for fragment in fragments:
        meaningful = [node for node in fragment.nodes if node["text"].strip()]
        if len(meaningful) != 1 or meaningful[0]["type"] != "link":
            continue
        href = meaningful[0]["href"]
        anchor = urldefrag(href)[1]
        if normalize_page_url(href) != page_url or not anchor:
            continue
        target = next((candidate for candidate in (f"section-{anchor}", anchor) if candidate in section_ids), None)
        if target:
            targets[fragment.key] = (target, href)
    return targets


def escape_source_text(value):
    if any(marker in value for marker in ("\\*", "[[", "]]", "^^")):
        raise ValueError("Source text contains worksheet markup characters")
    return value.replace("*", "\\*")


def render_source_markup(nodes):
    parts = []
    link_number = 0
    for node in nodes:
        text = escape_source_text(node["text"])
        if node["type"] == "text":
            parts.append(text)
        elif node["type"] == "strong":
            parts.append(f"**{text}**")
        elif node["type"] == "emphasis":
            parts.append(f"*{text}*")
        elif node["type"] == "superscript":
            parts.append(f"^^{text}^^")
        elif node["type"] == "link":
            link_number += 1
            parts.append(f"[[{link_number}|{text}]]")
        else:
            raise ValueError(f"Unsupported inline node: {node['type']}")
    return collapse_whitespace("".join(parts))


def parse_rating_signal(issue_index, detail, location=""):
    # Fey Wanderer's source misspells the CSS class on its overall blue rating.
    if detail == "ratin-blue blue":
        return RatingSignal(issue_index, SIGNAL_OPTION, "rating-blue", "blue", "blue")
    neutral = re.fullmatch(r"font-size: revert; color: initial; ([()])", detail)
    if neutral:
        return RatingSignal(issue_index, SIGNAL_DECORATIVE, "color-initial", "", neutral.group(1))
    flipped = FLIPPED_HEADING_SIGNAL.fullmatch(detail)
    if flipped:
        return RatingSignal(issue_index, SIGNAL_DECORATIVE, "rating-", "", flipped.group(1))
    heading = HEADING_SIGNAL.fullmatch(detail)
    if heading:
        color = heading.group(1)
        kind = SIGNAL_HEADING if color in COLOR_SCORES else SIGNAL_DECORATIVE
        return RatingSignal(issue_index, kind, f"rating-{color}", color if color in COLOR_SCORES else "", heading.group(2))
    reversed_heading = REVERSED_HEADING_SIGNAL.fullmatch(detail)
    if reversed_heading:
        color = reversed_heading.group(1)
        kind = SIGNAL_HEADING if color in COLOR_SCORES else SIGNAL_DECORATIVE
        return RatingSignal(issue_index, kind, f"rating-{color}", color if color in COLOR_SCORES else "", reversed_heading.group(2))
    option = OPTION_SIGNAL.fullmatch(detail)
    if option:
        color = option.group(1)
        return RatingSignal(issue_index, SIGNAL_OPTION, f"rating-{color}", color if color in COLOR_SCORES else "", option.group(2),
                            in_heading=bool(HEADING_LOCATION.match(location)))
    raise ValueError(f"Unrecognized rating signal at issue {issue_index}: {detail}")


def find_rating_legend_start(signals):
    expected = [(color, color) for color in LEGEND_COLORS]
    for start in range(len(signals) - len(expected) + 1):
        window = signals[start:start + len(expected)]
        if [(signal.color, signal.label.lower()) for signal in window] == expected:
            return start
    raise ValueError("Unexpected rating legend")


def mark_rating_legend(signals):
    if not signals:
        return
    start = find_rating_legend_start(signals)
    for signal in signals[start:start + len(LEGEND_COLORS)]:
        signal.kind = SIGNAL_LEGEND


def parse_rating_signals(stage):
    signals = [parse_rating_signal(index, collapse_whitespace(issue["detail"]), issue.get("location", ""))
               for index, issue in enumerate(stage["issues"]) if issue["code"] == "rating-signal-review"]
    mark_rating_legend(signals)
    return signals


def find_node_boundaries(nodes):
    boundaries, raw = set(), ""
    for node in nodes:
        raw += node["text"]
        boundaries.add(len(collapse_whitespace(raw)))
    return boundaries


def starts_with_label(nodes, label):
    text = plain_text(nodes)
    numbering = re.match(r"^(?:\d+[.:]\s*|CR\s+\d+(?:/\d+)?\s*[–—-]\s*)", text)
    offsets = [0, numbering.end()] if numbering else [0]
    return any(starts_with_label_at(nodes, text, offset, label) for offset in offsets)


def starts_with_label_at(nodes, text, offset, label):
    if not text[offset:].startswith(label):
        return False
    suffix = text[offset + len(label):]
    ends_at_boundary = offset + len(label) in find_node_boundaries(nodes)
    return not suffix or ends_at_boundary or suffix[0].isspace() or suffix[0] in LABEL_SUFFIX_CHARACTERS


def find_row_for_label(rows, position, label):
    for index in range(position, len(rows)):
        if starts_with_label(rows[index].nodes, label):
            return index
    return None


def find_heading_for_label(stage, label, taken):
    candidates = [(section["sectionId"], collapse_whitespace(section["heading"])) for section in stage["sections"]
                  if section["sectionId"] not in taken and starts_with_heading_label(section["heading"], label)]
    same_heading_repeated = bool(candidates) and len({heading for _, heading in candidates}) == 1
    return candidates[0][0] if same_heading_repeated else None


def starts_with_heading_label(heading, label):
    text = collapse_whitespace(heading)
    if not text.startswith(label):
        return False
    suffix = text[len(label):]
    return not suffix or suffix in {"XGtE", "PHB", "EEPC / SCAG"} or suffix[0].isspace() or suffix[0] in LABEL_SUFFIX_CHARACTERS


def is_split_label_continuation(stage, signal, previous_signal, previous_row):
    if previous_signal is None or previous_row is None or signal.issue_index == 0:
        return False
    current, previous = stage["issues"][signal.issue_index], stage["issues"][signal.issue_index - 1]
    adjacent_spans = (current["code"] == previous["code"] and previous.get("location", "").endswith("span[1]")
                      and current.get("location", "").endswith("span[2]"))
    joined_labels = (f"{previous_signal.label} {signal.label}", f"{previous_signal.label}{signal.label}")
    return adjacent_spans and any(starts_with_label(previous_row.nodes, label) for label in joined_labels)


def plan_ratings(stage, fragments):
    contents = find_contents_targets(stage, fragments)
    rows = [fragment for fragment in fragments
            if fragment.section_id != LEGEND_SECTION_ID and fragment.key not in contents]
    section_by_heading = {collapse_whitespace(section["heading"]): section["sectionId"] for section in stage["sections"]}
    signals = parse_rating_signals(stage)
    plan = RatingPlan(signals, {}, {}, [])
    position = 0
    previous_signal = previous_row = None
    for signal in signals:
        if signal.kind in (SIGNAL_LEGEND, SIGNAL_DECORATIVE):
            continue
        if signal.kind == SIGNAL_HEADING:
            section_id = section_by_heading.get(signal.label)
            if section_id and section_id not in plan.heading_matches:
                plan.heading_matches[section_id] = signal
            else:
                plan.unmatched.append(signal)
            continue
        if is_split_label_continuation(stage, signal, previous_signal, previous_row):
            plan.unmatched.append(signal)
            continue
        if signal.in_heading:
            section_id = find_heading_for_label(stage, signal.label, plan.heading_matches)
            if section_id:
                plan.heading_matches[section_id] = signal
                continue
        found = find_row_for_label(rows, position, signal.label)
        if found is not None:
            plan.matches[rows[found].key] = signal
            position = found + 1
            previous_signal, previous_row = signal, rows[found]
            continue
        section_id = find_heading_for_label(stage, signal.label, plan.heading_matches)
        if section_id:
            plan.heading_matches[section_id] = signal
        else:
            plan.unmatched.append(signal)
    return plan


def build_sheet_header(stage, slug, ruleset, topics):
    revision = stage["sourceRevision"]
    return [f"# {revision['title']}", "",
            f"<!-- sourceRevisionId: {revision['revisionId']} -->",
            f"<!-- articleSlug: {slug} -->",
            f"<!-- ruleset: {ruleset} -->",
            f"<!-- topics: {', '.join(topics)} -->",
            "<!-- issueReviewedAt: pending -->", "",
            "Приватний робочий аркуш перекладу. Посилання: [[n|текст]], жирний: **текст**, курсив: *текст*.",
            "Кожне посилання й виділення джерела має бути в перекладі рівно один раз. Порожнє поле — не переклад.", ""]


def find_prefill(fragment, markup, shared_fragments):
    if fragment.kind == KIND_CELL and not has_letters(plain_text(fragment.nodes)):
        return markup
    return shared_fragments.get(markup, "")


def build_fragment_lines(fragment, tag, markup, contents_target, shared_fragments):
    kind = KIND_CONTENTS if contents_target else fragment.kind
    lines = [f"### {fragment.key} · {kind} · {tag}", "", f"> {markup}", ""]
    if contents_target:
        return lines + [f"Береться із заголовка розділу: {contents_target[0]}", ""]
    return lines + ["**Українською:**", find_prefill(fragment, markup, shared_fragments), ""]


def render_worksheet(stage, slug, ruleset, topics, shared=None):
    shared = shared or {}
    shared_headings = shared.get("headings", {})
    shared_fragments = shared.get("fragments", {})
    fragments = collect_fragments(stage)
    contents = find_contents_targets(stage, fragments)
    plan = plan_ratings(stage, fragments)
    lines = build_sheet_header(stage, slug, ruleset, topics)
    for section in stage["sections"]:
        heading_signal = plan.heading_matches.get(section["sectionId"])
        tag = (heading_signal.color or "none") if heading_signal else "none"
        lines += [f"## {section['heading']}", f"<!-- sectionId: {section['sectionId']}; rating: {tag} -->", "",
                  "**Український заголовок:**", shared_headings.get(collapse_whitespace(section["heading"]), ""), ""]
        for fragment in (item for item in fragments if item.section_id == section["sectionId"]):
            signal = plan.matches.get(fragment.key)
            lines += build_fragment_lines(fragment, signal.source_class if signal else UNRATED_TAG,
                                          render_source_markup(fragment.nodes), contents.get(fragment.key),
                                          shared_fragments)
    return "\n".join(lines), plan


def parse_worksheet_header(content):
    first = content.splitlines()[0]
    if not first.startswith("# ") or not first[2:].strip():
        raise ValueError("Missing Ukrainian article title")
    fields = {}
    for name in ("sourceRevisionId", "articleSlug", "ruleset", "topics"):
        match = re.search(rf"^<!-- {name}: ([^\n]+) -->$", content, re.M)
        if not match:
            raise ValueError(f"Missing worksheet field: {name}")
        fields[name] = match.group(1).strip()
    reviewed = REVIEWED_AT.search(content)
    if not reviewed:
        raise ValueError("Missing technical issue review timestamp")
    if fields["ruleset"] not in RULESET_YEARS or not re.fullmatch(r"[a-z0-9-]+", fields["articleSlug"]):
        raise ValueError("Invalid worksheet ruleset or slug")
    return first[2:].strip(), fields, reviewed.group(1)


def parse_worksheet_headings(content):
    headings = {}
    for match in SECTION_HEADER.finditer(content):
        section_id, tag, heading = match.groups()
        if section_id in headings or not heading.strip():
            raise ValueError(f"Duplicate or missing translated heading: {section_id}")
        headings[section_id] = (tag, heading.strip())
    if len(headings) != content.count("<!-- sectionId:"):
        raise ValueError("Worksheet contains malformed section headers")
    return headings


def parse_worksheet_fragments(content):
    fragments = {}
    for match in FRAGMENT_HEADER.finditer(content):
        key, kind, tag, body = match.groups()
        if key in fragments:
            raise ValueError(f"Duplicate worksheet key: {key}")
        answer = re.search(r"\*\*Українською:\*\*\n(.*?)\s*\Z", body, re.S)
        if kind != KIND_CONTENTS and (not answer or not answer.group(1).strip()):
            raise ValueError(f"Untranslated worksheet key: {key}")
        fragments[key] = (answer.group(1).strip() if answer else None, kind, tag)
    if len(fragments) != content.count("\n### "):
        raise ValueError("Worksheet contains malformed fragment headers")
    return fragments


def parse_worksheet(content):
    title, fields, reviewed_at = parse_worksheet_header(content)
    return Worksheet(title, fields["sourceRevisionId"], fields["articleSlug"], fields["ruleset"],
                     [topic.strip() for topic in fields["topics"].split(",") if topic.strip()],
                     reviewed_at, parse_worksheet_headings(content), parse_worksheet_fragments(content))


def unescape_translation(value):
    return value.replace("\\*", "*")


def build_translation_node(match, source_links):
    number, anchor, strong, emphasis, superscript = match.groups()
    if number:
        index = int(number)
        if not 1 <= index <= len(source_links):
            raise ValueError(f"Link markers do not match the source: [[{number}|...]]")
        return {"type": "link", "text": unescape_translation(anchor), "href": source_links[index - 1]["href"]}, index
    if strong is not None:
        return {"type": "strong", "text": unescape_translation(strong)}, None
    if superscript is not None:
        return {"type": "superscript", "text": unescape_translation(superscript)}, None
    return {"type": "emphasis", "text": unescape_translation(emphasis)}, None


def build_text_node(segment, key):
    if STRAY_MARKER.search(segment):
        raise ValueError(f"Unbalanced worksheet markup: {key}")
    return {"type": "text", "text": unescape_translation(segment)}


def parse_translation(value, source_nodes, key):
    source_links = [node for node in source_nodes if node["type"] == "link"]
    nodes, link_numbers, cursor = [], [], 0
    for match in TRANSLATION_TOKEN.finditer(value):
        if match.start() > cursor:
            nodes.append(build_text_node(value[cursor:match.start()], key))
        node, link_number = build_translation_node(match, source_links)
        nodes.append(node)
        if link_number:
            link_numbers.append(link_number)
        cursor = match.end()
    if cursor < len(value):
        nodes.append(build_text_node(value[cursor:], key))
    if sorted(link_numbers) != list(range(1, len(source_links) + 1)):
        raise ValueError(f"Link markers do not match the source: {key}")
    for style in ("strong", "emphasis", "superscript"):
        if count_visible_styled_nodes(nodes, style) != count_visible_styled_nodes(source_nodes, style):
            raise ValueError(f"Emphasis, strong or superscript markers changed: {key}")
    return nodes


def count_visible_styled_nodes(nodes, style):
    return sum(node["type"] == style and node["text"].strip() != "" for node in nodes)


def translate_headings(sections, sheet, plan):
    remaining = set(sheet.headings)
    for section in sections:
        section_id = section["sectionId"]
        if section_id not in remaining:
            raise ValueError(f"Missing translated section: {section_id}")
        remaining.remove(section_id)
        tag, heading = sheet.headings[section_id]
        signal = plan.heading_matches.get(section_id)
        if tag != ((signal.color or "none") if signal else "none"):
            raise ValueError(f"Changed heading rating: {section_id}")
        section["heading"] = heading
    if remaining:
        raise ValueError(f"Extra translated sections: {sorted(remaining)}")


def build_fragment_translator(sheet, plan, contents, headings, translated):
    remaining = set(sheet.fragments)

    def translate(section_id, block_id, key, kind, nodes):
        if not has_text(nodes):
            return nodes
        if key not in remaining:
            raise ValueError(f"Missing translated fragment: {key}")
        remaining.remove(key)
        value, actual_kind, actual_tag = sheet.fragments[key]
        signal = plan.matches.get(key)
        expected = (KIND_CONTENTS if key in contents else kind, signal.source_class if signal else UNRATED_TAG)
        if (actual_kind, actual_tag) != expected:
            raise ValueError(f"Changed source kind or rating: {key}")
        if key in contents:
            target, href = contents[key]
            result = [{"type": "link", "text": headings[target], "href": href}]
        else:
            result = parse_translation(value, nodes, key)
            if kind == KIND_CELL and not has_letters(plain_text(nodes)) and plain_text(result) != plain_text(nodes):
                raise ValueError(f"Changed numeric table cell: {key}")
        translated.append((section_id, block_id, key, result))
        return result

    return translate, remaining


def translate_sections(stage, sheet, plan, contents):
    sections = copy.deepcopy(stage["sections"])
    translate_headings(sections, sheet, plan)
    headings = {section["sectionId"]: section["heading"] for section in sections}
    translated = []
    translate, remaining = build_fragment_translator(sheet, plan, contents, headings, translated)
    visit_fragments(sections, translate)
    if remaining:
        raise ValueError(f"Extra translated fragments: {sorted(remaining)}")
    return sections, translated


def find_rating_context(nodes):
    text = PAIRED_MARKER.sub(r"\1", plain_text(nodes))
    text = re.sub(r"^\{\{([^{}|]+)\}\}", r"\1", text)
    return re.split(r"\{\{| \(|:", text, 1)[0].strip()


def build_rating_record(article_id, translation_id, number, section_id, block_id, option_id, context, signal):
    record = {"ratingId": f"rating-{article_id.removeprefix('rpgbot-')}-{number:03d}", "articleId": article_id,
              "translationRevisionId": translation_id, "sectionId": section_id, "targetBlockId": block_id,
              "optionId": option_id, "context": context, "explanationBlockId": block_id}
    if signal.color:
        record["sourceColor"] = signal.color
        record["score"] = COLOR_SCORES[signal.color]
    return record


def build_ratings(article_id, translation_id, sections, translated, plan):
    ratings, rating_ids = [], {}
    for section in sections:
        section_id = section["sectionId"]
        heading_signal = plan.heading_matches.get(section_id)
        if heading_signal:
            if not section["blocks"]:
                raise ValueError(f"Rated heading without blocks: {section_id}")
            block_id = section["blocks"][0]["blockId"]
            ratings.append(build_rating_record(article_id, translation_id, len(ratings) + 1, section_id, block_id,
                                               section_id, find_rating_context([{"text": section["heading"]}]), heading_signal))
            rating_ids[heading_signal.issue_index] = ratings[-1]["ratingId"]
        for item_section, block_id, key, nodes in translated:
            signal = plan.matches.get(key)
            if item_section != section_id or not signal:
                continue
            option_id = f"{section_id}-{re.sub(r'[^A-Za-z0-9_-]', '-', key)}"
            ratings.append(build_rating_record(article_id, translation_id, len(ratings) + 1, section_id, block_id,
                                               option_id, find_rating_context(nodes), signal))
            rating_ids[signal.issue_index] = ratings[-1]["ratingId"]
    return ratings, rating_ids


def find_rating_decision(issue_index, plan, rating_ids):
    signal = next((item for item in plan.signals if item.issue_index == issue_index), None)
    if signal.kind == SIGNAL_LEGEND:
        return {"disposition": "excluded-noncontent", "evidence": EVIDENCE["legend"]}
    if signal.kind == SIGNAL_DECORATIVE:
        return {"disposition": "excluded-noncontent", "evidence": EVIDENCE["decorative"]}
    if issue_index in rating_ids:
        evidence = EVIDENCE["matched"] if signal.color else EVIDENCE["uncolored"]
        return {"disposition": "preserved", "evidence": evidence, "ratingIds": [rating_ids[issue_index]]}
    return None


def find_unsupported_block_decision(issue):
    if "article-splash-image" in issue["detail"]:
        return {"disposition": "excluded-noncontent", "evidence": EVIDENCE["splash"]}
    if "wp-block-embed" in issue["detail"] and "is-type-video" in issue["detail"]:
        return {"disposition": "excluded-noncontent", "evidence": EVIDENCE["video"]}
    return None


def find_duplicate_id_decision(issue, section_ids):
    match = DUPLICATE_ID_DETAIL.fullmatch(issue["detail"].strip())
    if match and set(match.groups()) <= section_ids:
        return {"disposition": "preserved", "evidence": EVIDENCE["duplicate-id-review"]}
    return None


def find_automatic_decision(issue_index, issue, plan, rating_ids, section_ids):
    code = issue["code"]
    if code == "rating-signal-review":
        return find_rating_decision(issue_index, plan, rating_ids)
    if code == "unsupported-block":
        return find_unsupported_block_decision(issue)
    if code == "duplicate-id-review":
        return find_duplicate_id_decision(issue, section_ids)
    if code == "nested-markup-review":
        return {"disposition": "preserved", "evidence": EVIDENCE[code]} if issue["detail"].startswith("link inside ") else None
    if code in ("list-paragraphs-review", "blockquote-review", "table-header-review"):
        return {"disposition": "preserved", "evidence": EVIDENCE[code]}
    return None


def check_extra_decisions(stage, extra_decisions, find_decision):
    for key, decision in extra_decisions.items():
        index = int(key)
        if not 0 <= index < len(stage["issues"]):
            raise ValueError(f"Decision for a missing issue: {key}")
        if decision.get("disposition") not in DISPOSITIONS or not decision.get("evidence", "").strip():
            raise ValueError(f"Decision needs a disposition and evidence: {key}")
        if find_decision(index) is not None or stage["issues"][index]["code"] == "provisional-id":
            raise ValueError(f"Decision for a handled issue: {key}")


def build_issue_decisions(stage, plan, rating_ids, extra_decisions):
    section_ids = {section["sectionId"] for section in stage["sections"]}
    find_decision = lambda index: find_automatic_decision(index, stage["issues"][index], plan, rating_ids, section_ids)
    check_extra_decisions(stage, extra_decisions, find_decision)
    decisions = []
    for index, issue in enumerate(stage["issues"]):
        if issue["code"] == "provisional-id":
            continue
        decision = find_decision(index) or extra_decisions.get(str(index))
        if not decision:
            problem = "Unresolved rating signals" if issue["code"] == "rating-signal-review" else "Unreviewed source issue"
            raise ValueError(f"{problem}: {index}: {issue['code']} {issue['detail'][:80]}")
        decisions.append({"issueIndex": index, **decision})
    return decisions


def check_worksheet_source(sheet, stage):
    if sheet.revision_id != stage["sourceRevision"]["revisionId"]:
        raise ValueError("Worksheet belongs to another source revision")
    if sheet.title == stage["sourceRevision"]["title"]:
        raise ValueError("Missing Ukrainian article title")


def build_article_document(stage, sheet, sections, ratings, article_id, translation_id):
    revision = stage["sourceRevision"]
    year = RULESET_YEARS[sheet.ruleset]
    return {"sources": [{"sourceId": revision["sourceId"], "rulesets": [sheet.ruleset]}],
            "sourceRevisions": [revision],
            "article": {"articleId": article_id, "sourceId": revision["sourceId"], "slug": f"{sheet.slug}-{year}",
                        "ruleset": sheet.ruleset, "titleUk": sheet.title, "titleEn": revision["title"],
                        "topics": sheet.topics, "status": "unpublished"},
            "translations": [{"translationRevisionId": translation_id, "articleId": article_id,
                              "sourceRevisionId": revision["revisionId"], "status": "draft", "sections": sections}],
            "ratings": ratings}


def count_source_links(stage):
    return sum(node["type"] == "link" for fragment in collect_fragments(stage) for node in fragment.nodes)


def compile_article(stage, sheet_text, extra_decisions):
    sheet = parse_worksheet(sheet_text)
    check_worksheet_source(sheet, stage)
    fragments = collect_fragments(stage)
    contents = find_contents_targets(stage, fragments)
    plan = plan_ratings(stage, fragments)
    article_id = f"rpgbot-{sheet.slug}-{RULESET_YEARS[sheet.ruleset]}"
    translation_id = f"translation-{article_id}-draft1"
    sections, translated = translate_sections(stage, sheet, plan, contents)
    ratings, rating_ids = build_ratings(article_id, translation_id, sections, translated, plan)
    decisions = build_issue_decisions(stage, plan, rating_ids, extra_decisions)
    document = build_article_document(stage, sheet, sections, ratings, article_id, translation_id)
    review = {"sourceRevisionId": sheet.revision_id, "reviewedAt": sheet.reviewed_at, "issueDecisions": decisions}
    metrics = {"sections": len(sections), "fragments": len(sheet.fragments) - len(contents), "contents": len(contents),
               "links": count_source_links(stage), "ratings": len(ratings), "issueDecisions": len(decisions)}
    return document, review, metrics


def plan_outputs(directory, document, review):
    return [(directory / "uk" / f"{document['article']['articleId']}.json", document),
            (directory / "reviews" / f"{review['sourceRevisionId']}.json", review)]


def encode_payload(payload):
    text = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    return text.encode()


def write_outputs(outputs):
    if any(path.exists() for path, _ in outputs):
        raise FileExistsError("An output already exists; refusing to replace edited work")
    for path, payload in outputs:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("xb") as handle:
            handle.write(encode_payload(payload))


def print_output_summary(metrics, outputs):
    for path, payload in outputs:
        print(json.dumps({**metrics, "output": str(path), "sha256": hashlib.sha256(encode_payload(payload)).hexdigest(),
                          "exists": path.exists()}, ensure_ascii=False))


def load_json_if_present(path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path and path.exists() else default


def run_prepare(args, stage):
    topics = [topic.strip() for topic in args.topics.split(",") if topic.strip()]
    sheet, plan = render_worksheet(stage, args.slug, args.ruleset, topics, load_json_if_present(args.shared, {}))
    metrics = {"ratingsMatched": len(plan.matches) + len(plan.heading_matches),
               "unmatchedSignals": [f"{signal.issue_index}:{signal.source_class} {signal.label}" for signal in plan.unmatched]}
    outputs = [(args.worksheet, sheet)]
    print_output_summary(metrics, outputs)
    if args.apply:
        write_outputs(outputs)


def run_compile(args, stage):
    decisions_path = args.decisions or args.worksheet.with_suffix(".decisions.json")
    document, review, metrics = compile_article(stage, args.worksheet.read_text(encoding="utf-8"),
                                                load_json_if_present(decisions_path, {}))
    outputs = plan_outputs(args.directory, document, review)
    print_output_summary(metrics, outputs)
    if args.apply:
        write_outputs(outputs)


def parse_arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", type=Path)
    parser.add_argument("worksheet", type=Path)
    parser.add_argument("--compile", action="store_true")
    parser.add_argument("--slug", help="article slug without the year, for example monk-shadow")
    parser.add_argument("--ruleset", choices=sorted(RULESET_YEARS))
    parser.add_argument("--topics", default="")
    parser.add_argument("--directory", type=Path, default=Path("data/rpgbot"))
    parser.add_argument("--decisions", type=Path)
    parser.add_argument("--shared", type=Path, default=Path("data/rpgbot/authoring/shared-fragments.json"),
                        help="ready translations of recurring headings and boilerplate fragments")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if not args.compile and not (args.slug and args.ruleset):
        parser.error("preparing a worksheet needs --slug and --ruleset")
    return args


def main():
    args = parse_arguments()
    stage = json.loads(args.stage.read_text(encoding="utf-8"))
    (run_compile if args.compile else run_prepare)(args, stage)


if __name__ == "__main__":
    main()
