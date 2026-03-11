defmodule ScheckergeWeb.Router do
  use ScheckergeWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {ScheckergeWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", ScheckergeWeb do
    pipe_through :browser

    get "/", PageController, :home
  end

  scope "/api", ScheckergeWeb do
    pipe_through :api

    post    "/check", SpellController, :check
    options "/check", SpellController, :options
  end
end
