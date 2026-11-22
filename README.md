# NETA NOTE｜お笑い観賞ノート

観たネタを「おもしろ・笑い・理解度・オチ」の4項目（1〜5）と全体評価（C / B- / B+ / A- / A+）で記録するWebサイト。

## ファイル

| ファイル | 中身 |
|---|---|
| `data/reviews.js` | **記録データ。追加するのはここだけ** |
| `index.html` | ページの骨組み |
| `css/style.css` | デザイン |
| `js/app.js` | 表示・並び替え・アニメーション |
| `assets/` | アイコン |
| `images/` | 元のメモ写真（公開しない。`.gitignore` 済み） |

## 記録の追加

`data/reviews.js` の `reviews` の最後に1組ぶん足して、`updated` の日付を更新する。

```js
{
  name: "組名",
  event: "大会名・ライブ名",   // 空でもOK
  date: "2026-12-01",          // 空でもOK
  scores: { omoshiro: 4, warai: 3.5, rikai: 5, ochi: 4 },  // 1〜5、0.5刻みOK
  grade: "A-",                 // "A+" "A-" "B+" "B-" "C"
  notes: ["メモ1", "メモ2"],
  tags: ["初見"],              // なくてもOK
  result: "通過",              // なくてもOK
},
```

メモの写真を Claude に渡して「追加して」と頼んでもOK。

## 手元で見る

`index.html` をダブルクリックでブラウザが開く（ネット接続は必要：フォントとアニメーション用ライブラリを読み込むため）。

## 使っているもの

- [GSAP](https://gsap.com/)（ScrollTrigger / Flip）… アニメーション
- [Lenis](https://lenis.darkroom.engineering/) … なめらかスクロール
- Google Fonts：Unbounded / Zen Kaku Gothic New / Klee One
