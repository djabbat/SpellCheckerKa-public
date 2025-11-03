defmodule ScheckergeWeb.SpellController do
  use ScheckergeWeb, :controller

  def check(conn, %{"text" => text}) do
    # მართლწერის შემოწმების ლოგიკა
    words = extract_words(text)
    errors = find_errors(words)

    json(conn, %{
      words: words,
      errors: errors,
      total_words: length(words),
      error_count: length(errors),
      accuracy: calculate_accuracy(length(words), length(errors))
    })
  end

  defp extract_words(text) do
    text
    |> String.split(~r/[\s\.,!?;:()\[\]{}"']+/)
    |> Enum.filter(&(&1 != ""))
    |> Enum.map(&String.replace(&1, ~r/[^ა-ჰ\-]/u, ""))
    |> Enum.filter(&(&1 != ""))
  end

  defp find_errors(words) do
    dictionary = load_dictionary()

    words
    |> Enum.uniq()
    |> Enum.filter(fn word ->
      String.length(word) > 1 && !MapSet.member?(dictionary, String.downcase(word))
    end)
    |> Enum.map(fn word ->
      %{
        word: word,
        suggestions: get_simple_suggestions(word, dictionary),
        count: Enum.count(words, &(&1 == word))
      }
    end)
  end

  defp load_dictionary do
    # ძირითადი ლექსიკონის ჩატვირთვა
    basic_words = [
      "ენა", "ქართული", "მართლწერა", "შემოწმება", "დოკუმენტი", "ტექსტი",
      "პროგრამა", "კომპიუტერი", "ინტერნეტი", "გამოყენება", "მარტივი", "სწრაფი",
      "სწორი", "არასწორი", "შეცდომა", "შემოთავაზება", "წითელი", "ტალღისებრი",
      "ხაზი", "გასმა", "არის", "აქვს", "შეუძლია", "უნდა", "შეიძლება", "ვარ",
      "არი", "იყო", "მიდის", "მოდის", "ადამიანი", "ოჯახი", "სკოლა", "უნივერსიტეტი",
      "სტუდენტი", "მასწავლებელი", "ქვეყანა", "ქალაქი", "კარგი", "ცუდი", "დიდი",
      "პატარა", "ახალი", "ძველი", "სასიამოვნო", "საინტერესო", "და", "ან", "მაგრამ",
      "რომ", "თუ", "ეს", "რაც", "ვინ", "რა", "სად", "როდის", "როგორ", "რატომ"
    ]

    basic_words
    |> Enum.map(&String.downcase/1)
    |> MapSet.new()
  end

  defp get_simple_suggestions(word, dictionary) do
    clean_word = String.downcase(word)
    all_words = MapSet.to_list(dictionary)

    # მარტივი ფილტრაცია პირველი ასოს და სიგრძის მიხედვით
    suggestions =
      all_words
      |> Enum.filter(fn dict_word ->
        String.first(dict_word) == String.first(clean_word) &&
        abs(String.length(dict_word) - String.length(clean_word)) <= 2
      end)
      |> Enum.take(5)

    suggestions
  end

  defp calculate_accuracy(total_words, error_count) do
    if total_words > 0 do
      round((total_words - error_count) / total_words * 100)
    else
      100
    end
  end
end
