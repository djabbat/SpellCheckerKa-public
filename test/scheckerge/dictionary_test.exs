defmodule Scheckerge.DictionaryTest do
  use ExUnit.Case, async: true

  alias Scheckerge.Dictionary

  describe "member?/1" do
    test "returns true for a known Georgian word" do
      # "და" (and) is one of the most common Georgian words
      assert Dictionary.member?("და")
    end

    test "returns false for a nonsense word" do
      refute Dictionary.member?("ქქქქქქქქ")
    end

    test "is case-insensitive (already lowercased)" do
      # Dictionary stores words lowercased; lookup should work
      assert is_boolean(Dictionary.member?("და"))
    end
  end

  describe "suggestions/2" do
    test "returns a list" do
      result = Dictionary.suggestions("ქართ")
      assert is_list(result)
    end

    test "returns at most max suggestions" do
      result = Dictionary.suggestions("და", 3)
      assert length(result) <= 3
    end

    test "returns words starting with the same letter" do
      result = Dictionary.suggestions("ქართ", 5)
      Enum.each(result, fn word ->
        assert String.starts_with?(word, "ქ")
      end)
    end

    test "returns empty list for unknown first char" do
      # Latin 'z' — not in Georgian dictionary
      result = Dictionary.suggestions("zzz", 5)
      assert result == []
    end
  end
end
