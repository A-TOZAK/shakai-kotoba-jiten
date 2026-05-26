# Google Apps Script 連携メモ

GitHub Pagesは静的サイトなので、閲覧数やボタン押下を保存するには外部の保存先が必要です。初期運用では、Google Apps Scriptでスプレッドシートに記録する形が扱いやすいです。

## 記録する列

```text
timestamp / termId / term / grade / unit / action
```

`action` は次を想定しています。

```text
view / helpful / image_request / add_request
```

## Apps Script例

```js
const SHEET_NAME = "logs";

function doPost(e) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.termId || "",
    data.term || "",
    data.grade || "",
    data.unit || "",
    data.action || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## サイト側の設定

`data/terms.js` の `trackingEndpoint` に、WebアプリとしてデプロイしたApps ScriptのURLを設定します。

```js
trackingEndpoint: "https://script.google.com/macros/s/XXXXX/exec"
```

## 集計の考え方

- `view`: 用語詳細を開いた回数
- `helpful`: 「役に立った」ボタン
- `image_request`: 「図で解説してほしい」ボタン
- `add_request`: 追加希望

図解作成候補は、`image_request` が30件以上の用語から選びます。
