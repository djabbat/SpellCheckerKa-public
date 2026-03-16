defmodule Scheckerge.Morphology do
  @moduledoc """
  Georgian morphological stemmer.

  Georgian is agglutinative — words are formed by attaching chains of suffixes
  (case endings, postpositions, plural markers) to a base stem.  The stem is
  typically the nominative singular form, which usually ends in -ი.

  This module strips the most common suffix sequences (longest-first to prevent
  under-stripping) and checks whether the recovered stem exists in the dictionary.

  Handles:
    • Noun case endings (7 cases)
    • Plural marker -ებ- combined with case/postposition endings
    • Common postpositions attached to case forms
    • Adjective/participial suffixes (-ული, -ური, -ოვანი, -იანი)
    • Verbal noun suffixes (-ება, -ობა)
    • Common verb personal endings

  Strategy:
    strip(suffix) → candidate stem → try stem, stem+"ი", stem+"ა", stem+"ე" in dict
  """

  @table :ge_dictionary   # ETS table name from Dictionary module

  # ── Suffix table: {to_strip, restore_endings_to_try}
  # Ordered longest → shortest.  For each suffix we try appending each element
  # of the restore list plus the bare stem itself.
  @suffixes [
    # ── Plural + postposition combinations ───────────────────────────────
    {"ებისათვის", ["ი"]},
    {"ებისთვის",  ["ი"]},
    {"ებისგანვე", ["ი"]},
    {"ებისგან",   ["ი"]},
    {"ებისკენ",   ["ი"]},
    {"ებიდანვე",  ["ი"]},
    {"ებიდან",    ["ი"]},
    {"ებამდეც",   ["ი"]},
    {"ებამდე",    ["ი"]},
    {"ებისასვე",  ["ი"]},
    {"ებისასაც",  ["ი"]},
    {"ებისასა",   ["ი"]},
    {"ებისას",    ["ი"]},
    {"ებისაც",    ["ი"]},
    {"ებისა",     ["ი"]},
    {"ებზეც",     ["ი"]},
    {"ებზე",      ["ი"]},
    {"ებშიც",     ["ი"]},
    {"ებში",      ["ი"]},
    {"ებთანვე",   ["ი"]},
    {"ებთანაც",   ["ი"]},
    {"ებთან",     ["ი"]},
    {"ებადვე",    ["ი"]},
    {"ებადაც",    ["ი"]},
    {"ებად",      ["ი"]},
    {"ებითვე",    ["ი"]},
    {"ებითაც",    ["ი"]},
    {"ებით",      ["ი"]},
    {"ებმა",      ["ი"]},
    {"ებსვე",     ["ი"]},
    {"ებსაც",     ["ი"]},
    {"ების",      ["ი"]},
    {"ებს",       ["ი"]},
    {"ებო",       ["ი"]},
    {"ები",       ["ი"]},

    # ── Adjective/participial suffixes ────────────────────────────────────
    {"ოვანების",  [""]},
    {"ოვანებს",   [""]},
    {"ოვანებმა",  [""]},
    {"ოვანები",   [""]},
    {"ოვანი",     ["", "ი"]},
    {"ოვანს",     [""]},
    {"ოვანმა",    [""]},
    {"ოვანად",    [""]},
    {"ოვანო",     [""]},
    {"ებური",     [""]},
    {"ებურს",     [""]},
    {"ებურად",    [""]},
    {"იანების",   [""]},
    {"იანებს",    [""]},
    {"იანები",    [""]},
    {"იანი",      ["", "ი"]},
    {"იანს",      [""]},
    {"იანმა",     [""]},
    {"იანად",     [""]},
    {"ულების",    [""]},
    {"ულებს",     [""]},
    {"ულები",     [""]},
    {"ული",       ["", "ი"]},
    {"ულს",       [""]},
    {"ულმა",      [""]},
    {"ულად",      [""]},
    {"ულო",       [""]},
    {"ური",       ["", "ი"]},
    {"ურს",       [""]},
    {"ურმა",      [""]},
    {"ურად",      [""]},
    {"ელი",       ["", "ი"]},
    {"ელს",       [""]},
    {"ელმა",      [""]},
    {"ელად",      [""]},

    # ── Verbal noun / infinitive / gerund ─────────────────────────────────
    {"ებული",     [""]},
    {"ებულს",     [""]},
    {"ებულმა",    [""]},
    {"ება",       [""]},
    {"ობა",       [""]},
    {"ავება",     ["ავ"]},
    {"ობება",     ["ობ"]},

    # ── Common verb personal endings ──────────────────────────────────────
    # 3rd person singular present
    {"ებს",       ["", "ი"]},
    {"ავს",       ["ავ"]},
    {"ობს",       ["ობ"]},
    # 1st person (ვ- prefix handled in caller)
    {"ებ",        [""]},
    {"ავ",        ["ავ"]},
    {"ობ",        ["ობ"]},

    # ── Singular case endings (stem lacks final -ი) ────────────────────────
    {"ისათვის",   ["ი"]},
    {"ისთვის",    ["ი"]},
    {"ისგანვე",   ["ი"]},
    {"ისგან",     ["ი"]},
    {"ისკენ",     ["ი"]},
    {"ისამდეც",   ["ი"]},
    {"ისამდე",    ["ი"]},
    {"ისასვე",    ["ი"]},
    {"ისასაც",    ["ი"]},
    {"ისასა",     ["ი"]},
    {"ისას",      ["ი"]},
    {"ისაც",      ["ი"]},
    {"ისა",       ["ი"]},

    # Postpositions on vocalic stem (no -ის- bridge)
    {"სათვის",    [""]},
    {"სთვის",     [""]},
    {"ათვის",     [""]},
    {"ისდამი",    ["ი"]},
    {"სადმი",     [""]},
    {"სდამი",     [""]},
    {"ამდეც",     ["", "ი"]},
    {"ამდე",      ["", "ი"]},
    {"მდეც",      [""]},
    {"მდე",       [""]},
    {"ზედაც",     [""]},
    {"ზედა",      [""]},
    {"ზეც",       [""]},
    {"ზე",        [""]},
    {"შიც",       [""]},
    {"ში",        [""]},
    {"დანვეც",    [""]},
    {"დანვე",     [""]},
    {"დანაც",     [""]},
    {"დანა",      [""]},
    {"დან",       [""]},
    {"თანვე",     [""]},
    {"თანაც",     [""]},
    {"თანა",      [""]},
    {"თან",       [""]},
    {"სკენ",      [""]},
    {"კენ",       [""]},
    {"ადვე",      [""]},
    {"ადაც",      [""]},
    {"ად",        [""]},
    {"ითვე",      [""]},
    {"ითაც",      [""]},
    {"ით",        [""]},

    # Genitive -ის (after consonant stem)
    {"ის",        ["ი"]},

    # Dative/accusative -ს (shortest, after vowel stem)
    {"სა",        [""]},
    {"ს",         ["", "ი"]},

    # Ergative -მა
    {"მა",        ["", "ი"]},

    # Vocative/quotative -ო
    {"ო",         ["", "ი"]},
  ]

  # Minimum stem length after stripping (prevents stripping too aggressively)
  @min_stem 2

  # ── Public API ────────────────────────────────────────────────────────────────

  @doc """
  Returns true if the word is morphologically valid — either directly in the
  dictionary or its recovered base form is.
  """
  def valid?(word) do
    w = String.downcase(word)
    :ets.member(@table, w) or not is_nil(find_base(w))
  end

  @doc """
  Returns {:ok, base_form} if a valid base was found, or :unknown.
  """
  def analyze(word) do
    w = String.downcase(word)
    cond do
      :ets.member(@table, w) -> {:ok, w}
      base = find_base(w)    -> {:ok, base}
      true                   -> :unknown
    end
  end

  # ── Private ───────────────────────────────────────────────────────────────────

  defp find_base(word) do
    # Also try ვ- verb prefix stripping
    candidates = [word | verb_prefix_variants(word)]

    Enum.find_value(candidates, fn w ->
      try_suffixes(w)
    end)
  end

  defp try_suffixes(word) do
    word_len = String.length(word)
    Enum.find_value(@suffixes, fn {suffix, restores} ->
      if String.ends_with?(word, suffix) do
        suf_len  = String.length(suffix)
        stem_len = word_len - suf_len
        if stem_len >= @min_stem do
          stem = String.slice(word, 0, stem_len)
          try_restores(stem, stem_len, restores)
        end
      end
    end)
  end

  # Attempt to reconstruct a dictionary base form from a stem.
  # stem_len is pre-computed to avoid repeated String.length calls.
  @restore_endings ["", "ი", "ა", "ე"]

  defp try_restores(stem, stem_len, restores) do
    all = Enum.uniq(@restore_endings ++ restores)
    Enum.find_value(all, fn ending ->
      # Only concat + lookup when the result will meet the min-stem threshold
      if ending == "" do
        if stem_len >= @min_stem and :ets.member(@table, stem), do: stem
      else
        candidate = stem <> ending
        if :ets.member(@table, candidate), do: candidate
      end
    end)
  end

  # Georgian verbs often carry preverb prefixes — try stripping the most common ones
  @preverbs ["გამო", "გადმო", "შემო", "ჩამო", "გადა", "მომ",
             "შე", "გა", "და", "მი", "მო", "ამ", "ჩა"]

  defp verb_prefix_variants(word) do
    @preverbs
    |> Enum.filter(&String.starts_with?(word, &1))
    |> Enum.map(fn pv ->
      String.slice(word, String.length(pv), String.length(word))
    end)
    |> Enum.filter(&(String.length(&1) >= @min_stem))
  end
end
