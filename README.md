# 社会ことば辞典

小学校3〜6年生の社会科用語を、子ども向けのやさしい説明・例文・関連語・社会科の見方考え方タグで調べられるGitHub Pages向け静的サイトです。

## 初期方針

- サイト名: 社会ことば辞典
- 公開予定リポジトリ: `shakai-kotoba-jiten`
- 対象: 小学校3〜6年生社会
- 説明文: 3〜4年生にも読めるやさしい文章
- 図解: 全用語に最初から入れず、図解リクエスト30件以上を候補にする
- 追加希望・図解希望: Googleフォーム連携
- 閲覧・役立った・図解希望: Google Apps Scriptとスプレッドシートで集計する想定

## ファイル構成

```text
.
├── index.html
├── assets/
│   ├── app.js
│   └── styles.css
├── data/
│   └── terms.js
└── docs/
    └── google-apps-script.md
```

## 用語の追加

`data/terms.js` の `terms` 配列に追加します。

```js
{
  id: "unique-id",
  term: "消防署",
  reading: "しょうぼうしょ",
  initial: "し",
  grade: 3,
  unit: "火事からまちを守る",
  category: "安全",
  meaning: "火事や事故のときに、人を助けたり火を消したりする仕事をする場所です。",
  example: "消防署では、すぐに出動できるように毎日訓練をしています。",
  relatedTerms: ["消防士", "消防自動車", "救急車"],
  thinkingTags: ["people-work", "life-connection", "idea-effort"],
  viewCount: 0,
  helpfulCount: 0,
  imageRequestCount: 0,
  source: ["小3年間指導計画"],
  status: "draft"
}
```

## GitHub Pages

リポジトリ作成後、GitHub Pagesの公開元を `main` ブランチの root に設定すると公開できます。

## 今後の拡張

- GoogleフォームURLの差し替え
- Google Apps Scriptの計測エンドポイント設定
- スプレッドシート集計CSV/JSONの読み込み
- 図解リクエスト30件以上の用語に画像を追加
- 用語レビュー状態の管理
