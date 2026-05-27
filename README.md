# 社会ことば辞典

小学校3〜6年生の社会科用語を、子ども向けのやさしい説明・例文・関連語・社会科の見方考え方タグで調べられるGitHub Pages向け静的サイトです。

子どもの「分からない」「図で見たい」「役に立った」をGitHub Issuesに集め、教材改善の声をサイト上で見える化する設計です。

## 初期方針

- サイト名: 社会ことば辞典
- 公開予定リポジトリ: `shakai-kotoba-jiten`
- 対象: 小学校3〜6年生社会
- 説明文: 3〜4年生にも読めるやさしい文章
- 第2版用語: 3〜6年社会の主要単元・教科書PDF由来の重要語から389語
- 図解: 全用語に最初から入れず、図解リクエスト30件以上を候補にする
- 追加希望・図解希望・役立った・調べた記録: サイト内フォームからGitHub Issuesへ送る
- 集計: GitHub Issuesを読み込み、ランキングへ反映する

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
    └── github-issues-workflow.md
```

## 用語の追加

`data/terms.js` の `termRows` に追加します。

```js
["unique-id", "消防署", "しょうぼうしょ", "し", 3, "火事からまちを守る", "安全", "意味", "例文", "関連語1|関連語2", "people-work|life-connection", "根拠"]
```

## GitHub Pages

リポジトリ作成後、GitHub Pagesの公開元を `main` ブランチの root に設定すると公開できます。

## GitHub Issues運用

- サイト内フォームからIssue作成画面を開く
- Issue本文に `action`, `termId`, `term`, `grade` を記録する
- サイトはGitHub Issuesを読み込み、該当termIdの件数を集計する
- 図解リクエスト30件以上の用語を図解作成候補にする

詳しくは [docs/github-issues-workflow.md](docs/github-issues-workflow.md) を参照してください。
