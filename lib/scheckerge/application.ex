defmodule Scheckerge.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    :ets.new(:rate_limit, [:named_table, :set, :public, {:write_concurrency, true}])

    children = [
      ScheckergeWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:scheckerge, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Scheckerge.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: Scheckerge.Finch},
      Scheckerge.Dictionary,
      Scheckerge.LangDictionary,
      Scheckerge.RateLimiterCleaner,
      # Start to serve requests, typically the last entry
      ScheckergeWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Scheckerge.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    ScheckergeWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
