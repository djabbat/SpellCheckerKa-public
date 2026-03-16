defmodule ScheckergeWeb.SpellController do
  use ScheckergeWeb, :controller

  alias Scheckerge.Dictionary
  alias Scheckerge.Morphology

  @max_text_bytes 2_000_000   # 2 MB — large articles / books supported
  @max_words      100_000     # cap returned word list to prevent huge payloads

  # ── CORS ──────────────────────────────────────────────────────────────────────

  def options(conn, _params) do
    conn |> put_cors_headers() |> send_resp(204, "")
  end

  # ── Main check endpoint ───────────────────────────────────────────────────────

  def check(conn, %{"text" => text}) when byte_size(text) > @max_text_bytes do
    conn
    |> put_cors_headers()
    |> put_status(413)
    |> json(%{error: "ტექსტი ძალიან დიდია. მაქსიმუმი: 2MB"})
  end

  def check(conn, %{"text" => text}) do
    cond do
      not String.valid?(text) ->
        conn
        |> put_cors_headers()
        |> put_status(:bad_request)
        |> json(%{error: "ტექსტი არ არის სწორი UTF-8"})

      true ->
        conn |> put_cors_headers() |> json(check_text(text))
    end
  end

  # ── Chunked endpoint: accepts {chunks: ["...", "...", ...]} ───────────────────
  # Client sends large texts split at paragraph boundaries.
  # Server processes each chunk independently and returns merged result.
  def check(conn, %{"chunks" => chunks}) when is_list(chunks) do
    merged =
      chunks
      |> Enum.map(&check_text/1)
      |> merge_chunk_results()

    conn |> put_cors_headers() |> json(merged)
  end

  def check(conn, _params) do
    conn
    |> put_cors_headers()
    |> put_status(:bad_request)
    |> json(%{error: "საჭიროა 'text' ან 'chunks' პარამეტრი"})
  end

  # ── Shared text-check logic (used by single and chunked endpoints) ─────────

  defp check_text(text) when not is_binary(text), do: %{error: "invalid"}
  defp check_text(text) do
    words  = extract_words(text)
    errors = find_errors(words)
    total  = length(words)

    # Cap the words list for very large inputs to avoid huge JSON payloads
    {words_out, truncated} =
      if total > @max_words,
        do:   {Enum.take(words, @max_words), true},
        else: {words, false}

    %{
      words:          words_out,
      errors:         errors,
      total_words:    total,
      error_count:    length(errors),
      accuracy:       calculate_accuracy(total, length(errors)),
      typography:     typography_issues(text),
      stopwords:      stopword_hits(words),
      words_truncated: truncated,
    }
  end

  defp merge_chunk_results(results) do
    error_map =
      Enum.reduce(results, %{}, fn r, acc ->
        Enum.reduce(r[:errors] || [], acc, fn e, m ->
          Map.update(m, e.word, e, fn ex -> %{ex | count: ex.count + e.count} end)
        end)
      end)

    total  = Enum.sum(Enum.map(results, & &1[:total_words] || 0))
    errors = Map.values(error_map)

    typos =
      results
      |> Enum.flat_map(& &1[:typography] || [])
      |> Enum.uniq_by(& &1.type)

    stops =
      Enum.reduce(results, %{}, fn r, acc ->
        Enum.reduce(r[:stopwords] || [], acc, fn sw, m ->
          Map.update(m, sw.word, sw, fn ex -> %{ex | count: ex.count + sw.count} end)
        end)
      end)
      |> Map.values()

    %{
      words:           [],
      errors:          errors,
      total_words:     total,
      error_count:     length(errors),
      accuracy:        calculate_accuracy(total, length(errors)),
      typography:      typos,
      stopwords:       stops,
      words_truncated: false,
      chunked:         true,
    }
  end

  # ── CORS helper ───────────────────────────────────────────────────────────────

  defp put_cors_headers(conn) do
    conn
    |> put_resp_header("access-control-allow-origin",  "*")
    |> put_resp_header("access-control-allow-methods", "POST, OPTIONS")
    |> put_resp_header("access-control-allow-headers", "content-type")
  end

  # ── Word extraction ───────────────────────────────────────────────────────────

  defp extract_words(text) do
    text
    |> String.split(~r/[\s\.,!?;:()\[\]{}"'«»„"—–\-\/|]+/u)
    |> Enum.reject(&(&1 == ""))
    |> Enum.map(&String.replace(&1, ~r/[^ა-ჰ]/u, ""))
    |> Enum.reject(&(&1 == ""))
  end

  # ── Spell error detection ─────────────────────────────────────────────────────

  defp find_errors(words) do
    words
    |> Enum.uniq()
    |> Enum.filter(fn word ->
      # Skip single chars (punctuation artefacts, abbreviations)
      String.length(word) > 1 and not Dictionary.member?(word)
    end)
    |> Enum.map(fn word ->
      lw   = String.downcase(word)
      sugs = Dictionary.suggestions(lw)

      # Morphological analysis: show what base form was recovered (if any)
      morph_note =
        case Morphology.analyze(word) do
          {:ok, base} when base != lw -> base
          _                           -> nil
        end

      %{
        word:        word,
        suggestions: sugs,
        count:       Enum.count(words, &(&1 == word)),
        base_form:   morph_note,
      }
    end)
  end

  # ── Typography checker ────────────────────────────────────────────────────────
  # Returns a list of %{type, message, position} maps.

  @double_space     ~r/  +/
  @missing_space    ~r/[\.,:;!?][ა-ჰA-Za-z]/u
  @straight_quote   ~r/"/
  @long_hyphen      ~r/ - /
  # Georgian: semicolon (;) ends a declarative sentence → should be ?
  @georgian_semicolon_as_q ~r/[ა-ჰ];(\s|$)/u

  defp typography_issues(text) do
    []
    |> check_pattern(text, @double_space,          :double_space,
       "ორმაგი სფასი — წაშალეთ ზედმეტი")
    |> check_pattern(text, @missing_space,         :missing_space_after_punct,
       "პუნქტუაციის ნიშნის შემდეგ სფასი აკლია")
    |> check_pattern(text, @straight_quote,        :straight_quotes,
       "პირდაპირი ბრჭყალები — გამოიყენეთ \u201e\u201c (ქართული) ან \u00ab \u00bb")
    |> check_pattern(text, @long_hyphen,           :hyphen_instead_of_dash,
       "დეფისის ნაცვლად გამოიყენეთ გრძელი ტირე (—)")
    |> check_pattern(text, @georgian_semicolon_as_q, :semicolon_as_question,
       "ქართულ ენაში კითხვითი წინადადება მთავრდება კითხვის ნიშნით (?), არა წერტილ-მძიმით (;)")
    |> check_trailing_spaces(text)
    |> check_multiple_punctuation(text)
  end

  defp check_pattern(acc, text, regex, type, message) do
    if Regex.match?(regex, text) do
      positions =
        Regex.scan(regex, text, return: :index)
        |> Enum.map(fn [{start, _len}] -> start end)

      [%{type: type, message: message, positions: positions} | acc]
    else
      acc
    end
  end

  defp check_trailing_spaces(acc, text) do
    if String.match?(text, ~r/\s+$/m) do
      [%{type: :trailing_spaces, message: "სტრიქონის ბოლოში ზედმეტი სფასები", positions: []}
       | acc]
    else
      acc
    end
  end

  defp check_multiple_punctuation(acc, text) do
    if String.match?(text, ~r/[!?]{2,}/) do
      [%{type: :multiple_punctuation,
         message: "განმეორებული პუნქტუაცია (!!, ??) — გამოიყენეთ ერთი ნიშანი",
         positions: []}
       | acc]
    else
      acc
    end
  end

  # ── Stopword / filler-word detection ─────────────────────────────────────────
  # Common Georgian fillers, pleonasms, and "water" words.

  @stopwords ~w(
    უბრალოდ
    ფაქტიურად
    ფაქტობრივად
    გარკვეულწილად
    გარკვეული
    ეგრეთ
    ძირითადად
    სინამდვილეში
    მართლაც
    ამასთანავე
    ამასთან
    თავისთავად
    ცხადია
    ბუნებრივია
    სხვათაშორის
    ფაქტია
    ნამდვილად
    საბოლოოდ
    შესაბამისად
    კვლავ
    ასე
    ასეთი
  )

  defp stopword_hits(words) do
    lower_words = Enum.map(words, &String.downcase/1)

    @stopwords
    |> Enum.filter(&(&1 in lower_words))
    |> Enum.map(fn sw ->
      %{
        word:    sw,
        count:   Enum.count(lower_words, &(&1 == sw)),
        message: "სიტყვა-პარაზიტი — განიხილეთ ამოღება ან შეცვლა"
      }
    end)
  end

  # ── Accuracy ─────────────────────────────────────────────────────────────────

  defp calculate_accuracy(total_words, error_count) do
    if total_words > 0 do
      round((total_words - error_count) / total_words * 100)
    else
      100
    end
  end
end
