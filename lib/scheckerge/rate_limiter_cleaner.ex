defmodule Scheckerge.RateLimiterCleaner do
  @moduledoc """
  Periodic sweep of the :rate_limit ETS table.
  Removes stale IP entries (all timestamps older than 1 minute) every 5 minutes.
  Without this, the table grows unboundedly as unique IPs accumulate.
  """

  use GenServer

  @interval_ms 5 * 60 * 1_000  # 5 minutes

  def start_link(_opts), do: GenServer.start_link(__MODULE__, [], name: __MODULE__)

  @impl true
  def init(_) do
    schedule_sweep()
    {:ok, %{}}
  end

  @impl true
  def handle_info(:sweep, state) do
    ScheckergeWeb.Plugs.RateLimiter.sweep()
    schedule_sweep()
    {:noreply, state}
  end

  defp schedule_sweep do
    Process.send_after(self(), :sweep, @interval_ms)
  end
end
