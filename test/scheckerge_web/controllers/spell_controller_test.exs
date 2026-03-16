defmodule ScheckergeWeb.SpellControllerTest do
  use ScheckergeWeb.ConnCase, async: true

  @endpoint ScheckergeWeb.Endpoint

  # Georgian words guaranteed to be in the dictionary
  @known_word   "სახლი"       # house — in dictionary
  # All-consonant cluster: impossible in Georgian phonology, never in any dictionary
  @unknown_word "ბჩფთსდ"

  describe "POST /api/check" do
    test "returns 200 with clean text", %{conn: conn} do
      conn = post(conn, "/api/check", %{"text" => @known_word})
      assert %{"error_count" => 0, "accuracy" => 100} = json_response(conn, 200)
    end

    test "returns errors for unknown words", %{conn: conn} do
      conn = post(conn, "/api/check", %{"text" => @unknown_word})
      body = json_response(conn, 200)
      assert body["error_count"] >= 1
      assert Enum.any?(body["errors"], &(&1["word"] == @unknown_word))
    end

    test "returns word counts", %{conn: conn} do
      conn = post(conn, "/api/check", %{"text" => "#{@known_word} #{@known_word}"})
      body = json_response(conn, 200)
      assert body["total_words"] == 2
    end

    test "ignores non-Georgian characters", %{conn: conn} do
      conn = post(conn, "/api/check", %{"text" => "hello world 123"})
      body = json_response(conn, 200)
      assert body["total_words"] == 0
      assert body["error_count"] == 0
    end

    test "returns 400 when text param is missing", %{conn: conn} do
      conn = post(conn, "/api/check", %{})
      assert json_response(conn, 400)["error"] != nil
    end

    test "returns 413 for text exceeding 2MB", %{conn: conn} do
      big_text = String.duplicate("ა", 2_000_001)
      conn = post(conn, "/api/check", %{"text" => big_text})
      assert json_response(conn, 413)["error"] != nil
    end

    test "returns suggestions for misspelled word", %{conn: conn} do
      conn = post(conn, "/api/check", %{"text" => @unknown_word})
      body = json_response(conn, 200)
      assert body["error_count"] >= 1
      first_error = hd(body["errors"])
      # suggestions is always a list (may be empty if no close matches found)
      assert is_list(first_error["suggestions"])
    end

    test "includes CORS headers", %{conn: conn} do
      conn = post(conn, "/api/check", %{"text" => @known_word})
      assert get_resp_header(conn, "access-control-allow-origin") == ["*"]
    end
  end

  describe "OPTIONS /api/check" do
    test "returns 204 with CORS headers", %{conn: conn} do
      conn = options(conn, "/api/check")
      assert conn.status == 204
      assert get_resp_header(conn, "access-control-allow-methods") != []
    end
  end
end
