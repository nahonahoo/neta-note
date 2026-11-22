/*
  ┌──────────────────────────────────────────────┐
  │  NETA NOTE ─ 観賞記録データ                     │
  │  新しく観たら reviews の最後に1組ずつ足すだけで      │
  │  サイト全体（ランキング・表・分布）に反映されます。    │
  └──────────────────────────────────────────────┘

  name   : 組名
  event  : どこで観たか（大会名・ライブ名など）。空でもOK
  date   : 観た日 "YYYY-MM-DD"。空でもOK
  scores : 1〜5（0.5刻みOK）
           omoshiro = おもしろ / warai = 笑い / rikai = 理解度 / ochi = オチ
  grade  : 全体評価  "A+" | "A-" | "B+" | "B-" | "C"
  notes  : メモ（いくつでも）
  tags   : タグ（いくつでも）。例: "へんしゅう"
  result : 実際の結果（任意）。例: "通過" / "敗退"

  ※「要確認」コメントは手書きメモの読み取りが怪しい箇所です。
*/
window.NETA_NOTE = {
  updated: "2026-11-23",
  reviews: [
    {
      name: "ゼロカラン", // 要確認：「ビロカラン」にも見える
      event: "",
      date: "",
      scores: { omoshiro: 4, warai: 4, rikai: 3, ochi: 2 }, // 要確認：おもしろ・笑いは「③に斜線→④」を4と解釈
      grade: "B-",
      notes: ["下品", "たいがの動きがちょうどいい", "スピードがちょっとおそい？（テンポ感）", "てんかいがおいつけない？"],
      tags: ["へんしゅう"],
    },
    {
      name: "金魚番長",
      event: "",
      date: "",
      scores: { omoshiro: 5, warai: 5, rikai: 5, ochi: 4 },
      grade: "A+",
      notes: ["スピードちょうどいい！", "めっちゃこってる", "最初弱かった→後から盛りあがる"],
      tags: [],
    },
    {
      name: "フースーヤ",
      event: "",
      date: "",
      scores: { omoshiro: 4, warai: 5, rikai: 3, ochi: 4 },
      grade: "A-",
      notes: ["最初から良き", "テンポさいこう", "楽しい"],
      tags: ["へんしゅう"],
    },
    // ── ノートの緑の区切り線 ──
    {
      name: "ピュート",
      event: "",
      date: "",
      scores: { omoshiro: 4, warai: 2, rikai: 3, ochi: 4 },
      grade: "B-",
      notes: ["コントすぎる", "音が多い", "てんかいは好き"],
      tags: [],
    },
    {
      name: "軟水",
      event: "",
      date: "",
      scores: { omoshiro: 3.5, warai: 3, rikai: 4, ochi: 3 }, // おもしろは③④両方に丸 → 3.5
      grade: "A-",
      notes: ["ゆるい", "◯◯がおもしろ", "ツッコミとボケいれ違った", "つるまるコント", "ネタ（話）内容好き"], // 要確認：「◯◯がおもしろ」の最初の語が読めず
      tags: [],
    },
    {
      name: "バリカタ友情飯",
      event: "",
      date: "",
      scores: { omoshiro: 5, warai: 3, rikai: 4, ochi: 4 },
      grade: "B+",
      notes: ["こうぞうがすごい", "すごいが勝っちゃった", "なんかで評価されてほしい"],
      tags: [],
    },
    {
      name: "コットン",
      event: "",
      date: "",
      scores: { omoshiro: 4, warai: 4, rikai: 5, ochi: 5 },
      grade: "A+",
      notes: ["きょんツッコミ良き", "血まよってる感が良い"],
      tags: ["へんしゅう"],
    },
    {
      name: "ヨネダ2000",
      event: "",
      date: "",
      scores: { omoshiro: 5, warai: 5, rikai: 2, ochi: 5 }, // 要確認：理解度2の横の書き込み（「〜すぎて」）が読めず
      grade: "A+",
      notes: ["ヨネダワールド", "何でおとされたん？"],
      tags: [],
    },
    // ── ノートの緑の区切り線 ──
    {
      name: "エバース",
      event: "",
      date: "",
      scores: { omoshiro: 4, warai: 4, rikai: 5, ochi: 3 },
      grade: "A-",
      notes: ["かしこい漫才だ…"],
      tags: [],
    },
    {
      name: "ドンデコルテ",
      event: "",
      date: "",
      scores: { omoshiro: 4, warai: 4, rikai: 5, ochi: 4 },
      grade: "A-",
      notes: ["自ぎゃく良き"],
      tags: [],
    },
    {
      name: "センチネル",
      event: "",
      date: "",
      scores: { omoshiro: 4, warai: 4, rikai: 5, ochi: 4 },
      grade: "A-",
      notes: ["しっかり良いかも！"],
      tags: [],
    },
    {
      name: "相性はいいよね",
      event: "",
      date: "",
      scores: { omoshiro: 3, warai: 3, rikai: 5, ochi: 2 },
      grade: "B-",
      notes: ["クイズ楽しい", "マウントかぶりが…"],
      tags: [],
    },
    {
      name: "ツモリュウ",
      event: "",
      date: "",
      scores: { omoshiro: 4, warai: 3, rikai: 3, ochi: 4 },
      grade: "B-",
      notes: ["大阪すぎｗｗ", "キモｗｗ"],
      tags: [],
    },
    {
      name: "男性ブランコ",
      event: "",
      date: "",
      scores: { omoshiro: 4.5, warai: 4, rikai: 4, ochi: 5 }, // おもしろは④⑤両方に丸 → 4.5
      grade: "A-",
      notes: ["ほのぼの"],
      tags: [],
    },
    {
      name: "滝音",
      event: "",
      date: "",
      scores: { omoshiro: 4, warai: 4, rikai: 5, ochi: 5 },
      grade: "A-",
      notes: ["美しい"],
      tags: [],
    },
    {
      name: "ミカボ",
      event: "",
      date: "",
      scores: { omoshiro: 4, warai: 3, rikai: 5, ochi: 3 },
      grade: "B+",
      notes: ["クイズかぶり"],
      tags: [],
    },
  ],
};
