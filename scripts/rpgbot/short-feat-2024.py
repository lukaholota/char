#!/usr/bin/env python3
"""Export or compile a short paragraph-only RPGbot 2024 feat guide.

Preview is read-only. --apply creates missing outputs and refuses to overwrite
an edited worksheet or publication. Unsupported blocks, links and issue types
are rejected instead of silently discarded.
"""

import argparse
import copy
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse


SCORES = {"red": 1, "orange": 2, "green": 3, "blue": 4}
SPLASH_IMAGE_EVIDENCE = "Decorative splash image without analytical prose"


def is_splash_image_issue(issue):
    return issue["code"] == "unsupported-block" and "article-splash-image" in issue["detail"]


def rating_map(stage):
    parts = urlparse(stage["canonicalUrl"]).path.strip("/").split("/")
    if len(parts) != 3 or parts[:2] != ["2024-dnd", "feats"]:
        raise ValueError("Expected an individual 2024 feat guide")
    headings = {section["heading"]: section["sectionId"] for section in stage["sections"]}
    if len(headings) != len(stage["sections"]):
        raise ValueError("Duplicate source headings need individual review")
    mapped = {}
    for index, issue in enumerate(stage["issues"]):
        if issue["code"] == "provisional-id" or is_splash_image_issue(issue):
            continue
        if issue["code"] != "rating-signal-review":
            raise ValueError(f"Unsupported source issue {index}: {issue['code']}")
        match = re.fullmatch(r"wp-block-heading rating-(red|orange|green|blue) (.+)", issue["detail"])
        if not match or match.group(2) not in headings:
            raise ValueError(f"Unmatched heading rating {index}: {issue['detail']}")
        section_id = headings[match.group(2)]
        if section_id in mapped:
            raise ValueError(f"Duplicate heading rating: {section_id}")
        mapped[section_id] = {"issueIndex": index, "color": match.group(1)}
    for section in stage["sections"]:
        if not section["blocks"]:
            raise ValueError(f"Empty section: {section['sectionId']}")
        for block in section["blocks"]:
            if block["type"] != "paragraph":
                raise ValueError(f"Unsupported block type: {block['type']}")
            if any(node["type"] != "text" for node in block["content"]):
                raise ValueError(f"Unsupported inline markup: {block['blockId']}")
    return mapped


def render(stage):
    mapped = rating_map(stage)
    revision = stage["sourceRevision"]
    lines = [f"# {revision['title']}", "", f"<!-- sourceRevisionId: {revision['revisionId']} -->",
             "<!-- issueReviewedAt: pending -->", "", "Приватний робочий аркуш перекладу.", ""]
    for section in stage["sections"]:
        sid = section["sectionId"]
        tag = mapped[sid]["color"] if sid in mapped else "none"
        lines += [f"## {section['heading']}", f"<!-- sectionId: {sid}; rating: {tag} -->",
                  "", "**Український заголовок:**", "", ""]
        for block in section["blocks"]:
            source = "".join(node["text"] for node in block["content"]).strip()
            lines += [f"### {block['blockId']}", "", "> " + source, "",
                      "**Українською:**", "", ""]
    return "\n".join(lines), mapped


def parse_sheet(content):
    title = content.splitlines()[0]
    if not title.startswith("# ") or not title[2:].strip():
        raise ValueError("Missing Ukrainian title")
    revision = re.search(r"^<!-- sourceRevisionId: ([^ ]+) -->$", content, re.M)
    reviewed = re.search(r"^<!-- issueReviewedAt: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z) -->$", content, re.M)
    if not revision or not reviewed:
        raise ValueError("Missing source revision or technical review timestamp")
    headings = {}
    pattern = r"^<!-- sectionId: ([^;]+); rating: (red|orange|green|blue|none) -->\n\n\*\*Український заголовок:\*\*\n([^\n]+)"
    for match in re.finditer(pattern, content, re.M):
        sid, tag, heading = match.groups()
        if sid in headings or not heading.strip():
            raise ValueError(f"Duplicate or missing translated heading: {sid}")
        headings[sid] = (tag, heading.strip())
    blocks = {}
    pattern = r"^### ([^\n]+)\n(.*?)(?=^### |^## |\Z)"
    for match in re.finditer(pattern, content, re.M | re.S):
        bid, body = match.groups()
        answer = re.search(r"\*\*Українською:\*\*\n(.*?)\s*\Z", body, re.S)
        if bid in blocks or not answer or not answer.group(1).strip():
            raise ValueError(f"Missing or duplicate translation: {bid}")
        blocks[bid] = answer.group(1).strip()
    if len(headings) != content.count("<!-- sectionId:") or len(blocks) != content.count("\n### "):
        raise ValueError("Malformed worksheet headings or blocks")
    return title[2:].strip(), revision.group(1), reviewed.group(1), headings, blocks


def compile_document(stage, content):
    mapped = rating_map(stage)
    title, revision_id, reviewed_at, headings, blocks = parse_sheet(content)
    revision = stage["sourceRevision"]
    if revision_id != revision["revisionId"]:
        raise ValueError("Worksheet belongs to another source revision")
    slug = urlparse(stage["canonicalUrl"]).path.strip("/").split("/")[-1]
    article_id = f"rpgbot-{slug}-2024"
    translation_id = f"translation-{article_id}-draft1"
    sections = copy.deepcopy(stage["sections"])
    ratings = []
    issue_ratings = {}
    for section in sections:
        sid = section["sectionId"]
        if sid not in headings:
            raise ValueError(f"Missing translated section: {sid}")
        tag, heading = headings.pop(sid)
        signal = mapped.get(sid)
        expected = signal["color"] if signal else "none"
        if tag != expected:
            raise ValueError(f"Changed heading rating: {sid}")
        section["heading"] = heading
        for block in section["blocks"]:
            bid = block["blockId"]
            if bid not in blocks:
                raise ValueError(f"Missing translated block: {bid}")
            block["content"] = [{"type": "text", "text": blocks.pop(bid)}]
        if signal:
            first = section["blocks"][0]["blockId"]
            color = signal["color"]
            ratings.append({"ratingId": f"rating-{slug}-2024-{len(ratings) + 1:03d}",
                            "articleId": article_id, "translationRevisionId": translation_id,
                            "sectionId": sid, "targetBlockId": first, "optionId": sid,
                            "context": heading, "explanationBlockId": first,
                            "sourceColor": color, "score": SCORES[color]})
            issue_ratings[signal["issueIndex"]] = ratings[-1]["ratingId"]
    if headings or blocks:
        raise ValueError(f"Extra worksheet sections or blocks: {sorted(headings)}, {sorted(blocks)}")
    document = {"sources": [{"sourceId": revision["sourceId"], "rulesets": ["RULES_2024"]}],
                "sourceRevisions": [revision],
                "article": {"articleId": article_id, "sourceId": revision["sourceId"],
                            "slug": slug + "-2024", "ruleset": "RULES_2024",
                            "titleUk": title, "titleEn": revision["title"],
                            "topics": ["риса", "гайд", slug], "status": "unpublished"},
                "translations": [{"translationRevisionId": translation_id, "articleId": article_id,
                                  "sourceRevisionId": revision_id, "status": "draft", "sections": sections}],
                "ratings": ratings}
    decisions = [{"issueIndex": issue_index, "disposition": "preserved",
                  "evidence": "Rated source heading matched exactly; score attached to first explanatory block",
                  "ratingIds": [rating_id]}
                 for issue_index, rating_id in issue_ratings.items()]
    decisions += [{"issueIndex": issue_index, "disposition": "excluded-noncontent",
                   "evidence": SPLASH_IMAGE_EVIDENCE}
                  for issue_index, issue in enumerate(stage["issues"]) if is_splash_image_issue(issue)]
    review = {"sourceRevisionId": revision_id, "reviewedAt": reviewed_at,
              "issueDecisions": sorted(decisions, key=lambda item: item["issueIndex"])}
    metrics = {"sections": len(sections), "blocks": sum(len(s["blocks"]) for s in sections),
               "ratings": len(ratings), "issueDecisions": len(decisions)}
    return document, review, metrics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", type=Path)
    parser.add_argument("worksheet", type=Path)
    parser.add_argument("--compile", action="store_true")
    parser.add_argument("--directory", type=Path, default=Path("data/rpgbot"))
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    stage = json.loads(args.stage.read_text())
    if args.compile:
        document, review, metrics = compile_document(stage, args.worksheet.read_text())
        revision_id = stage["sourceRevision"]["revisionId"]
        paths = [(args.directory / "uk" / f"{document['article']['articleId']}.json", document),
                 (args.directory / "reviews" / f"{revision_id}.json", review)]
    else:
        content, mapped = render(stage)
        paths = [(args.worksheet, content)]
        metrics = {"sections": len(stage["sections"]), "ratedHeadings": len(mapped)}
    if args.apply and any(path.exists() for path, _ in paths):
        raise FileExistsError("Output exists; refusing to replace an edited worksheet or publication")
    for path, payload in paths:
        encoded = ((json.dumps(payload, ensure_ascii=False, indent=2) + "\n") if isinstance(payload, dict)
                   else payload).encode()
        print(json.dumps({**metrics, "output": str(path), "sha256": hashlib.sha256(encoded).hexdigest(),
                          "exists": path.exists()}, ensure_ascii=False))
        if args.apply:
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("xb") as handle:
                handle.write(encoded)


if __name__ == "__main__":
    main()
