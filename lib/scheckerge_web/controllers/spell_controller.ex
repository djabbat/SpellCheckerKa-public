defmodule ScheckergeWeb.SpellController do
  use ScheckergeWeb, :controller

  alias Scheckerge.Dictionary

  # ─────────────────────────────────────────────
  # CORS — разрешаем запросы из browser extension
  # ─────────────────────────────────────────────

  def options(conn, _params) do
    conn
    |> put_cors_headers()
    |> send_resp(204, "")
  end

  def check(conn, %{"text" => text}) do
    words  = extract_words(text)
    errors = find_errors(words)

    conn
    |> put_cors_headers()
    |> json(%{
      words:       words,
      errors:      errors,
      total_words: length(words),
      error_count: length(errors),
      accuracy:    calculate_accuracy(length(words), length(errors))
    })
  end

  # ─────────────────────────────────────────────
  # Private
  # ─────────────────────────────────────────────

  defp put_cors_headers(conn) do
    conn
    |> put_resp_header("access-control-allow-origin",  "*")
    |> put_resp_header("access-control-allow-methods", "POST, OPTIONS")
    |> put_resp_header("access-control-allow-headers", "content-type")
  end

  defp extract_words(text) do
    text
    |> String.split(~r/[\s\.,!?;:()\[\]{}"'«»—–\-]+/)
    |> Enum.filter(&(&1 != ""))
    |> Enum.map(&String.replace(&1, ~r/[^ა-ჰ]/u, ""))
    |> Enum.filter(&(&1 != ""))
  end

  defp find_errors(words) do
    words
    |> Enum.uniq()
    |> Enum.filter(fn word ->
      String.length(word) > 1 && !Dictionary.member?(String.downcase(word))
    end)
    |> Enum.map(fn word ->
      %{
        word:        word,
        suggestions: Dictionary.suggestions(String.downcase(word)),
        count:       Enum.count(words, &(&1 == word))
      }
    end)
  end

  defp calculate_accuracy(total_words, error_count) do
    if total_words > 0 do
      round((total_words - error_count) / total_words * 100)
    else
      100
    end
  end
end
