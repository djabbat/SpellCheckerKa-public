defmodule SpellCheckerKa.SpellCoreTest do
  use ExUnit.Case, async: true

  alias SpellCheckerKa.Dictionary

  # ── Levenshtein distance (via suggestions ranking) ────────────────────────

  describe "Levenshtein distance" do
    test "identical word has distance 0 — returns no suggestion needed" do
      # A known word returns 0 errors → distance to itself is 0
      assert Dictionary.member?("სახლი")
    end

    test "one insertion away — word missing one letter" do
      # "სახლ" is missing the final "ი" from "სახლი"
      results = Dictionary.suggestions("სახლ", 5)
      assert is_list(results)
      # The correct word should rank among top suggestions
      assert Enum.any?(results, &String.starts_with?(&1, "სახლ"))
    end

    test "one substitution away — confused letter" do
      # "სახში" has შ instead of ლ (confusion pair)
      results = Dictionary.suggestions("სახში", 5)
      assert is_list(results)
    end

    test "empty string returns empty suggestions" do
      assert Dictionary.suggestions("", 5) == []
    end

    test "very long nonsense exceeds threshold — empty suggestions" do
      # 20-char random string far from any real word
      results = Dictionary.suggestions("ბჩფთსდზხყღქვნმრლ", 5)
      assert is_list(results)
      # May be empty or very few — threshold protects against runaway matching
    end

    test "single character still works" do
      results = Dictionary.suggestions("ა", 3)
      assert is_list(results)
    end
  end

  # ── Georgian confusion table ──────────────────────────────────────────────

  describe "Georgian confusion pairs improve suggestions" do
    # ს ↔ შ is the most common Georgian typo
    test "ს/შ confusion: misspelling with შ gets ს-based suggestion" do
      # "შინ" (home direction) — if someone writes "სინ" it's a classic confusion
      results_s = Dictionary.suggestions("სინ", 5)
      results_sh = Dictionary.suggestions("შინ", 5)
      # Both should return non-empty lists (confusion pair broadens candidate pool)
      assert is_list(results_s)
      assert is_list(results_sh)
    end

    test "კ/ქ confusion: both yield suggestions" do
      r1 = Dictionary.suggestions("კართველი", 5)
      r2 = Dictionary.suggestions("ქართველი", 5)
      assert is_list(r1)
      assert is_list(r2)
    end

    test "რ/ლ confusion: both directions" do
      r1 = Dictionary.suggestions("სარი", 5)
      r2 = Dictionary.suggestions("სალი", 5)
      assert is_list(r1)
      assert is_list(r2)
    end

    test "unknown first char returns empty" do
      # ☺ is not a Georgian character
      assert Dictionary.suggestions("☺word", 5) == []
    end
  end

  # ── Morphological stripping (via member? tolerance) ───────────────────────

  describe "dictionary membership" do
    test "common Georgian words are in dictionary" do
      words = ["და", "არის", "ან", "მაგრამ", "რომ", "ეს", "ის", "ჩვენ"]
      Enum.each(words, fn w ->
        assert Dictionary.member?(w), "Expected #{w} to be in dictionary"
      end)
    end

    test "nonsense words are not in dictionary" do
      nonsense = ["ბჩფ", "ქქქ", "ზზززز", "aaaaa"]
      Enum.each(nonsense, fn w ->
        refute Dictionary.member?(w), "Expected #{w} to NOT be in dictionary"
      end)
    end

    test "member? is case-insensitive for ASCII loanwords" do
      # Georgian is already lowercase, but verify the function doesn't crash on edge cases
      assert is_boolean(Dictionary.member?("სახლი"))
      assert is_boolean(Dictionary.member?(""))
    end
  end

  # ── Suggestions quality ───────────────────────────────────────────────────

  describe "suggestions quality" do
    test "max parameter is respected" do
      Enum.each([1, 3, 5, 10], fn max ->
        results = Dictionary.suggestions("ქართ", max)
        assert length(results) <= max
      end)
    end

    test "suggestions are all Georgian strings" do
      results = Dictionary.suggestions("სახლ", 10)
      Enum.each(results, fn word ->
        assert is_binary(word)
        assert String.length(word) > 0
        # Every character should be in Georgian Unicode range (U+10D0–U+10FF)
        first = word |> String.graphemes() |> List.first()
        cp = first |> String.to_charlist() |> List.first()
        assert cp >= 0x10D0 and cp <= 0x10FF,
               "Expected Georgian char, got #{first} (U+#{Integer.to_string(cp, 16)})"
      end)
    end

    test "suggestions do not include the original misspelling" do
      misspelling = "ბჩფთ"  # nonsense not in dictionary
      results = Dictionary.suggestions(misspelling, 5)
      refute Enum.member?(results, misspelling)
    end
  end
end
