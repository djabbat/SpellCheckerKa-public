defmodule SpellCheckerKaWeb.PageControllerTest do
  use SpellCheckerKaWeb.ConnCase

  test "GET / returns 200 with app title", %{conn: conn} do
    conn = get(conn, ~p"/")
    assert html_response(conn, 200) =~ "ႤႱႹႤႩႤႰႿႨ"
  end

  test "GET / returns spell check UI elements", %{conn: conn} do
    conn = get(conn, ~p"/")
    body = html_response(conn, 200)
    assert body =~ "editor"
    assert body =~ "მართლწერა"
  end
end
