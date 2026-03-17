defmodule ScheckergeWeb.Plugs.RateLimiter do
  @moduledoc """
  Per-IP rate limiter for /api/check.
  Allows up to 30 requests per minute per IP address.
  ETS table :rate_limit is initialized in Scheckerge.Application.
  """

  import Plug.Conn

  @table        :rate_limit
  @max_requests 30
  @window_ms    60_000

  def init(opts), do: opts

  def call(conn, _opts) do
    # Behind a reverse proxy (nginx) conn.remote_ip is always 127.0.0.1.
    # Use X-Forwarded-For / X-Real-IP if present; fall back to remote_ip.
    ip =
      (get_req_header(conn, "x-real-ip") |> List.first()) ||
      (get_req_header(conn, "x-forwarded-for") |> List.first() |> extract_first_ip()) ||
      (:inet.ntoa(conn.remote_ip) |> to_string())
    now = System.monotonic_time(:millisecond)

    case check_rate(ip, now) do
      :ok ->
        conn

      :exceeded ->
        conn
        |> put_resp_header("content-type", "application/json")
        |> put_resp_header("retry-after", "60")
        |> send_resp(429, ~s({"error":"ძალიან ბევრი მოთხოვნა. სცადეთ 1 წუთში."}))
        |> halt()
    end
  end

  defp check_rate(ip, now) do
    window_start = now - @window_ms

    case :ets.lookup(@table, ip) do
      [{^ip, timestamps}] ->
        recent = Enum.filter(timestamps, &(&1 >= window_start))

        if length(recent) >= @max_requests do
          :exceeded
        else
          :ets.insert(@table, {ip, [now | recent]})
          :ok
        end

      [] ->
        :ets.insert(@table, {ip, [now]})
        :ok
    end
  end

  # "1.2.3.4, 10.0.0.1" → "1.2.3.4"
  defp extract_first_ip(nil), do: nil
  defp extract_first_ip(header) do
    header |> String.split(",") |> List.first() |> String.trim()
  end

  @doc """
  Sweep the rate_limit ETS table and remove all entries whose timestamps
  are entirely outside the current window. Called periodically by
  Scheckerge.RateLimiterCleaner.
  """
  def sweep do
    now          = System.monotonic_time(:millisecond)
    window_start = now - @window_ms

    :ets.foldl(fn {ip, timestamps}, _acc ->
      case Enum.filter(timestamps, &(&1 >= window_start)) do
        []     -> :ets.delete(@table, ip)
        recent -> :ets.insert(@table, {ip, recent})
      end
    end, :ok, @table)
  end
end
