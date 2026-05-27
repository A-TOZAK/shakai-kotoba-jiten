#!/usr/bin/env python3
"""Build a broad candidate term bank from the 3rd-6th grade textbook PDFs.

The output is intentionally generous. It separates explicit textbook keywords
and index terms from heuristic full-text candidates, so the list can be pruned
without losing the textbook-backed core vocabulary.
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEXT_DIR = ROOT / "artifacts" / "textbook-text"
OUT_DIR = ROOT / "artifacts" / "textbook-analysis"
TERMS_JS = ROOT / "data" / "terms.js"

GRADE_TEXTS = {
    3: TEXT_DIR / "r6shakai3_ruby.txt",
    4: TEXT_DIR / "r6shakai4_ruby.txt",
    5: TEXT_DIR / "r6shakai5_ruby.txt",
    6: TEXT_DIR / "r6shakai6_ruby.txt",
}

ALIASES = {
    "公共しせつ": "公共施設",
    "消防せつび": "消防設備",
    "下水処理しせつ": "下水処理施設",
    "うめ立て処分場": "埋立処分場",
    "ぜいきん": "税金",
    "ねだん": "値段",
    "えいせい": "衛生",
    "新せんさ": "新鮮さ",
    "点けん・くんれん": "点検・訓練",
    "水のじゅんかん": "水の循環",
    "昔からのぎじゅつ": "昔からの技術",
    "さいばい漁業": "栽培漁業",
    "3R": "3R",
    "３R": "3R",
}


EXPLICIT_KEYWORDS: dict[int, list[str]] = {
    3: [
        "方位", "公共しせつ", "公共施設", "土地の様子", "交通の様子", "地形", "売り上げ",
        "ねだん", "値段", "品ぞろえ", "新せんさ", "新鮮さ", "べんりさ", "便利さ", "サービス",
        "品質", "原料", "えいせい", "衛生", "出荷", "地産地消", "作物カレンダー", "土づくり",
        "点けん・くんれん", "点検・訓練", "119番のしくみ", "通信指令室", "消防せつび",
        "消防設備", "消防団", "110番の通報", "法やきまり", "こども110番の家", "年号",
        "年表", "人口", "ぜいきん", "税金",
    ],
    4: [
        "都道府県", "地形", "土地利用", "産業", "交通", "県庁所在地", "ごみの分別",
        "清掃工場", "うめ立て処分場", "埋立処分場", "資源", "リサイクル", "3R", "３R",
        "浄水場", "ダム", "水力発電", "水源の森林", "地域をこえた人々の協力",
        "下水処理しせつ", "下水処理施設", "水のじゅんかん", "水の循環",
        "過去に起こった地震", "過去に起こった水害", "防災セット", "地域防災計画",
        "関係機関の協力", "ハザードマップ", "防災倉庫", "水防倉庫", "年中行事",
        "伝統行事", "文化財", "伝統芸能", "新田開発", "人々の願い", "工事のくふう",
        "苦労や努力", "昔からのぎじゅつ", "昔からの技術", "伝統的工芸品",
        "焼き物に使う材料", "史跡", "観光", "開発と保存", "自然環境", "特産物",
        "国際交流", "姉妹都市", "友好都市", "国旗",
    ],
    5: [
        "IC（集積回路）", "IC", "集積回路", "アイヌの人たち", "家のつくり", "AI",
        "人工知能", "エコタウン", "エネルギー", "海外生産", "開拓", "関連工場",
        "季節風", "減災", "公害防止条例", "公共事業", "工業地帯", "工業地域",
        "耕地整理", "個人情報", "国旗", "米の消費量を増やす試み", "さいばい漁業",
        "栽培漁業", "山脈", "山地", "自然災害", "持続可能な水産業", "持続可能な社会",
        "自動運転車", "ジャスト・イン・タイム方式", "住民運動", "情報", "情報通信技術",
        "ICT", "情報の流出", "食料自給率", "新型コロナウイルス感染症", "人工林",
        "森林の育成と活用", "水産資源", "生産調整", "世界自然遺産", "せり", "尖閣諸島",
        "ソーシャルメディア", "大量の情報", "データ", "台風", "竹島", "地球温暖化",
        "地産地消", "治水", "中小工場", "大工場", "梅雨", "天然資源", "特産品",
        "内容のチェック", "確認", "ニーズ", "200海里", "バイオマス", "排他的経済水域",
        "ハザードマップ", "東日本大震災", "品種改良", "平野", "貿易", "防災",
        "北方領土", "マスメディア", "水あげ", "水の管理", "育てる漁業", "メディア",
        "輸送手段", "ユニバーサルデザイン", "養殖業", "四大公害病", "ライン", "酪農",
        "リサイクル", "流通", "領海", "領土", "林業", "レアメタル", "ロボット",
    ],
    6: [
        "日本国憲法", "国民主権", "基本的人権の尊重", "平和主義", "権利", "義務",
        "選挙", "国会", "内閣", "裁判所", "三権分立", "立法", "行政", "司法",
        "法律", "政治", "税金", "予算", "地方公共団体", "条例", "福祉", "社会保障",
        "民主主義", "国際関係", "国際協力", "国際連合", "国連", "国際連盟", "難民",
        "地球規模の課題", "持続可能な開発目標", "SDGs", "核兵器", "原子爆弾",
        "平和記念式典", "原爆ドーム", "沖縄戦", "太平洋戦争", "第二次世界大戦",
        "満州事変", "日中戦争", "日清戦争", "日露戦争", "関東大震災", "東京大空襲",
        "高度経済成長", "公害", "四大公害病", "足尾銅山鉱毒事件", "公害防止条例",
        "縄文時代", "弥生時代", "古墳時代", "飛鳥時代", "奈良時代", "平安時代",
        "鎌倉時代", "室町時代", "戦国時代", "安土桃山時代", "江戸時代", "明治時代",
        "大正時代", "昭和時代", "平成時代", "令和時代", "縄文土器", "弥生土器",
        "竪穴住居", "米づくり", "水田", "むら", "くに", "大王", "豪族", "古墳",
        "前方後円墳", "はにわ", "邪馬台国", "卑弥呼", "大和朝廷", "大和政権",
        "大陸の文化", "渡来人", "漢字", "仏教", "聖徳太子", "厩戸王", "冠位十二階",
        "十七条の憲法", "遣隋使", "小野妹子", "大化の改新", "中大兄皇子", "中臣鎌足",
        "藤原鎌足", "天智天皇", "律令", "平城京", "東大寺", "大仏", "聖武天皇",
        "正倉院", "鑑真", "唐招提寺", "遣唐使", "平安京", "かな文字", "国風文化",
        "寝殿造", "大和絵", "源氏物語", "枕草子", "藤原道長", "紫式部", "清少納言",
        "武士", "平氏", "源氏", "平清盛", "源頼朝", "源義経", "鎌倉幕府", "御家人",
        "ご恩と奉公", "執権", "北条政子", "北条時宗", "元との戦い", "博多湾の防塁",
        "室町幕府", "守護", "守護大名", "足利義満", "足利義政", "金閣", "銀閣",
        "書院造", "水墨画", "雪舟", "能", "狂言", "茶の湯", "生け花", "戦国大名",
        "全国統一", "織田信長", "豊臣秀吉", "徳川家康", "長篠の戦い", "鉄砲",
        "楽市・楽座", "検地", "刀狩", "関ヶ原の戦い", "江戸幕府", "大名", "藩",
        "武家諸法度", "参勤交代", "五人組", "年貢", "百姓", "百姓一揆", "新田開発",
        "商品作物", "五街道", "江戸城", "鎖国", "出島", "キリスト教", "ザビエル",
        "島原・天草一揆", "天草四郎", "朝鮮通信使", "琉球王国", "アイヌの人たち",
        "蘭学", "解体新書", "杉田玄白", "前野良沢", "国学", "本居宣長", "儒学",
        "寺子屋", "藩校", "歌舞伎", "人形浄瑠璃", "浮世絵", "歌川広重", "葛飾北斎",
        "東海道五十三次", "近松門左衛門", "松尾芭蕉", "伊能忠敬", "ペリー",
        "日米和親条約", "日米修好通商条約", "開国", "関税自主権", "治外法権",
        "大政奉還", "明治維新", "五か条の御誓文", "版籍奉還", "廃藩置県", "殖産興業",
        "富国強兵", "徴兵令", "地租改正", "文明開化", "福沢諭吉", "大日本帝国憲法",
        "帝国議会", "条約改正", "自由民権運動", "板垣退助", "大隈重信", "伊藤博文",
        "陸奥宗光", "小村寿太郎", "ノルマントン号事件", "足尾銅山鉱毒事件", "田中正造",
        "渋沢栄一", "富岡製糸場", "八幡製鉄所", "植民地", "普通選挙", "治安維持法",
        "全国水平社", "渋染一揆", "解放令", "平塚らいてう", "与謝野晶子", "新渡戸稲造",
        "野口英世", "北里柴三郎", "志賀潔", "東京オリンピック・パラリンピック",
        "日本町", "朝鮮（韓国）併合", "竹島", "尖閣諸島", "北方領土",
    ],
}

LEARNING_TERMS = [
    "つかむ", "調べる", "まとめる", "生かす", "見方・考え方", "社会科の見方・考え方",
    "場所や広がり", "時間や変化", "人々の工夫や関わり", "つながり", "関連づける",
    "総合してとらえる", "選択・判断", "予想", "学習問題", "学習計画", "資料",
    "資料を見比べる", "資料から読み取る", "資料を関連づける", "問い", "疑問",
    "気づき", "話し合い", "意見", "自分の考え", "根拠", "理由", "説明",
    "発表", "伝え合う", "ふり返り", "観察", "見学", "聞き取り", "ききとり調査",
    "インタビュー", "アンケート", "集計", "記録", "メモ", "ノート", "見出し",
    "キーワード", "かじょう書き", "カード", "ふせん", "表", "グラフ", "棒グラフ",
    "折れ線グラフ", "円グラフ", "帯グラフ", "地図", "白地図", "地図帳", "さくいん",
    "地球儀", "等高線", "縮尺", "方位", "八方位", "四方位", "凡例", "地図記号",
    "分布", "比較", "分類", "共通点", "相違点", "関係図", "しくみ図", "年表",
    "歴史年表", "想像図", "画像資料", "写真資料", "絵巻", "屏風絵", "風刺画",
    "順位づけ", "ランキング", "両面から考える", "二つの立場から考える",
    "三つの面から考える", "リーフレット", "新聞", "意見文", "プレゼンテーション",
    "プレゼンテーションソフト", "デジタル紙しばい", "ガイドマップ", "安全マップ",
    "インターネット", "ウェブサイト", "二次元コード", "まなびリンク", "タブレット型コンピューター",
    "オンラインインタビュー", "情報の確かさ", "個人情報", "許可", "撮影", "録画",
]

UNIT_TERMS = [
    "まちの様子", "市の様子", "店ではたらく人と仕事", "工場ではたらく人と仕事",
    "農家の仕事", "火事からまちを守る", "事故や事件からまちを守る", "かわる道具とくらし",
    "市のうつりかわり", "県の地図を広げて", "ごみはどこへ", "水はどこから",
    "自然災害にそなえるまちづくり", "地域で受けつがれてきたもの", "昔から今へと続くまちづくり",
    "国際交流がさかんなまちづくり", "世界の中の日本の国土", "国土の気候と地形",
    "自然条件と人々のくらし", "米づくりのさかんな地域", "水産業のさかんな地域",
    "これからの食料生産", "自動車の生産にはげむ人々", "日本の工業生産と貿易・運輸",
    "日本の工業生産の今と未来", "情報を伝える人々とわたしたち",
    "くらしと産業を変える情報通信技術", "自然災害とともに生きる", "森林とともに生きる",
    "環境をともに守る", "憲法とわたしたちの暮らし", "わたしたちの暮らしを支える政治",
    "国づくりへの歩み", "大陸に学んだ国づくり", "武士の政治が始まる", "室町文化と力をつける人々",
    "全国統一への動き", "幕府の政治と人々の暮らし", "新しい文化と学問",
    "明治の新しい国づくり", "近代国家を目ざして", "戦争と人々の暮らし",
    "平和で豊かな暮らしを目ざして", "日本とつながりの深い国々", "地球規模の課題の解決と国際協力",
]


NOISE_SUBSTRINGS = [
    "ページ", "教科書", "学習して", "してください", "しましょう", "できます", "ました",
    "ください", "わかった", "考えよう", "見てみよう", "使って", "つくって", "読み取る",
    "調べよう", "まとめよう", "話し合おう", "つなげよう", "ふり返ろう", "わたしたち",
    "ひろと", "さくら", "あおい", "つむぎ", "ゆうま", "ミゲル", "教育出版", "令和",
    "年月現在", "写真提供", "資料提供", "注目して", "学んだこと", "使った見方",
    "この時間の問いつかむ", "つかむこの時間の問い", "学習問題につい", "調べてみよう",
    "調べること", "調べたことを", "学習問題について", "学習問題をつく",
    "などに書こう", "して出す", "出す", "できます", "できる", "されている",
]

PHRASE_MARKERS = (
    "を", "が", "へ", "だろう", "でしょう", "ましょう", "ください", "して",
    "した", "する", "され", "でき", "あります", "います", "考えよう", "調べよう",
    "まとめよう", "見てみよう", "話し合おう", "書き表そう", "さんの話",
)

DROP_EXACT = {
    "社会", "社会科", "学習", "情報", "利用", "記録", "資料", "写真", "動画", "意味",
    "場所", "様子", "人々", "地域", "日本", "世界", "学校", "先生", "自分", "考え",
    "仕事", "暮らし", "くらし", "まち", "市", "県", "国", "年", "月", "日", "人",
    "もの", "こと", "ところ", "ため", "ようす", "くふう", "わけ", "まとめ", "問題",
    "調べ", "調べて", "考える", "を考え", "次に", "多く", "多くの", "多くの人",
    "大き", "広い", "中で", "以上", "他に", "一部", "一方", "現在", "当時", "その後",
    "特に", "新しい", "日本の", "日本は", "日本では", "市の", "県の", "国や",
    "の様子", "の学", "人々の", "人々は", "人たちは", "自分の", "自分たちの",
    "取り組みを", "協力して", "が行われ", "年に", "インター", "コン", "アイ",
    "km", "zu", "ai", "byoin", "yuki", "万人", "その他", "平成", "昭和", "(平成",
    "(昭和", "昔から", "調べ方", "道具", "道路", "鉄道", "野菜", "明治", "消費",
}

KEEP_IF_ALL_KANA = {
    "つかむ", "調べる", "まとめる", "生かす", "ねだん", "べんりさ", "えいせい",
    "せり", "むら", "くに", "くらし", "まちづくり",
}

TERM_SUFFIXES = (
    "時代", "幕府", "政権", "朝廷", "憲法", "条約", "制度", "法", "令", "条例", "政治",
    "戦争", "事変", "戦い", "一揆", "運動", "改革", "改新", "維新", "文化", "工業",
    "産業", "農業", "漁業", "林業", "水産業", "工場", "市場", "港", "空港", "交通",
    "地帯", "地域", "地形", "平野", "山地", "山脈", "川", "海", "島", "半島", "諸島",
    "領土", "領海", "水域", "資源", "情報", "技術", "通信", "災害", "防災", "減災",
    "環境", "公害", "権", "義務", "権利", "議会", "選挙", "予算", "税", "福祉",
    "世界遺産", "文化財", "遺跡", "古墳", "土器", "住居", "寺", "城", "神社", "大仏",
)

TERM_CONTAINS = (
    "国際", "公共", "持続可能", "地球", "自然", "水", "森林", "食料", "米", "作物",
    "消費", "生産", "輸送", "貿易", "自動車", "ロボット", "メディア", "インターネット",
    "データ", "地図", "グラフ", "資料", "考え方", "見方", "学習問題", "問題", "課題",
    "人権", "平和", "戦争", "憲法", "天皇", "武士", "大名", "条約", "幕府",
)


@dataclass
class Candidate:
    term: str
    grades: set[int] = field(default_factory=set)
    pages: dict[int, set[int]] = field(default_factory=lambda: defaultdict(set))
    sources: set[str] = field(default_factory=set)
    count: int = 0
    existing: bool = False


def compact(value: str) -> str:
    value = value.replace("　", " ")
    value = re.sub(r"\s+", "", value)
    value = value.replace("Ⅰ", "I").replace("Ａ", "A").replace("Ｃ", "C")
    value = value.replace("（", "(").replace("）", ")")
    value = value.replace("，", "、")
    return value


def display_term(value: str) -> str:
    value = compact(value)
    value = value.replace("3R", "3R").replace("３R", "3R")
    return value


def has_semantic_char(value: str) -> bool:
    return bool(re.search(r"[一-龯々〆ヵヶァ-ヴーA-Za-z0-9０-９]", value))


def is_all_kana(value: str) -> bool:
    return bool(re.fullmatch(r"[ぁ-んー]+", value))


def clean_chunk(value: str) -> str:
    value = display_term(value)
    value = value.strip("・,、。！？!?「」『』[]【】<>〈〉:：/／")
    value = re.sub(r"^[0-9０-９]+", "", value)
    value = re.sub(r"[0-9０-９]+$", "", value)
    value = ALIASES.get(value, value)
    return value


def load_existing_terms() -> tuple[set[str], dict[str, str]]:
    text = TERMS_JS.read_text(encoding="utf-8")
    existing = {}
    row_re = re.compile(r'\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(\d+)')
    for match in row_re.finditer(text):
        term = match.group(2)
        reading = match.group(3)
        existing[compact(term)] = term
        existing[compact(reading)] = term
    for alias, canonical in ALIASES.items():
        if compact(canonical) in existing:
            existing[compact(alias)] = existing[compact(canonical)]
    return set(existing.keys()), existing


def load_pages() -> dict[int, list[str]]:
    pages: dict[int, list[str]] = {}
    for grade, path in GRADE_TEXTS.items():
        text = path.read_text(encoding="utf-8", errors="ignore")
        raw_pages = text.split("\f")
        normalized = []
        for page in raw_pages:
            lines = []
            for line in page.splitlines():
                line = line.strip()
                if not line:
                    continue
                line = re.sub(r"(?<=[ぁ-んァ-ヴー一-龯々〆ヵヶA-Za-z0-9０-９])\s+(?=[ぁ-んァ-ヴー一-龯々〆ヵヶA-Za-z0-9０-９])", "", line)
                lines.append(line)
            normalized.append("\n".join(lines))
        pages[grade] = normalized
    return pages


def add_candidate(
    bank: dict[str, Candidate],
    term: str,
    grade: int | None,
    source: str,
    page: int | None = None,
    count: int = 1,
) -> None:
    term = clean_chunk(term)
    if not term:
        return
    key = compact(term)
    if not key or len(key) < 2:
        return
    cand = bank.setdefault(key, Candidate(term=term))
    if grade:
        cand.grades.add(grade)
        if page:
            cand.pages[grade].add(page)
    cand.sources.add(source)
    cand.count += count


def should_keep_auto(term: str, count: int, page_count: int) -> bool:
    term = clean_chunk(term)
    if not term:
        return False
    key = compact(term)
    if len(key) < 2 or len(key) > 28:
        return False
    if key in DROP_EXACT:
        return False
    if re.fullmatch(r"[A-Za-z]{1,3}", key) and key not in {"AI", "IC", "ICT"}:
        return False
    if key[0] in "のをがにはもとでへ" or key[-1] in "のをがにはもとでへ":
        return False
    if any(noise in key for noise in NOISE_SUBSTRINGS):
        return False
    if re.fullmatch(r"[0-9０-９]+", key):
        return False
    if is_all_kana(key) and key not in KEEP_IF_ALL_KANA:
        return False
    if any(marker in key for marker in PHRASE_MARKERS):
        return False
    if re.search(r"[ぁ-ん]{8,}", key) and not any(x in key for x in TERM_CONTAINS):
        return False
    if not has_semantic_char(key):
        return False
    if count >= 3 and page_count >= 2:
        return True
    if count >= 2 and (key.endswith(TERM_SUFFIXES) or any(x in key for x in TERM_CONTAINS)):
        return True
    if key.endswith(TERM_SUFFIXES) and len(key) >= 3:
        return True
    if any(x in key for x in TERM_CONTAINS) and len(key) >= 3 and count >= 1:
        return True
    return False


def generate_auto_candidates(pages: dict[int, list[str]]) -> dict[str, tuple[int, dict[int, set[int]]]]:
    counts: Counter[str] = Counter()
    page_hits: dict[str, dict[int, set[int]]] = defaultdict(lambda: defaultdict(set))
    chunk_re = re.compile(r"[A-Za-z0-9０-９一-龯々〆ヵヶァ-ヴーぁ-ん（）()・ー]{2,30}")
    for grade, page_list in pages.items():
        for page_no, page in enumerate(page_list, start=1):
            for raw in chunk_re.findall(page):
                term = clean_chunk(raw)
                key = compact(term)
                if len(key) < 2:
                    continue
                counts[key] += 1
                page_hits[key][grade].add(page_no)
    kept = {}
    for key, count in counts.items():
        page_count = sum(len(v) for v in page_hits[key].values())
        if should_keep_auto(key, count, page_count):
            kept[key] = (count, page_hits[key])
    return kept


def seed_bank(bank: dict[str, Candidate]) -> None:
    for grade, terms in EXPLICIT_KEYWORDS.items():
        for term in terms:
            add_candidate(bank, term, grade, "explicit-keyword")
    for term in LEARNING_TERMS:
        add_candidate(bank, term, None, "learning-method")
    for term in UNIT_TERMS:
        add_candidate(bank, term, None, "unit-heading")


def attach_page_hits(bank: dict[str, Candidate], pages: dict[int, list[str]]) -> None:
    compacted_pages = {
        grade: [(page_no, compact(page)) for page_no, page in enumerate(page_list, start=1)]
        for grade, page_list in pages.items()
    }
    for key, cand in bank.items():
        search_key = compact(cand.term)
        if not search_key:
            continue
        for grade, page_list in compacted_pages.items():
            for page_no, page in page_list:
                if search_key in page:
                    cand.grades.add(grade)
                    cand.pages[grade].add(page_no)


def attach_auto(bank: dict[str, Candidate], auto: dict[str, tuple[int, dict[int, set[int]]]]) -> None:
    for key, (count, page_hits) in auto.items():
        cand = bank.setdefault(key, Candidate(term=key))
        cand.sources.add("full-text-heuristic")
        cand.count += count
        for grade, pages in page_hits.items():
            cand.grades.add(grade)
            cand.pages[grade].update(pages)


def guess_category(term: str) -> str:
    t = compact(term)
    if t in {compact(x) for x in LEARNING_TERMS} or any(x in t for x in ["学習", "資料", "グラフ", "地図", "年表", "考え方", "見方", "発表", "意見", "調査"]):
        return "学び方"
    if any(x in t for x in ["憲法", "国会", "内閣", "裁判", "選挙", "政治", "法律", "行政", "司法", "権利", "義務", "福祉", "税", "予算"]):
        return "政治"
    if any(x in t for x in ["時代", "幕府", "天皇", "武士", "大名", "戦争", "条約", "古墳", "土器", "遺跡", "文化", "城", "寺", "神社"]):
        return "歴史"
    if any(x in t for x in ["工業", "農業", "漁業", "林業", "産業", "生産", "貿易", "輸送", "流通", "工場", "作物", "米", "水産"]):
        return "産業"
    if any(x in t for x in ["地形", "土地", "山", "川", "平野", "海", "島", "領土", "領海", "地図", "気候", "台風", "梅雨", "季節風"]):
        return "地理"
    if any(x in t for x in ["災害", "防災", "減災", "消防", "警察", "安全", "避難", "地震", "水害", "事故", "事件"]):
        return "安全・防災"
    if any(x in t for x in ["ごみ", "水", "環境", "森林", "資源", "公害", "リサイクル", "エネルギー"]):
        return "環境"
    if any(x in t for x in ["国際", "世界", "外国", "交流", "国連", "難民", "SDGs"]):
        return "国際"
    return "社会"


def definition_note(term: str, category: str) -> str:
    t = compact(term)
    if category == "学び方":
        return "社会科で調べ、考え、表すときに使う方法の言葉。何をする場面で使うか、どんな手順か、学習問題との関係を説明する。"
    if category == "政治":
        return "社会のきまりや政治のしくみを表す言葉。だれが、何を、何のために行うのか、くらしとの関係を説明する。"
    if category == "歴史":
        if any(x in t for x in ["戦争", "戦い", "事変", "一揆"]):
            return "歴史上のできごとを表す言葉。いつ、どこで、だれが関わり、社会やくらしがどう変わったかを説明する。"
        if any(x in t for x in ["時代", "幕府", "朝廷", "政権"]):
            return "歴史の時期や政治の中心を表す言葉。前後の時代との違い、政治のしくみ、人々のくらしを説明する。"
        return "歴史を理解する手がかりになる言葉。人物・文化財・制度・できごとの意味と、時代の変化との関係を説明する。"
    if category == "産業":
        return "ものをつくる、運ぶ、売る仕事に関わる言葉。生産者・消費者・地域・外国とのつながりを説明する。"
    if category == "地理":
        return "場所や広がり、自然条件を表す言葉。地図での位置、特色、人々のくらしとの関係を説明する。"
    if category == "安全・防災":
        return "安全を守るしくみや備えを表す言葉。災害・事故に対して、だれがどのように行動するかを説明する。"
    if category == "環境":
        return "自然や資源、環境を守る取り組みに関わる言葉。問題点、工夫、これからのくらしとの関係を説明する。"
    if category == "国際":
        return "日本と世界のつながりを表す言葉。国や地域の違い、協力、課題解決との関係を説明する。"
    return "本文で重要な社会科語として扱う。何を表す言葉か、どの単元で使うか、くらしや社会との関係を説明する。"


def priority(cand: Candidate, key: str) -> tuple[str, int]:
    sources = cand.sources
    page_count = sum(len(v) for v in cand.pages.values())
    score = cand.count + page_count * 2
    if "explicit-keyword" in sources:
        score += 100
    if "learning-method" in sources:
        score += 90
    if "unit-heading" in sources:
        score += 70
    if cand.existing:
        score += 15
    if key.endswith(TERM_SUFFIXES) or any(x in key for x in TERM_CONTAINS):
        score += 10
    source_backed = bool(sources & {"explicit-keyword", "learning-method", "unit-heading"})
    if source_backed and score >= 80:
        return "A", score
    if "full-text-heuristic" in sources and not source_backed and score >= 100:
        return "B", score
    if score >= 25:
        return "B", score
    return "C", score


def format_pages(pages: dict[int, set[int]]) -> str:
    parts = []
    for grade in sorted(pages):
        nums = sorted(pages[grade])
        shown = ",".join(str(n) for n in nums[:16])
        if len(nums) > 16:
            shown += f"...(+{len(nums) - 16})"
        parts.append(f"{grade}年:{shown}")
    return " / ".join(parts)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    existing_keys, existing_map = load_existing_terms()
    pages = load_pages()

    bank: dict[str, Candidate] = {}
    seed_bank(bank)
    attach_auto(bank, generate_auto_candidates(pages))
    attach_page_hits(bank, pages)

    for key, cand in bank.items():
        cand.existing = key in existing_keys
        if cand.existing:
            cand.term = existing_map[key]

    rows = []
    for key, cand in bank.items():
        if not cand.grades and "learning-method" not in cand.sources and "unit-heading" not in cand.sources:
            continue
        category = guess_category(cand.term)
        pri, score = priority(cand, key)
        source_backed = bool(cand.sources & {"explicit-keyword", "learning-method", "unit-heading"})
        if pri == "C" and not source_backed:
            continue
        rows.append({
            "term": cand.term,
            "status": "existing" if cand.existing else "new-candidate",
            "priority": pri,
            "score": score,
            "grades": ",".join(str(g) for g in sorted(cand.grades)) or "-",
            "source_pages": format_pages(cand.pages),
            "source_types": "|".join(sorted(cand.sources)),
            "occurrences": cand.count,
            "category_guess": category,
            "definition_note": definition_note(cand.term, category),
        })

    rows.sort(key=lambda r: (r["priority"], -int(r["score"]), r["status"], r["term"]))

    csv_path = OUT_DIR / "textbook-term-candidates-0527.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)

    json_path = OUT_DIR / "textbook-term-candidates-0527.json"
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    new_rows = [r for r in rows if r["status"] == "new-candidate"]
    existing_rows = [r for r in rows if r["status"] == "existing"]
    priority_counts = Counter(r["priority"] for r in rows)
    grade_counts = Counter()
    for r in rows:
        for grade in r["grades"].split(","):
            if grade != "-":
                grade_counts[grade] += 1

    md_lines = [
        "# 教科書PDFから抽出した社会科用語候補",
        "",
        "## 方針",
        "",
        "- 3〜6年の教科書PDF本文を一次資料として抽出した候補です。",
        "- 既存の `data/terms.js` にある語は `existing`、未収録語は `new-candidate` として分けています。",
        "- Aは教科書の明示キーワード・索引語・学習方法語を中心にした最優先、Bは本文反復や単元理解に効く語です。",
        "- 文章断片になりやすい自動抽出C候補は、辞典化候補としての精度を優先して除外しています。",
        "- `definition_note` は辞典化するときに説明へ必ず入れたい観点です。",
        "",
        "## 件数",
        "",
        f"- 総候補: {len(rows)}語",
        f"- 既存収録済み: {len(existing_rows)}語",
        f"- 新規候補: {len(new_rows)}語",
        f"- 優先度A: {priority_counts['A']}語",
        f"- 優先度B: {priority_counts['B']}語",
        f"- 優先度C: {priority_counts['C']}語",
        "",
        "## 学年別ヒット数",
        "",
    ]
    for grade in sorted(grade_counts, key=int):
        md_lines.append(f"- {grade}年: {grade_counts[grade]}語")

    md_lines.extend([
        "",
        "## 新規候補 優先度A 抜粋",
        "",
        "|語|学年|分類|出典ページ|辞典化メモ|",
        "|---|---:|---|---|---|",
    ])
    for r in [x for x in new_rows if x["priority"] == "A"][:160]:
        md_lines.append(
            f"|{r['term']}|{r['grades']}|{r['category_guess']}|{r['source_pages']}|{r['definition_note']}|"
        )

    md_lines.extend([
        "",
        "## ファイル",
        "",
        f"- CSV: `{csv_path.relative_to(ROOT)}`",
        f"- JSON: `{json_path.relative_to(ROOT)}`",
        "",
    ])
    (OUT_DIR / "textbook-term-candidates-0527.md").write_text("\n".join(md_lines), encoding="utf-8")

    print(f"wrote {len(rows)} rows")
    print(f"new candidates: {len(new_rows)}")
    print(f"existing: {len(existing_rows)}")
    print(f"priority: {dict(priority_counts)}")


if __name__ == "__main__":
    main()
