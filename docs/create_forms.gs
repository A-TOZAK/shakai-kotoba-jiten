/**
 * 社会ことば辞典 フィードバックフォーム一括作成スクリプト
 * --------------------------------------------------------
 * 【使い方】
 * 1. Google Apps Script (https://script.google.com) を開く
 * 2. 新しいプロジェクトを作成して、このコードを貼り付ける
 * 3. createAllForms() を実行する
 * 4. ログに5つのフォームURLが出力されるので、コピーして保存する
 */

function createAllForms() {
  const forms = [
    createAddWordForm(),
    createViewLogForm(),
    createHelpfulForm(),
    createImageRequestForm(),
    createCorrectionForm(),
  ];

  Logger.log("=== フォーム作成完了 ===");
  forms.forEach(({ name, url, editUrl }) => {
    Logger.log(`\n【${name}】`);
    Logger.log(`  回答URL : ${url}`);
    Logger.log(`  編集URL : ${editUrl}`);
  });
  Logger.log("\n★ 上記のURLをコピーして、サイトの app.js に貼り付けてください。");
}

// -------------------------------------------------------
// ① 追加してほしい言葉
// -------------------------------------------------------
function createAddWordForm() {
  const form = FormApp.create("【社会ことば辞典】追加してほしい言葉");
  form.setDescription(
    "社会ことば辞典に追加してほしい言葉を教えてください。\n" +
    "送っていただいた内容は先生が確認し、辞典に追加していきます。"
  );
  form.setConfirmationMessage("送ってくれてありがとう！先生が確認して辞典に追加します。");
  form.setCollectEmail(false);

  // Q1: 追加してほしい言葉
  form.addTextItem()
    .setTitle("追加してほしい言葉を教えてください")
    .setHelpText("例：「げんかいなだ」「徳川家康」「産業革命」など")
    .setRequired(true);

  // Q2: 学年
  form.addMultipleChoiceItem()
    .setTitle("何年生ですか？")
    .setChoiceValues(["3年生", "4年生", "5年生", "6年生", "先生・大人", "その他"])
    .setRequired(true);

  // Q3: どんな場面で困ったか
  form.addParagraphTextItem()
    .setTitle("どんな場面でその言葉が出てきましたか？（任意）")
    .setHelpText("例：「社会の教科書のp.42」「先生が授業で言っていた」など");

  return {
    name: "① 追加してほしい言葉",
    url: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
  };
}

// -------------------------------------------------------
// ② 調べた記録
// -------------------------------------------------------
function createViewLogForm() {
  const form = FormApp.create("【社会ことば辞典】調べた記録");
  form.setDescription(
    "どの言葉を調べたか教えてください。\n" +
    "みんながよく調べる言葉が分かると、辞典をもっとよくするヒントになります。"
  );
  form.setConfirmationMessage("記録してくれてありがとう！");
  form.setCollectEmail(false);

  // Q1: 調べた言葉
  form.addTextItem()
    .setTitle("調べた言葉を教えてください")
    .setHelpText("例：「平野」「幕府」「工業地帯」など")
    .setRequired(true);

  // Q2: 学年
  form.addMultipleChoiceItem()
    .setTitle("何年生ですか？")
    .setChoiceValues(["3年生", "4年生", "5年生", "6年生", "先生・大人", "その他"])
    .setRequired(true);

  // Q3: 調べた場面
  form.addMultipleChoiceItem()
    .setTitle("どんな場面で調べましたか？")
    .setChoiceValues(["授業中", "宿題・家庭学習", "テスト勉強", "自分で気になって", "その他"])
    .setRequired(true);

  // Q4: 理解できたか
  form.addMultipleChoiceItem()
    .setTitle("説明を読んで、意味は分かりましたか？")
    .setChoiceValues(["よく分かった", "だいたい分かった", "あまり分からなかった", "全然分からなかった"])
    .setRequired(true);

  return {
    name: "② 調べた記録",
    url: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
  };
}

// -------------------------------------------------------
// ③ 役に立った
// -------------------------------------------------------
function createHelpfulForm() {
  const form = FormApp.create("【社会ことば辞典】役に立った");
  form.setDescription(
    "役に立った言葉を教えてください。\n" +
    "どの説明が分かりやすかったか知ることで、辞典をもっとよくすることができます。"
  );
  form.setConfirmationMessage("教えてくれてありがとう！これからも使ってね。");
  form.setCollectEmail(false);

  // Q1: 役に立った言葉
  form.addTextItem()
    .setTitle("役に立った言葉を教えてください")
    .setHelpText("例：「玄界棚」「筑紫平野」など")
    .setRequired(true);

  // Q2: 学年
  form.addMultipleChoiceItem()
    .setTitle("何年生ですか？")
    .setChoiceValues(["3年生", "4年生", "5年生", "6年生", "先生・大人", "その他"])
    .setRequired(true);

  // Q3: どう役に立ったか
  form.addMultipleChoiceItem()
    .setTitle("どのように役に立ちましたか？")
    .setChoiceValues([
      "テストで出てきて答えられた",
      "授業中に意味が分かった",
      "宿題が解けた",
      "例文が分かりやすかった",
      "その他",
    ])
    .setRequired(false);

  // Q4: 自由記述
  form.addParagraphTextItem()
    .setTitle("その他、コメントがあれば教えてください（任意）");

  return {
    name: "③ 役に立った",
    url: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
  };
}

// -------------------------------------------------------
// ④ 図解リクエスト
// -------------------------------------------------------
function createImageRequestForm() {
  const form = FormApp.create("【社会ことば辞典】図解リクエスト");
  form.setDescription(
    "「図や絵で説明してほしい！」という言葉を教えてください。\n" +
    "リクエストが多い言葉から図解を作っていきます。"
  );
  form.setConfirmationMessage("リクエストしてくれてありがとう！図解を作れるよう頑張ります。");
  form.setCollectEmail(false);

  // Q1: 図解してほしい言葉
  form.addTextItem()
    .setTitle("図や絵で解説してほしい言葉を教えてください")
    .setHelpText("例：「流通」「工業地帯」「幕府のしくみ」など")
    .setRequired(true);

  // Q2: 学年
  form.addMultipleChoiceItem()
    .setTitle("何年生ですか？")
    .setChoiceValues(["3年生", "4年生", "5年生", "6年生", "先生・大人", "その他"])
    .setRequired(true);

  // Q3: どんな図がほしいか
  form.addMultipleChoiceItem()
    .setTitle("どんな図があると分かりやすいですか？")
    .setChoiceValues([
      "地図・位置が分かる図",
      "流れ・順番が分かる図（フローチャートなど）",
      "くらべる表・図",
      "写真・イラスト",
      "どんな図でもいい",
    ])
    .setRequired(false);

  // Q4: 自由記述
  form.addParagraphTextItem()
    .setTitle("こんな図があると分かりやすい！というアイデアがあれば（任意）");

  return {
    name: "④ 図解リクエスト",
    url: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
  };
}

// -------------------------------------------------------
// ⑤ 修正提案
// -------------------------------------------------------
function createCorrectionForm() {
  const form = FormApp.create("【社会ことば辞典】修正提案");
  form.setDescription(
    "説明が間違っている・分かりにくいと思った言葉を教えてください。\n" +
    "先生・大人の方向けのフォームですが、小学生からの意見も歓迎です。"
  );
  form.setConfirmationMessage("提案してくれてありがとうございます！確認して修正します。");
  form.setCollectEmail(false);

  // Q1: 修正してほしい言葉
  form.addTextItem()
    .setTitle("修正してほしい言葉を教えてください")
    .setRequired(true);

  // Q2: 学年（対象）
  form.addMultipleChoiceItem()
    .setTitle("何年生向けの説明ですか？")
    .setChoiceValues(["3年生", "4年生", "5年生", "6年生", "先生・大人", "その他・分からない"])
    .setRequired(false);

  // Q3: 問題の内容
  form.addCheckboxItem()
    .setTitle("どんな問題がありますか？（複数選択可）")
    .setChoiceValues([
      "説明の内容が間違っている",
      "説明が分かりにくい",
      "例文が分かりにくい・不自然",
      "読み仮名（よみがな）が間違っている",
      "関連語が不足・間違っている",
      "その他",
    ])
    .setRequired(true);

  // Q4: 現在の説明の問題点
  form.addParagraphTextItem()
    .setTitle("どこが間違っている・分かりにくいですか？")
    .setRequired(true);

  // Q5: 修正案
  form.addParagraphTextItem()
    .setTitle("こう直してほしい、という案があれば教えてください（任意）");

  return {
    name: "⑤ 修正提案",
    url: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
  };
}
