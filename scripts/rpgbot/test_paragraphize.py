import unittest

import paragraphize

SENTENCE = "Це довге речення про те, як працює уміння в бою, і воно триває досить довго."


class ParagraphizeTest(unittest.TestCase):
    def test_short_text_is_unchanged(self):
        self.assertEqual(paragraphize.paragraphize("Коротке речення. Ще одне."), "Коротке речення. Ще одне.")

    def test_text_that_already_has_breaks_is_unchanged(self):
        text = (SENTENCE + " ") * 8
        marked = text.strip() + "\n\nУже поділено."
        self.assertEqual(paragraphize.paragraphize(marked), marked)

    def test_long_text_is_split_at_sentence_ends(self):
        text = " ".join([SENTENCE] * 8)
        result = paragraphize.paragraphize(text)
        paragraphs = result.split("\n\n")
        self.assertGreater(len(paragraphs), 1)
        self.assertTrue(all(paragraph.endswith(".") for paragraph in paragraphs))
        self.assertEqual(" ".join(paragraphs), text)

    def test_transition_word_starts_a_new_paragraph_once_the_first_is_long_enough(self):
        text = " ".join([SENTENCE] * 3) + " Проте " + " ".join([SENTENCE] * 3)
        paragraphs = paragraphize.paragraphize(text).split("\n\n")
        self.assertTrue(any(paragraph.startswith("Проте") for paragraph in paragraphs))

    def test_links_markers_and_quotes_are_not_cut_in_the_middle(self):
        protected = "«Фраза в лапках. З крапкою всередині.» [[1|Текст посилання. Другий.]] Назва{{Eng. Name}}"
        text = " ".join([SENTENCE] * 3) + " " + protected + " " + " ".join([SENTENCE] * 4)
        result = paragraphize.paragraphize(text)
        self.assertIn(protected, result.replace("\n\n", " "))
        for paragraph in result.split("\n\n"):
            self.assertEqual(paragraph.count("[["), paragraph.count("]]"))
            self.assertEqual(paragraph.count("{{"), paragraph.count("}}"))
            self.assertEqual(paragraph.count("«"), paragraph.count("»"))

    def test_short_tail_is_merged_into_the_previous_paragraph(self):
        text = " ".join([SENTENCE] * 5) + " Кінець."
        paragraphs = paragraphize.paragraphize(text).split("\n\n")
        self.assertNotEqual(paragraphs[-1], "Кінець.")

    def test_sheet_fragment_is_rewritten_and_counted(self):
        long_text = " ".join([SENTENCE] * 8)
        sheet = f"### block-a-1 · абзац · без оцінки\n\n> Source text.\n\n**Українською:**\n{long_text}\n\n### block-a-2 · абзац · без оцінки\n\n> Short.\n\n**Українською:**\nКоротко.\n"
        updated, changed = paragraphize.paragraphize_sheet(sheet)
        self.assertEqual(changed, 1)
        self.assertIn("\n\n", updated.split("**Українською:**\n")[1].split("### block-a-2")[0].strip())
        self.assertIn("Коротко.", updated)

    def test_empty_translation_does_not_swallow_the_next_fragment(self):
        long_text = " ".join([SENTENCE] * 8)
        sheet = (f"### block-a-1 · абзац · без оцінки\n\n> One.\n\n**Українською:**\n\n\n"
                 f"### block-a-2 · абзац · без оцінки\n\n> Two.\n\n**Українською:**\n{long_text}\n\n")
        updated, changed = paragraphize.paragraphize_sheet(sheet)
        self.assertEqual(changed, 1)
        self.assertTrue(updated.startswith("### block-a-1 · абзац · без оцінки\n\n> One.\n\n**Українською:**\n\n\n### block-a-2"))


if __name__ == "__main__":
    unittest.main()
