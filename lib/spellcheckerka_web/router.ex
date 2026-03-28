defmodule SpellCheckerKaWeb.Router do
  use SpellCheckerKaWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {SpellCheckerKaWeb.Layouts, :root}
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
    plug SpellCheckerKaWeb.Plugs.RateLimiter
  end

  scope "/", SpellCheckerKaWeb do
    pipe_through :browser

    get "/", PageController, :home
    get "/upgrade", PageController, :upgrade
  end

  scope "/api", SpellCheckerKaWeb do
    pipe_through :api

    post    "/check",           SpellController, :check
    options "/check",           SpellController, :options
    post    "/dictionary/add",    SpellController, :add_word
    options "/dictionary/add",    SpellController, :options
    post    "/dictionary/remove", SpellController, :remove_word
    options "/dictionary/remove", SpellController, :options
  end
end
