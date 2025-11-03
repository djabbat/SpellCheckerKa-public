defmodule ScheckergeWeb.PageController do
  use ScheckergeWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
