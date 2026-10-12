#!/usr/bin/env python3
import collections
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
DRAFTS_DIRECTORY = ROOT / "data/rpgbot/uk"
COVERAGE_LEDGER = ROOT / "data/rpgbot/translation.coverage.json"
DNDBEYOND_KINDS = {
    "spells": "dndbeyond-spell", "feats": "dndbeyond-feat", "magic-items": "dndbeyond-magic-item",
    "races": "dndbeyond-race", "species": "dndbeyond-race", "classes": "dndbeyond-class",
    "monsters": "dndbeyond-monster", "sources": "dndbeyond-rules", "changelog": "dndbeyond-changelog",
}
NO_COUNTERPART_HOSTS = {"youtube.com", "youtu.be", "twitter.com", "amazon.com"}


def list_inline_groups(block):
    if block["type"] in ("paragraph", "heading"):
        return [block["content"]]
    if block["type"] == "list":
        return block["items"]
    if block["type"] == "table":
        return [*block["headers"], *[cell for row in block["rows"] for cell in row]]
    return []


def collect_links(drafts_directory):
    links = []
    for path in sorted(Path(drafts_directory).glob("*.json")):
        document = json.loads(path.read_text(encoding="utf-8"))
        article = document["article"]
        revision = document["translations"][-1]
        for section in revision["sections"]:
            for block in section["blocks"]:
                for nodes in list_inline_groups(block):
                    links.extend({"articleId": article["articleId"], "ruleset": article["ruleset"], "text": node["text"], "href": node["href"]}
                                 for node in nodes if node["type"] == "link")
    return links


def classify_link(href):
    parsed = urlparse(href)
    host = parsed.netloc.removeprefix("www.")
    if not host:
        return "local"
    if host == "rpgbot.net":
        return "book-tag" if "/abbreviations" in parsed.path else "rpgbot-article"
    if host == "dndbeyond.com":
        segment = next((part for part in parsed.path.split("/") if part), "")
        return DNDBEYOND_KINDS.get(segment, "dndbeyond-other")
    return "external-no-counterpart" if host in NO_COUNTERPART_HOSTS else "external-other"


def normalize_page_url(url):
    parsed = urlparse(url)
    return f"{parsed.netloc.removeprefix('www.')}{parsed.path.rstrip('/')}"


def count_rpgbot_targets(links, ledger_rows):
    rows_by_url = {normalize_page_url(row["canonicalUrl"]): row for row in ledger_rows}
    counts = collections.Counter()
    queue = collections.Counter()
    outside = collections.Counter()
    for link in links:
        if classify_link(link["href"]) != "rpgbot-article":
            continue
        url = normalize_page_url(link["href"])
        row = rows_by_url.get(url)
        if row is None:
            counts["outside-corpus"] += 1
            outside[url] += 1
        elif row["articleIds"]:
            counts["has-draft"] += 1
        else:
            counts["in-corpus-not-translated"] += 1
            queue[(row["materialType"], row["canonicalUrl"])] += 1
    return counts, queue, outside


def count_book_tags(links):
    return collections.Counter(link["text"].strip() for link in links if classify_link(link["href"]) == "book-tag")


def print_counter(title, counter, limit):
    print(f"\n{title}")
    for key, count in counter.most_common(limit):
        print(f"  {count:>4}  {key}")


def run_report(limit):
    links = collect_links(DRAFTS_DIRECTORY)
    ledger_rows = json.loads(COVERAGE_LEDGER.read_text(encoding="utf-8"))["rows"]
    print(f"links: {len(links)}, unique hrefs: {len({link['href'] for link in links})}")
    print_counter("by kind", collections.Counter(classify_link(link["href"]) for link in links), 20)
    counts, queue, outside = count_rpgbot_targets(links, ledger_rows)
    print(f"\nrpgbot article targets: {dict(counts)}")
    print_counter("book tags", count_book_tags(links), limit)
    print_counter("in-corpus pages not translated yet (by mentions)", queue, limit)
    print_counter("pages outside the corpus (by mentions)", outside, limit)
    print("\ndndbeyond links:")
    for link in links:
        if classify_link(link["href"]) != "external-other" and classify_link(link["href"]).startswith("dndbeyond"):
            print(f"  {link['articleId']}  {link['text'][:40]}  {link['href'][:90]}")


if __name__ == "__main__":
    run_report(int(sys.argv[1]) if len(sys.argv) > 1 else 20)
