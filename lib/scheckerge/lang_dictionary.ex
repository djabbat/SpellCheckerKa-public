defmodule Scheckerge.LangDictionary do
  @moduledoc """
  Multi-language dictionary for non-Georgian languages.
  Each supported language gets its own ETS table loaded from
  priv/static/dictionaris/{lang}.txt.

  Supports: en, fr, es, ru
  (Arabic and Chinese require specialised processing — skipped for now.)

  Suggestions use plain Levenshtein distance (no language-specific confusion table).
  """

  use GenServer
  require Logger

  # ── Supported non-Georgian languages ──────────────────────────────────────────

  @supported_langs ~w(en fr es ru)

  @suggestion_threshold 3

  # ── Public API ────────────────────────────────────────────────────────────────

  def start_link(_opts), do: GenServer.start_link(__MODULE__, [], name: __MODULE__)

  @doc "Returns the list of supported language codes."
  def supported_langs, do: @supported_langs

  @doc "True iff `word` (lowercased) is in the dictionary for `lang`."
  def member?(word, lang) when lang in @supported_langs do
    :ets.member(table_name(lang), String.downcase(word))
  end
  def member?(_word, _lang), do: false

  @doc "Remove a word from ETS and from user_words_{lang}.txt."
  def remove_word(word, lang) when lang in @supported_langs do
    w = word |> String.trim() |> String.downcase()
    :ets.delete(table_name(lang), w)
    path = Application.app_dir(:scheckerge, "priv/static/dictionaris/user_words_#{lang}.txt")
    case File.read(path) do
      {:ok, content} ->
        updated = content |> String.split("\n", trim: true) |> Enum.reject(&(&1 == w)) |> Enum.join("\n")
        File.write(path, updated <> "\n")
      _ -> :ok
    end
    :ok
  end
  def remove_word(_word, _lang), do: {:error, :unsupported_lang}

  @doc """
  Add a word to the live ETS dictionary for `lang` and persist it to
  priv/static/dictionaris/user_words_{lang}.txt so it survives restarts.
  """
  def add_word(word, lang) when lang in @supported_langs do
    w = word |> String.trim() |> String.downcase()
    if w == "" or String.length(w) < 2 do
      {:error, :invalid_word}
    else
      :ets.insert(table_name(lang), {w})
      key = {String.first(w), String.length(w)}
      case :ets.lookup(index_name(lang), key) do
        [{^key, words}] -> :ets.insert(index_name(lang), {key, [w | words]})
        []              -> :ets.insert(index_name(lang), {key, [w]})
      end
      path = Application.app_dir(:scheckerge, "priv/static/dictionaris/user_words_#{lang}.txt")
      File.write(path, w <> "\n", [:append])
      :ok
    end
  end
  def add_word(_word, _lang), do: {:error, :unsupported_lang}

  @doc "Returns up to `max` suggestions for a misspelled word in `lang`."
  def suggestions(word, lang, max \\ 5)
  def suggestions(word, lang, max) when lang in @supported_langs do
    first = String.first(word)
    len   = String.length(word)

    candidates =
      (max(1, len - 3)..(len + 3))
      |> Enum.flat_map(fn l ->
        case :ets.lookup(index_name(lang), {first, l}) do
          [{{^first, ^l}, words}] -> words
          _                       -> []
        end
      end)

    word_gs = String.graphemes(word)

    candidates
    |> Enum.uniq()
    |> Enum.map(fn cand -> {cand, levenshtein(word_gs, String.graphemes(cand))} end)
    |> Enum.reject(fn {_, d} -> d > @suggestion_threshold end)
    |> Enum.sort_by(fn {_, d} -> d end)
    |> Enum.take(max)
    |> Enum.map(fn {w, _} -> w end)
  end
  def suggestions(_word, _lang, _max), do: []

  # ── GenServer callbacks ───────────────────────────────────────────────────────

  @impl true
  def init(_) do
    Enum.each(@supported_langs, fn lang ->
      :ets.new(table_name(lang), [:named_table, :set, :public, read_concurrency: true])
      :ets.new(index_name(lang), [:named_table, :set, :public, read_concurrency: true])
      path      = Application.app_dir(:scheckerge, "priv/static/dictionaris/#{lang}.txt")
      user_path = Application.app_dir(:scheckerge, "priv/static/dictionaris/user_words_#{lang}.txt")
      load_file(lang, path)
      load_file(lang, user_path)
      build_index(lang)
      Logger.info("LangDictionary[#{lang}]: loaded #{:ets.info(table_name(lang), :size)} words")
    end)
    {:ok, %{}}
  end

  # ── Private ───────────────────────────────────────────────────────────────────

  defp table_name(lang), do: :"dict_#{lang}"
  defp index_name(lang), do: :"dict_#{lang}_index"

  defp load_file(lang, path) do
    case File.read(path) do
      {:ok, content} ->
        content
        |> String.split("\n", trim: true)
        |> Enum.each(fn word ->
          clean = String.trim(word)
          unless clean == "" do
            :ets.insert(table_name(lang), {String.downcase(clean)})
          end
        end)
      {:error, reason} ->
        Logger.warning("LangDictionary[#{lang}]: not found at #{path}: #{reason}")
    end
  end

  defp build_index(lang) do
    :ets.foldl(fn {w}, acc ->
      key = {String.first(w), String.length(w)}
      Map.update(acc, key, [w], &[w | &1])
    end, %{}, table_name(lang))
    |> Enum.each(fn {key, words} ->
      :ets.insert(index_name(lang), {key, words})
    end)
  end

  # ── Levenshtein (same algorithm as Dictionary.ex) ────────────────────────────

  defp levenshtein(sv, tv) when sv == tv, do: 0
  defp levenshtein([], tv),               do: length(tv)
  defp levenshtein(sv, []),               do: length(sv)
  defp levenshtein(sv, tv) do
    n        = length(tv)
    init_row = Enum.to_list(0..n) |> List.to_tuple()

    result =
      Enum.reduce_while(sv, {init_row, 1}, fn sc, {prev, i} ->
        {_, row_min, cur_rev} =
          Enum.reduce(Enum.with_index(tv, 1), {i, i, [i]}, fn {tc, j}, {left, row_min, acc} ->
            cost  = if sc == tc, do: 0, else: 1
            above = elem(prev, j)
            diag  = elem(prev, j - 1)
            v     = min(left + 1, min(above + 1, diag + cost))
            {v, min(row_min, v), [v | acc]}
          end)
        cur_row = cur_rev |> Enum.reverse() |> List.to_tuple()
        if row_min > @suggestion_threshold do
          {:halt, @suggestion_threshold + 1}
        else
          {:cont, {cur_row, i + 1}}
        end
      end)

    case result do
      {last_row, _} -> elem(last_row, n)
      d             -> d
    end
  end
end
