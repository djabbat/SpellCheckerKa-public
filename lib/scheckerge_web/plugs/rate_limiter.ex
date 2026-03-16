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
    ip  = conn.remote_ip |> :inet.ntoa() |> to_string()
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
