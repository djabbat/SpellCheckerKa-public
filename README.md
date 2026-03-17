# ႫႠႰႧႪႼႤႰႠ — ქართული მართლწერის შემოწმება

**ႫႠႰႧႪႼႤႰႠ** არის ვებ-აპლიკაცია ქართული ტექსტების მართლწერის შემოწმებისთვის, აგებული Phoenix Framework-ზე (Elixir). მხარდაჭერა 993 589 სიტყვის ლექსიკონით, მორფოლოგიური ანალიზით და .docx ფაილების იმპორტ/ექსპორტით.

## ფუნქციონალი

- **რეალურ დროში შემოწმება** — ტექსტის შეყვანისას ავტომატური ანალიზი (ადაპტური დებაუნსი: 500 მწმ–2.5 წმ ტექსტის ზომის მიხედვით)
- **Overlay-ხაზგასმა** — შეცდომები მოინიშნება პირდაპირ ტექსტში წითელი ჩარჩოთი (mirror-overlay ტექნიკა — textarea+div, არა contenteditable)
- **Hover-მენიუ** — მაუსის მიახლოება შეცდომაზე გამოაჩენს dropdown-ს შემოთავაზებებით
- **ჩანაცვლება** — კლიკი შემოთავაზებაზე ცვლის სიტყვას პირდაპირ textarea-ში
- **ლექსიკონში დამატება** — "დაამატე ლექსიკონში" ამატებს სიტყვას ETS-ში და ინახავს `user_words.txt`-ში (გადარჩება სერვერის გადაქცევის შემდეგ)
- **სტატისტიკა** — სიტყვათა რაოდენობა, შეცდომები, სიზუსტე
- **ტიპოგრაფიის შემოწმება** — ორმაგი სფასები, ბრჭყალები, გრძელი ტირე და სხვ.
- **სტოპ-სიტყვები** — გამავსებელი სიტყვების აღმოჩენა
- **.docx გახსნა** — Word ფაილის ჩატვირთვა, ტექსტის ექსტრაქცია (fflate + DOMParser)
- **.docx შენახვა** — ტექსტის ექსპორტი სრულფასოვან Word ფაილად (fflate ZIP + Word XML)
- **გარე ლექსიკონი** — .txt ფაილის ჩატვირთვა სესიისთვის
- **მობილური** — ადაპტური ლეიაუტი (≤768px)

## ინტერფეისი

```
┌──────────────────────────────────────────────────────────────┐
│  Ⴋ ႫႠႰႧႪႼႤႰႠ   ავტო | გახსენი | დაიმახსოვრე | + ლექსიკონი │
│                                    გასუფთავება | შემოწმება  │
├──────────────────────────────┬───────────────────────────────┤
│  textarea (overlay mirror)   │  სტატისტიკა                  │
│  [ტექსტი შეცდომებით]        │  სიტყვები / შეცდომები / %    │
│                              │  ─────────────────────────── │
│  hover → dropdown:           │  შეცდომების სია              │
│  ┌─────────────────┐        │  [სიტყვა] [×2]               │
│  │ შეცდომა         │        │  [variant1] [variant2]        │
│  │ ─────────────── │        │                               │
│  │ variant1        │        │  ტიპოგრაფია                   │
│  │ variant2        │        │  სტოპ-სიტყვები                │
│  │ + ლექსიკონში    │        │                               │
│  └─────────────────┘        │                               │
├──────────────────────────────┴───────────────────────────────┤
│  სტატუსი                                        © 2025 2sco │
└──────────────────────────────────────────────────────────────┘
```

## ტექნოლოგიები

| ფენა | ტექნოლოგია |
|------|------------|
| Backend | Elixir 1.14+, Phoenix 1.7, Bandit HTTP |
| ლექსიკონი | ETS (142 285 სიტყვა, Hunspell ka_GE), GenServer |
| მორფოლოგია | სუფიქსების სტრიპინგი, ქართული ბრუნება |
| სუგესტიები | Levenshtein + ქართული ასოების კონფუზიის ცხრილი |
| Rate limiting | ETS-based, 30 req/min per IP |
| Frontend | Vanilla JS (ES2017), Tailwind CSS, Phoenix LiveView socket |
| .docx | fflate (ZIP), DOMParser (XML) |
| CORS | სრული, OPTIONS preflight |

## გაშვება

```bash
# 1. დამოკიდებულებები
mix deps.get
cd assets && npm install && cd ..

# 2. Assets-ის build
mix assets.build

# 3. სერვერი
mix phx.server
# → http://localhost:4000
```

### Production

```bash
MIX_ENV=prod mix do deps.get, compile, assets.deploy
SECRET_KEY_BASE=<key> PHX_HOST=example.com mix phx.server
```

### Docker

```bash
docker-compose up
```

## API

| Endpoint | Method | აღწერა |
|----------|--------|--------|
| `GET /` | GET | მთავარი გვერდი |
| `POST /api/check` | POST | ტექსტის შემოწმება (JSON) |
| `OPTIONS /api/check` | OPTIONS | CORS preflight |
| `POST /api/dictionary/add` | POST | სიტყვის დამატება ლექსიკონში |
| `OPTIONS /api/dictionary/add` | OPTIONS | CORS preflight |

### POST /api/check

```json
// Request
{ "text": "ქართული ტექსტი..." }

// Response
{
  "total_words": 42,
  "error_count": 3,
  "accuracy": 92.8,
  "errors": [
    { "word": "შეიყვანეთ", "count": 1, "suggestions": ["შეიყვანე", "შეიყვანება"] }
  ],
  "typography": [...],
  "stopwords": [...]
}
```

### POST /api/dictionary/add

```json
// Request
{ "word": "ახალისიტყვა" }

// Response
{ "ok": true, "word": "ახალისიტყვა" }
```

## არქიტექტურა

```
lib/
├── scheckerge/
│   ├── application.ex          OTP Application, Supervisor
│   ├── dictionary.ex           ETS ლექსიკონი + Levenshtein სუგესტიები
│   │                           + add_word/1 (ETS + user_words.txt)
│   ├── morphology.ex           ქართული მორფოლოგიური ანალიზატორი
│   └── rate_limiter_cleaner.ex Rate-limit ETS-ის გასუფთავება (5 წთ)
│
└── scheckerge_web/
    ├── router.ex               მარშრუტები
    ├── controllers/
    │   ├── page_controller.ex  GET /
    │   └── spell_controller.ex POST /api/check, POST /api/dictionary/add
    ├── plugs/
    │   └── rate_limiter.ex     30 req/min per IP
    └── components/layouts/
        ├── root.html.heex      HTML shell
        └── app.html.heex       Flash messages

assets/
├── js/app.js                   ~300 ხაზი: mirror overlay, tooltip, docx, auto-check
├── css/app.css                 მინიმალისტური დიზაინი (Georgian red accent)
└── package.json                fflate (ZIP/docx)

priv/static/dictionaris/
├── ge.txt                      993 589 სიტყვა (base dictionary)
└── user_words.txt              მომხმარებლის დამატებული სიტყვები (auto-created)
```

## Mirror Overlay ტექნიკა

contenteditable-ის ნაცვლად გამოყენებულია mirror-overlay:

```
┌─── editor-wrap (position: relative) ─────────────────┐
│  #mirror  (position: absolute, z-index: 2)           │
│           color: transparent                          │
│           pointer-events: none                        │
│           <mark> ← pointer-events: auto (hover!)     │
│                                                       │
│  #input   (position: absolute, z-index: 1)           │
│           background: transparent                     │
│           textarea — cursor, typing, scroll native    │
└───────────────────────────────────────────────────────┘
```

უპირატესობები: კურსორის მართვა ბრაუზერს აქვს გადაცემული, IME-თავსებადობა, undo/redo ნატიური, XSS-საფრთხე მინიმალური.

## ლექსიკონი

- **ge.txt** — 993 589 სიტყვა, ჩაიტვირთება ETS-ში სერვერის გაშვებისას (~200 ms)
- **user_words.txt** — მომხმარებლის სიტყვები, auto-append, ჩაიტვირთება სტარტზე
- **Morphology** — ვალიდური მოქნილი ფორმები: "სახლებში" → "სახლი" ✓
- **Levenshtein** — max distance 4, ადრეული გამოსვლა ოპტიმიზაციით
- **Confusion table** — ს↔შ, კ↔ქ, დ↔თ და სხვ. ფონეტიკური კანდიდატები

## ლიცენზია

MIT — © 2025 2sco
