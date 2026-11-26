import unittest

from align_timings import align, normalize, parse_words


class AlignTest(unittest.TestCase):
    def test_normalize_strips_diacritics_and_variants(self):
        self.assertEqual(normalize("ٱلرَّحْمَٰنِ"), "الرحمن")
        self.assertEqual(normalize("إِيَّاكَ"), "اياك")

    def test_parse_words_reads_whisper_json(self):
        data = {"transcription": [{"text": " الحمد", "offsets": {"from": 1000, "to": 1500}}, {"text": " [_BEG_]", "offsets": {"from": 0, "to": 10}}]}
        self.assertEqual(parse_words(data), [("الحمد", 1.0, 1.5)])

    def test_align_finds_ayah_starts_despite_asr_errors(self):
        ayahs = [(1, ["الحمد", "لله", "رب"]), (2, ["الرحمن", "الرحيم"]), (3, ["مالك", "يوم", "الدين"])]
        asr = [("بسم", 0.5, 0.9), ("الحمد", 1.0, 1.4), ("لله", 1.4, 1.8), ("رب", 1.8, 2.2),
               ("الرحمن", 3.0, 3.5), ("خطا", 3.5, 3.8), ("مالك", 5.0, 5.4), ("يوم", 5.4, 5.8), ("الدين", 5.8, 6.2)]
        result, overall = align(ayahs, asr, 7.0, 5)
        self.assertEqual([r["ayah"] for r in result], [1, 2, 3])
        self.assertEqual(result[0]["start"], 0.0)
        self.assertEqual(result[1]["start"], 3.0)
        self.assertEqual(result[2]["start"], 5.0)
        self.assertEqual(result[2]["end"], 7.0)
        self.assertEqual(result[0]["end"], 3.0)
        self.assertGreater(overall, 0.7)

    def test_align_interpolates_ayah_with_no_matches(self):
        ayahs = [(1, ["اول"]), (2, ["مفقود", "كلمه"]), (3, ["ثالث"])]
        asr = [("اول", 1.0, 2.0), ("ثالث", 9.0, 10.0)]
        result, _ = align(ayahs, asr, 12.0, 1)
        self.assertEqual(result[1]["matched"], 0.0)
        self.assertTrue(result[0]["end"] <= result[1]["end"] <= result[2]["start"] + 0.001)
        self.assertEqual(result[2]["start"], 9.0)


if __name__ == "__main__":
    unittest.main()
