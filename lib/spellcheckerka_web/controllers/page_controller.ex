defmodule SpellCheckerKaWeb.PageController do
  use SpellCheckerKaWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end

  def upgrade(conn, _params) do
    render(conn, :upgrade)
  end
end
