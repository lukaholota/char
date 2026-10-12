"""Splits long single-line translations in worksheets into paragraphs.

A blank line inside the translated field becomes a paragraph break in the article,
a single newline becomes a line break.
"""
import argparse
import re
import sys
from pathlib import Path

LONG_TEXT_LENGTH = 420
PARAGRAPH_SOFT_LENGTH = 130
PARAGRAPH_HARD_LENGTH = 320
LAST_PARAGRAPH_MIN_LENGTH = 110
TRANSITION_WORDS = ("Проте", "Однак", "Але", "Втім", "Утім", "Зрештою", "Також", "Звісно", "На жаль", "Тому", "Отже",
                    "Тим часом", "Зверніть", "Памʼятайте", "Якщо ж", "Тепер", "Крім того", "До того ж", "Натомість")
PARAGRAPH_KINDS = ("абзац", "пункт", "комірка таблиці")
PROTECTED_SPAN = re.compile(r"\[\[\d+\|.*?\]\]|\{\{.*?\}\}|«[^»]*»|\([^)]*\)")
SENTENCE_END = re.compile(r"(?<=[.!?…])\s+(?=[«\"“А-ЯІЇЄҐA-Z*])")
FRAGMENT = re.compile(
    r"^(### \S+ · (?:" + "|".join(PARAGRAPH_KINDS) + r") · [^\n]+\n\n> [^\n]*\n\n\*\*Українською:\*\*\n)([^\n].*?)(\n\n(?=^### |^## |\Z))",
    re.M | re.S)


def split_sentences(text):
    spans = []

    def hide(match):
        spans.append(match.group(0))
        return f"\u0000{len(spans) - 1}\u0000"

    hidden = PROTECTED_SPAN.sub(hide, text)
    parts = SENTENCE_END.split(hidden)
    return [re.sub("\u0000(\\d+)\u0000", lambda match: spans[int(match.group(1))], part) for part in parts]


def starts_with_transition(sentence):
    return sentence.lstrip("*«\"").startswith(TRANSITION_WORDS)


def group_sentences(sentences):
    paragraphs, current = [], []
    for sentence in sentences:
        length = len(" ".join(current))
        wants_break = current and (length >= PARAGRAPH_HARD_LENGTH or
                                   (length >= PARAGRAPH_SOFT_LENGTH and starts_with_transition(sentence)))
        if wants_break:
            paragraphs.append(" ".join(current))
            current = []
        current.append(sentence)
    paragraphs.append(" ".join(current))
    if len(paragraphs) > 1 and len(paragraphs[-1]) < LAST_PARAGRAPH_MIN_LENGTH:
        paragraphs[-2:] = [paragraphs[-2] + " " + paragraphs[-1]]
    return paragraphs


def paragraphize(text):
    if "\n" in text or len(text) < LONG_TEXT_LENGTH:
        return text
    return "\n\n".join(group_sentences(split_sentences(text)))


def paragraphize_sheet(content):
    changed = 0

    def rewrite(match):
        nonlocal changed
        updated = paragraphize(match.group(2))
        changed += updated != match.group(2)
        return match.group(1) + updated + match.group(3)

    return FRAGMENT.sub(rewrite, content), changed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("worksheets", nargs="+", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    for path in args.worksheets:
        updated, changed = paragraphize_sheet(path.read_text(encoding="utf-8"))
        if args.apply and changed:
            path.write_text(updated, encoding="utf-8")
        print(f"{path.name}: {changed} fragments split")


if __name__ == "__main__":
    sys.exit(main())
