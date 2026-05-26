# GitHub Issuesで完結する投稿・集計フロー

このサイトはGoogleフォームやスプレッドシートを使わず、GitHub PagesとGitHub Issuesだけで教材改善の声を集めます。

## できること

- 追加してほしい言葉を送る
- 用語ごとに「調べた記録」を送る
- 「役に立った」を送る
- 「図で解説してほしい」を送る
- 修正提案を送る
- GitHub Issuesを読み込んで、ランキングに反映する

## 送信の流れ

1. 子どもや先生がサイト内フォームに入力する
2. GitHubのIssue作成画面が開く
3. 内容を確認して投稿する
4. サイトが公開Issueを読み込み、用語IDごとに件数を集計する

## Issue本文の形式

```text
[shakai-kotoba-jiten]

action: image_request
termId: shoubousho
term: 消防署
grade: 3
unit: 火事からまちを守る

comment:
ポンプ車のしくみを図で見たい。
```

## actionの種類

```text
view_log      調べた記録
helpful       役に立った
image_request 図解希望
add_word      追加希望
correction    修正提案
```

## 注意点

GitHubだけで完結する場合、サイトから自動でデータを書き込むことはできません。安全のため、利用者がGitHubのIssue作成画面で投稿を確定する形にしています。

子どもがGitHubアカウントを持たない場合は、先生用端末でまとめて投稿する運用、または将来的に別バックエンドを使う運用を検討してください。

## 図解作成のしきい値

`data/terms.js` の `imageRequestThreshold` で設定します。現在は30件です。
