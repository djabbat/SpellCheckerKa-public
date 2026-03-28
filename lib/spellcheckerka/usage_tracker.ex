defmodule SpellCheckerKa.UsageTracker do
  @moduledoc """
  Tracks daily API usage time per IP.
  Free tier: 30 minutes (1800 seconds) per day.
  Admin IPs bypass the quota.
  ETS table :usage_tracker initialized in Application.
  """

  @table        :usage_tracker
  @free_seconds 1_800   # 30 minutes per day
  # Admin token passed as X-Admin-Token header
  @admin_token  System.get_env("SPELLCHECKERKA_ADMIN_TOKEN") || "changeme-admin-secret"

  def init_table do
    :ets.new(@table, [:named_table, :set, :public, {:write_concurrency, true}])
  end

  @doc "Returns {:ok, remaining_seconds} or {:quota_exceeded, 0}"
  def check_and_record(ip, admin_token \\ nil) do
    if admin_token == @admin_token do
      {:ok, :unlimited}
    else
      today = Date.utc_today() |> Date.to_string()
      key   = {ip, today}
      now   = System.monotonic_time(:second)

      case :ets.lookup(@table, key) do
        [{^key, {used_seconds, last_ts}}] ->
          elapsed = max(0, now - last_ts)
          new_used = used_seconds + elapsed

          if new_used >= @free_seconds do
            :ets.insert(@table, {key, {new_used, now}})
            {:quota_exceeded, 0}
          else
            :ets.insert(@table, {key, {new_used, now}})
            {:ok, @free_seconds - new_used}
          end

        [] ->
          :ets.insert(@table, {key, {0, now}})
          {:ok, @free_seconds}
      end
    end
  end

  @doc "Sweep old entries (called by a daily cleaner)"
  def sweep do
    today = Date.utc_today() |> Date.to_string()
    :ets.foldl(fn {{_ip, date}, _}, _acc ->
      if date != today, do: :ets.delete(@table, {_ip, date})
    end, :ok, @table)
  end
end
