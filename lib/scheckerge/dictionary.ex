defmodule Scheckerge.Dictionary do
  @moduledoc """
  Кэш грузинского словаря. Загружает ge.txt один раз при старте приложения
  и хранит в ETS для быстрого поиска. 993 589 слов.
  """
  use GenServer

  @table :ge_dictionary
  @dict_path "priv/static/dictionaris/ge.txt"

  # ─────────────────────────────────────────────
  # Public API
  # ─────────────────────────────────────────────

  def start_link(_opts), do: GenServer.start_link(__MODULE__, [], name: __MODULE__)

  @doc "Проверить, есть ли слово в словаре (нижний регистр)."
  def member?(word) do
    :ets.member(@table, word)
  end

  @doc "Получить все слова с тем же первым символом и близкой длиной (для предложений)."
  def suggestions(word, max \\ 5) do
    first = String.first(word)
    len   = String.length(word)

    :ets.foldl(fn {w}, acc ->
      if length(acc) >= max do
        acc
      else
        if String.first(w) == first and abs(String.length(w) - len) <= 2 do
          [w | acc]
        else
          acc
        end
      end
    end, [], @table)
  end

  # ─────────────────────────────────────────────
  # GenServer callbacks
  # ─────────────────────────────────────────────

  @impl true
  def init(_) do
    :ets.new(@table, [:named_table, :set, :public, read_concurrency: true])
    path = Application.app_dir(:scheckerge, @dict_path)
    load_file(path)
    {:ok, %{}}
  end

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
        require Logger
        Logger.warning("Dictionary not found at #{path}: #{reason}")
    end
  end
end
