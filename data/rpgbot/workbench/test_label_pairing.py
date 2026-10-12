"""Usage: python3 -m unittest test_label_pairing — run inside data/rpgbot/workbench."""
import unittest

import fill_sheet
import refs


class PairLabelMarkerTest(unittest.TestCase):
    def test_pairs_a_label_that_is_the_whole_english_label(self):
        text = "Захист без обладунків{{Unarmored Defense}}: це чудово"
        paired = refs.pair_label_marker(text, "Unarmored Defense: this is great")
        self.assertEqual(paired, "{{Захист без обладунків|Unarmored Defense}}: це чудово")

    def test_pairs_a_label_followed_by_a_book_link(self):
        text = "Майстер древкової зброї{{Polearm Master}} [[1|PHB]]: добре"
        paired = refs.pair_label_marker(text, "Polearm Master ^^ ^^[[1|PHB]]^^ ^^: good")
        self.assertEqual(paired, "{{Майстер древкової зброї|Polearm Master}} [[1|PHB]]: добре")

    def test_pairs_a_label_followed_by_a_book_code_in_parentheses(self):
        text = "Ветеран-найманець{{Mercenary Veteran}} (SCAG): Атлетика добра"
        paired = refs.pair_label_marker(text, "Mercenary Veteran (SCAG): Athletics is good")
        self.assertEqual(paired, "{{Ветеран-найманець|Mercenary Veteran}} (SCAG): Атлетика добра")

    def test_keeps_a_parenthesis_that_belongs_to_the_english_label(self):
        text = "Кристал розуму, звичайний{{Mind Crystal (Common)}} (DMG): разовий"
        paired = refs.pair_label_marker(text, "Mind Crystal (Common) (DMG): one use")
        self.assertEqual(paired, "{{Кристал розуму, звичайний|Mind Crystal (Common)}} (DMG): разовий")

    def test_pairs_a_label_with_a_comma_even_when_the_word_counts_match(self):
        text = "Зброя, +1{{Weapon, +1}} [[1|DMG]]: спис"
        paired = refs.pair_label_marker(text, "Weapon, +1 ^^ ^^[[1|DMG]]^^ ^^: spear")
        self.assertEqual(paired, "{{Зброя, +1|Weapon, +1}} [[1|DMG]]: спис")

    def test_pairs_a_label_followed_directly_by_a_book_link(self):
        text = "Підніжка{{Trip Attack}}[[1|PHB]]: повалена ціль"
        paired = refs.pair_label_marker(text, "Trip Attack ^^[[1|PHB]]^^: a toppled target")
        self.assertEqual(paired, "{{Підніжка|Trip Attack}}[[1|PHB]]: повалена ціль")

    def test_keeps_a_marker_that_follows_an_introductory_phrase(self):
        text = "Беремо Мудреця{{Sage}}: це добре"
        self.assertEqual(refs.pair_label_marker(text, "We take Sage: it is good"), text)

    def test_keeps_a_long_introductory_phrase_in_front_of_the_label(self):
        text = "Для класичного образу Паладина підійде напівельф{{Half-Elf}}: він підходить"
        source = "For a classic paladin feel, consider the Half-Elf: it fits"
        self.assertEqual(refs.pair_label_marker(text, source), text)

    def test_keeps_a_label_with_the_same_number_of_words(self):
        text = "Спритні руки{{Fast Hands}}: добре"
        self.assertEqual(refs.pair_label_marker(text, "Fast Hands: good"), text)

    def test_ignores_color_tags_and_typographic_apostrophes_in_the_source(self):
        text = "Лютий крок{{Wolf’s Step}}: добре"
        self.assertEqual(refs.pair_label_marker(text, "<green> Wolf's Step: good"), text)
        longer = "Лютий швидкий крок{{Wolf’s Step}}: добре"
        self.assertEqual(refs.pair_label_marker(longer, "<green> Wolf's Step: good"), "{{Лютий швидкий крок|Wolf’s Step}}: добре")

    def test_leaves_text_alone_without_a_source(self):
        text = "Захист без обладунків{{Unarmored Defense}}: це чудово"
        self.assertEqual(refs.pair_label_marker(text), text)


class FillLinesTest(unittest.TestCase):
    def test_pairs_the_label_using_the_english_line_of_the_same_fragment(self):
        lines = [
            "# Title", "",
            "<!-- sectionId: s1; heading -->", "", "**Український заголовок:**", "",
            "### a · пункт · red", "", "> Unarmored Defense: great", "", "**Українською:**", "",
            "### b · пункт · red", "", "> We take Sage: fine", "", "**Українською:**", "",
        ]
        fragments = {"a": "Захист без обладунків{{Unarmored Defense}}: чудово", "b": "Беремо Мудреця{{Sage}}: добре"}
        fill_sheet.fill_lines(lines, {"s1": "Розділ"}, fragments)
        filled = [line for line in lines if "{{" in line]
        self.assertEqual(filled, ["{{Захист без обладунків|Unarmored Defense}}: чудово", "Беремо Мудреця{{Sage}}: добре"])


if __name__ == "__main__":
    unittest.main()
