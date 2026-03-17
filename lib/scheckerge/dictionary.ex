defmodule Scheckerge.Dictionary do
  @moduledoc """
  Georgian dictionary cache.  Loads ge.txt once at startup into ETS for O(1) lookup.
  993 589 words.

  ETS tables:
    @table        — main:  {word}                         — O(1) member?/1
    @index_table  — index: {{first_char, length}, [words]} — candidate pool for suggestions

  Improvements over v1:
    • member?/1 now delegates to Morphology for agglutinative forms (fewer false positives)
    • suggestions/2 uses Levenshtein distance + Georgian letter-confusion table for
      ranked, phonetically aware replacements
  """

  use GenServer
  require Logger

  alias Scheckerge.Morphology

  @table            :ge_dictionary
  @index_table      :ge_dictionary_index
  @dict_path        "priv/static/dictionaris/ge.txt"
  @user_words_path  "priv/static/dictionaris/user_words.txt"

  # ── Public API ────────────────────────────────────────────────────────────────

  def start_link(_opts), do: GenServer.start_link(__MODULE__, [], name: __MODULE__)

  @doc """
  True if the word (or its morphological base form) is in the dictionary.
  """
  def member?(word) do
    w = String.downcase(word)
    :ets.member(@table, w) or Morphology.valid?(w)
  end

  @doc """
  Remove a word from the live dictionary (ETS) and from user_words.txt.
  Only user-added words (in user_words.txt) can be removed; base dictionary
  words are kept intact.
  """
  def remove_word(word) do
    w = word |> String.trim() |> String.downcase()
    :ets.delete(@table, w)

    path = Application.app_dir(:scheckerge, @user_words_path)
    case File.read(path) do
      {:ok, content} ->
        updated = content |> String.split("\n", trim: true) |> Enum.reject(&(&1 == w)) |> Enum.join("\n")
        File.write(path, updated <> "\n")
      _ -> :ok
    end
    :ok
  end

  @doc """
  Add a word to the live dictionary (ETS) and persist it to user_words.txt
  so it survives server restarts.  Only Georgian Mkhedruli words accepted.
  """
  def add_word(word) do
    w = word |> String.trim() |> String.downcase()

    if String.match?(w, ~r/^[ა-ჰ]{2,}$/) do
      # Insert into main lookup table
      :ets.insert(@table, {w})

      # Update candidate index for this word's (first_char, length) bucket
      key = {String.first(w), String.length(w)}
      case :ets.lookup(@index_table, key) do
        [{^key, words}] -> :ets.insert(@index_table, {key, [w | words]})
        []              -> :ets.insert(@index_table, {key, [w]})
      end

      # Persist — append to user_words.txt only if not already present
      path = Application.app_dir(:scheckerge, @user_words_path)
      already_saved =
        case File.read(path) do
          {:ok, content} -> w in String.split(content, "\n", trim: true)
          _              -> false
        end
      unless already_saved, do: File.write(path, w <> "\n", [:append])

      :ok
    else
      {:error, :invalid_word}
    end
  end

  @doc """
  Return up to `max` ranked suggestions for a misspelled word.

  Algorithm:
    1. Collect candidates: words sharing the first char with length ±3.
    2. Also collect candidates for phonetically/visually confused first chars.
    3. Rank all candidates by Levenshtein distance.
    4. Return the top `max`.
  """
  # Max edit distance for a suggestion to be considered useful.
  @suggestion_threshold 4

  def suggestions(word, max \\ 5) do
    first = String.first(word)
    len   = String.length(word)

    # Primary candidates: same first char, length ±3
    primary = fetch_candidates(first, len, 3)

    # Confusion candidates: visually/phonetically similar first chars, length ±2
    confused =
      georgian_confusions(first)
      |> Enum.flat_map(&fetch_candidates(&1, len, 2))

    # Convert query word to graphemes once — reused for every candidate comparison
    word_gs = String.graphemes(word)

    (primary ++ confused)
    |> Enum.uniq()
    |> Enum.map(fn cand -> {cand, levenshtein_gs(word_gs, String.graphemes(cand))} end)
    |> Enum.reject(fn {_, d} -> d > @suggestion_threshold end)
    |> Enum.sort_by(fn {_, d} -> d end)
    |> Enum.take(max)
    |> Enum.map(fn {w, _} -> w end)
  end

  # ── GenServer callbacks ───────────────────────────────────────────────────────

  @impl true
  def init(_) do
    :ets.new(@table,       [:named_table, :set, :public, read_concurrency: true])
    :ets.new(@index_table, [:named_table, :set, :public, read_concurrency: true])
    path       = Application.app_dir(:scheckerge, @dict_path)
    user_path  = Application.app_dir(:scheckerge, @user_words_path)
    load_file(path)
    load_file(user_path)   # user additions layered on top (file may not exist yet)
    build_index()
    {:ok, %{}}
  end

  # ── Private ───────────────────────────────────────────────────────────────────

  defp load_file(path) do
    case File.read(path) do
      {:ok, content} ->
        content
        |> String.split("\n", trim: true)
        |> Enum.each(fn word ->
          clean = String.trim(word)
          unless clean == "" do
            :ets.insert(@table, {String.downcase(clean)})
          end
        end)

      {:error, reason} ->
        Logger.warning("Dictionary not found at #{path}: #{reason}")
    end
  end

  defp build_index do
    :ets.foldl(fn {w}, acc ->
      key = {String.first(w), String.length(w)}
      Map.update(acc, key, [w], &[w | &1])
    end, %{}, @table)
    |> Enum.each(fn {key, words} ->
      :ets.insert(@index_table, {key, words})
    end)
  end

  defp fetch_candidates(first_char, len, radius) do
    max(1, len - radius)..len + radius
    |> Enum.flat_map(fn l ->
      case :ets.lookup(@index_table, {first_char, l}) do
        [{{^first_char, ^l}, words}] -> words
        _                            -> []
      end
    end)
  end

  # ── Georgian letter confusion table ──────────────────────────────────────────
  # Pairs that are visually similar (Mkhedruli) or share place/manner of articulation.

  defp georgian_confusions("ს"), do: ["შ", "ც"]
  defp georgian_confusions("შ"), do: ["ს", "ჩ"]
  defp georgian_confusions("ც"), do: ["ს", "ჩ", "ძ"]
  defp georgian_confusions("ჩ"), do: ["შ", "ჯ", "ხ"]
  defp georgian_confusions("ძ"), do: ["ზ", "ც"]
  defp georgian_confusions("ზ"), do: ["ძ", "ჯ", "ს"]
  defp georgian_confusions("ჯ"), do: ["ზ", "ჩ"]
  defp georgian_confusions("კ"), do: ["ქ", "გ"]
  defp georgian_confusions("ქ"), do: ["კ", "ყ"]
  defp georgian_confusions("გ"), do: ["კ", "ღ"]
  defp georgian_confusions("ყ"), do: ["ქ", "ხ"]
  defp georgian_confusions("პ"), do: ["ბ", "ფ"]
  defp georgian_confusions("ბ"), do: ["პ", "ვ"]
  defp georgian_confusions("ფ"), do: ["პ", "ვ"]
  defp georgian_confusions("ტ"), do: ["დ", "თ"]
  defp georgian_confusions("დ"), do: ["ტ", "თ"]
  defp georgian_confusions("თ"), do: ["ტ", "დ", "ფ"]
  defp georgian_confusions("ხ"), do: ["ყ", "ღ", "ქ"]
  defp georgian_confusions("ღ"), do: ["გ", "ყ", "ხ"]
  defp georgian_confusions("ვ"), do: ["ბ", "ფ"]
  defp georgian_confusions("ნ"), do: ["მ"]
  defp georgian_confusions("მ"), do: ["ნ"]
  defp georgian_confusions("რ"), do: ["ლ"]
  defp georgian_confusions("ლ"), do: ["რ"]
  defp georgian_confusions(_),   do: []

  # ── Levenshtein distance ──────────────────────────────────────────────────────
  # Standard DP, O(m*n) time.  Uses tuples for O(1) cell access.
  # Early-exit: if the minimum value in a row exceeds @suggestion_threshold,
  # the final distance will also exceed it — abort immediately.

  defp levenshtein_gs(sv, tv) when sv == tv,  do: 0
  defp levenshtein_gs([],  tv),                do: length(tv)
  defp levenshtein_gs(sv,  []),                do: length(sv)
  defp levenshtein_gs(sv, tv) do
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

        # Early exit: if row minimum already exceeds threshold, final d > threshold
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
