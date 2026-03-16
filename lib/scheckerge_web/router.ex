defmodule ScheckergeWeb.Router do
  use ScheckergeWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {ScheckergeWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers, %{
      "content-security-policy" =>
        "default-src 'self'; " <>
        "script-src 'self'; " <>
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " <>
        "font-src 'self' https://fonts.gstatic.com; " <>
        "connect-src 'self' ws: wss:; " <>
        "img-src 'self' data:; " <>
        "frame-ancestors 'none'"
    }
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug ScheckergeWeb.Plugs.RateLimiter
  end

  scope "/", ScheckergeWeb do
    pipe_through :browser

    get "/", PageController, :home
  end

  scope "/api", ScheckergeWeb do
    pipe_through :api

    post    "/check",           SpellController, :check
    options "/check",           SpellController, :options
    post    "/dictionary/add",  SpellController, :add_word
    options "/dictionary/add",  SpellController, :options
  end
end
