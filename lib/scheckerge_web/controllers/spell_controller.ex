defmodule ScheckergeWeb.SpellController do
  use ScheckergeWeb, :controller

  alias Scheckerge.Dictionary
  alias Scheckerge.LangDictionary
  alias Scheckerge.Morphology

  @max_text_bytes 2_000_000   # 2 MB — large articles / books supported
  @max_words      100_000     # cap returned word list to prevent huge payloads

  # ── CORS ──────────────────────────────────────────────────────────────────────

  def options(conn, _params) do
    conn |> put_cors_headers() |> send_resp(204, "")
  end

  # ── Dictionary: add word ──────────────────────────────────────────────────────
  # Only Georgian words can be persisted to the server dictionary.

  def add_word(conn, %{"word" => word} = params) do
    lang = Map.get(params, "lang", "ka")
    result =
      if lang == "ka" do
        Dictionary.add_word(word)
      else
        LangDictionary.add_word(word, lang)
      end

    case result do
      :ok ->
        conn
        |> put_cors_headers()
        |> json(%{ok: true, word: word |> String.trim() |> String.downcase(), lang: lang})

      {:error, :invalid_word} ->
        conn
        |> put_cors_headers()
        |> put_status(:bad_request)
        |> json(%{error: "Invalid word (min. 2 chars)"})

      {:error, :unsupported_lang} ->
        conn
        |> put_cors_headers()
        |> put_status(:bad_request)
        |> json(%{error: "Unsupported language: #{lang}"})
    end
  end

  def add_word(conn, _params) do
    conn
    |> put_cors_headers()
    |> put_status(:bad_request)
    |> json(%{error: "გამოტოვებული პარამეტრი: word"})
  end

  # ── Dictionary: remove word ───────────────────────────────────────────────────

  def remove_word(conn, %{"word" => word} = params) do
    lang = Map.get(params, "lang", "ka")
    if lang == "ka" do
      Dictionary.remove_word(word)
    else
      LangDictionary.remove_word(word, lang)
    end
    conn |> put_cors_headers() |> json(%{ok: true, word: String.downcase(word), lang: lang})
  end

  def remove_word(conn, _params) do
    conn |> put_cors_headers() |> put_status(:bad_request) |> json(%{error: "missing word"})
  end

  # ── Main check endpoint ───────────────────────────────────────────────────────

  def check(conn, %{"text" => text}) when byte_size(text) > @max_text_bytes do
    conn
    |> put_cors_headers()
    |> put_status(413)
    |> json(%{error: "ტექსტი ძალიან დიდია. მაქსიმუმი: 2MB"})
  end

  def check(conn, %{"text" => text} = params) do
    lang = Map.get(params, "lang", "ka")

    cond do
      not String.valid?(text) ->
        conn
        |> put_cors_headers()
        |> put_status(:bad_request)
        |> json(%{error: "ტექსტი არ არის სწორი UTF-8"})

      true ->
        conn |> put_cors_headers() |> json(check_text(text, lang))
    end
  end

  # ── Chunked endpoint: accepts {chunks: ["...", "...", ...], lang: "ka"} ───────

  def check(conn, %{"chunks" => chunks} = params) when is_list(chunks) do
    lang   = Map.get(params, "lang", "ka")
    merged =
      chunks
      |> Task.async_stream(&check_text(&1, lang),
           max_concurrency: System.schedulers_online(),
           timeout: 30_000)
      |> Enum.map(fn {:ok, result} -> result end)
      |> merge_chunk_results()

    conn |> put_cors_headers() |> json(merged)
  end

  def check(conn, _params) do
    conn
    |> put_cors_headers()
    |> put_status(:bad_request)
    |> json(%{error: "საჭიროა 'text' ან 'chunks' პარამეტრი"})
  end

  # ── Shared text-check logic ───────────────────────────────────────────────────

  # Build word frequency map in a single O(n) pass
  defp build_freq(words) do
    Enum.reduce(words, %{}, fn w, acc -> Map.update(acc, w, 1, &(&1 + 1)) end)
  end

  defp check_text(text, lang) when is_binary(text) do
    words  = extract_words(text, lang)
    freq   = build_freq(words)
    total  = length(words)
    errors = find_errors(Enum.uniq(words), freq, lang)

    {words_out, truncated} =
      if total > @max_words,
        do:   {Enum.take(words, @max_words), true},
        else: {words, false}

    nerr = length(errors)
    result = %{
      words:           words_out,
      errors:          errors,
      total_words:     total,
      error_count:     nerr,
      accuracy:        calculate_accuracy(total, nerr),
      words_truncated: truncated,
      lang:            lang,
    }

    # Georgian-specific extras (typography + stopwords are Georgian-only for now)
    if lang == "ka" do
      result
      |> Map.put(:typography, typography_issues(text))
      |> Map.put(:stopwords,  stopword_hits(words))
    else
      result
      |> Map.put(:typography, [])
      |> Map.put(:stopwords,  [])
    end
  end
  defp check_text(_text, _lang), do: %{error: "invalid"}

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

  # ── Word extraction — language-aware ─────────────────────────────────────────

  @punct_split ~r/[\s\.,!?;:()\[\]{}"'«»„"—–\-\/|]+/u

  defp extract_words(text, lang) do
    text
    |> String.split(@punct_split)
    |> Enum.reject(&(&1 == ""))
    |> Enum.map(&keep_native(&1, lang))
    |> Enum.reject(&(&1 == "" or String.length(&1) < 2))
  end

  # Keep only "native" characters for the selected language
  defp keep_native(word, "ka"), do: String.replace(word, ~r/[^ა-ჰ]/u, "")
  defp keep_native(word, "ru"), do: String.replace(word, ~r/[^А-яЁё]/u, "")
  defp keep_native(word, lang) when lang in ~w(en fr es),
    do: String.replace(word, ~r/[^A-Za-zÀ-ɏ]/u, "")
  defp keep_native(word, _), do: word

  # ── Spell error detection — language-aware ────────────────────────────────────

  # unique_words — already de-duplicated list; freq — O(1) count lookup
  defp find_errors(unique_words, freq, "ka") do
    unique_words
    |> Enum.filter(fn word ->
      String.length(word) > 1 and not Dictionary.member?(word)
    end)
    |> Enum.map(fn word ->
      lw   = String.downcase(word)
      sugs = Dictionary.suggestions(lw)

      morph_note =
        case Morphology.analyze(word) do
          {:ok, base} when base != lw -> base
          _                           -> nil
        end

      %{word: word, suggestions: sugs, count: Map.get(freq, word, 1), base_form: morph_note}
    end)
  end

  defp find_errors(unique_words, freq, lang) when lang in ~w(en fr es ru) do
    unique_words
    |> Enum.filter(fn word ->
      String.length(word) > 1 and not LangDictionary.member?(word, lang)
    end)
    |> Enum.map(fn word ->
      lw   = String.downcase(word)
      sugs = LangDictionary.suggestions(lw, lang)
      %{word: word, suggestions: sugs, count: Map.get(freq, word, 1), base_form: nil}
    end)
  end

  defp find_errors(_unique_words, _freq, _lang), do: []

  # ── Typography checker (Georgian only) ───────────────────────────────────────

  @double_space             ~r/  +/
  @missing_space            ~r/[\.,:;!?][ა-ჰA-Za-z]/u
  @straight_quote           ~r/"/
  @long_hyphen              ~r/ - /
  @georgian_semicolon_as_q  ~r/[ა-ჰ];(\s|$)/u

  defp typography_issues(text) do
    []
    |> check_pattern(text, @double_space,           :double_space,
       "ორმაგი სფასი — წაშალეთ ზედმეტი")
    |> check_pattern(text, @missing_space,          :missing_space_after_punct,
       "პუნქტუაციის ნიშნის შემდეგ სფასი აკლია")
    |> check_pattern(text, @straight_quote,         :straight_quotes,
       "პირდაპირი ბრჭყალები — გამოიყენეთ \u201e\u201c (ქართული) ან \u00ab \u00bb")
    |> check_pattern(text, @long_hyphen,            :hyphen_instead_of_dash,
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
      [%{type: :trailing_spaces, message: "სტრიქონის ბოლოში ზედმეტი სფასები", positions: []} | acc]
    else
      acc
    end
  end

  defp check_multiple_punctuation(acc, text) do
    if String.match?(text, ~r/[!?]{2,}/) do
      [%{type: :multiple_punctuation,
         message: "განმეორებული პუნქტუაცია (!!, ??) — გამოიყენეთ ერთი ნიშანი",
         positions: []} | acc]
    else
      acc
    end
  end

  # ── Stopword / filler-word detection (Georgian only) ─────────────────────────

  @stopwords ~w(
    უბრალოდ ფაქტიურად ფაქტობრივად გარკვეულწილად გარკვეული ეგრეთ
    ძირითადად სინამდვილეში მართლაც ამასთანავე ამასთან თავისთავად
    ცხადია ბუნებრივია სხვათაშორის ფაქტია ნამდვილად საბოლოოდ
    შესაბამისად კვლავ ასე ასეთი
  )

  defp stopword_hits(words) do
    freq = build_freq(Enum.map(words, &String.downcase/1))
    @stopwords
    |> Enum.filter(&Map.has_key?(freq, &1))
    |> Enum.map(fn sw ->
      %{word: sw, count: Map.get(freq, sw, 0),
        message: "სიტყვა-პარაზიტი — განიხილეთ ამოღება ან შეცვლა"}
    end)
  end

  # ── Accuracy ─────────────────────────────────────────────────────────────────

  defp calculate_accuracy(total_words, error_count) do
    if total_words > 0,
      do:   round((total_words - error_count) / total_words * 100),
      else: 100
  end
end
