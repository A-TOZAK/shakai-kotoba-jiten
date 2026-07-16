#!/usr/bin/env python3
"""図解SVGの機械検査（全数）。
使い方: python3 scripts/check_zukai.py <svgディレクトリ> <all_terms.json>
検査: 全語カバレッジ / XML構文 / viewBox / 禁則タグ・属性 / 文字サイズ / パレット外の色 / 言葉の数 / ファイルサイズ
"""
import sys, os, re, json
import xml.etree.ElementTree as ET

PALETTE = {
    "#2b3440", "#ffffff", "#eef2f6",
    "#2563a8", "#d7e8f8", "#d9542b", "#fbe3d8",
    "#2f8a5f", "#ddefe4", "#b7791f", "#f7ecd4",
    "none", "transparent",
}
FORBIDDEN = ["<image", "<script", "<style", "<defs", "<use", "<marker",
             "<mask", "<clippath", "<filter", "<foreignobject",
             "id=", "class=", "href", "url(", "animate", "`", "${"]

def normalize_color(c):
    c = (c or "").strip().lower()
    m = re.match(r"^#([0-9a-f])([0-9a-f])([0-9a-f])$", c)
    if m:
        c = "#" + "".join(x * 2 for x in m.groups())
    return c

def check_file(path, errors, warns):
    raw = open(path, encoding="utf-8").read()
    low = raw.lower()
    name = os.path.basename(path)

    for bad in FORBIDDEN:
        if bad in low:
            errors.append(f"{name}: 禁則 `{bad}` を含む")

    if 'viewbox="0 0 640 400"' not in low:
        errors.append(f"{name}: viewBoxが 0 0 640 400 でない")

    size = len(raw.encode("utf-8"))
    if size > 8000:
        warns.append(f"{name}: {size}B（6KB目安超過）")

    try:
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        errors.append(f"{name}: XML構文エラー {e}")
        return

    texts = []
    for el in root.iter():
        tag = el.tag.split("}")[-1]
        if tag == "text":
            fs = el.get("font-size", "")
            try:
                if fs and float(fs) < 22:
                    errors.append(f"{name}: font-size {fs} < 22")
            except ValueError:
                errors.append(f"{name}: font-size が数値でない: {fs}")
            content = "".join(el.itertext()).strip()
            if content:
                texts.append(content)
        for attr in ("fill", "stroke"):
            v = normalize_color(el.get(attr))
            if v and not v.startswith("rgb") and v not in PALETTE:
                errors.append(f"{name}: パレット外の色 {attr}={v}")

    if len(texts) > 9:
        warns.append(f"{name}: 言葉が{len(texts)}個（7つまで目安）")
    # 統計数字らしきものの検出（年号・%・大きい数）
    joined = " ".join(texts)
    if re.search(r"\d{4}年|\d+％|\d+%|\d{3,}(トン|人|円|台)", joined):
        warns.append(f"{name}: 統計数字らしき表記: {joined[:40]}")

def main():
    svg_dir, terms_json = sys.argv[1], sys.argv[2]
    terms = json.load(open(terms_json))
    want = {t["id"] for t in terms}
    have = {f[:-4] for f in os.listdir(svg_dir) if f.endswith(".svg")}

    errors, warns = [], []
    missing = sorted(want - have)
    extra = sorted(have - want)
    if missing:
        errors.append(f"未作成 {len(missing)}語: {', '.join(missing[:10])}{'…' if len(missing) > 10 else ''}")
    if extra:
        warns.append(f"対象外のファイル {len(extra)}件: {', '.join(extra[:5])}")

    for f in sorted(have & want):
        check_file(os.path.join(svg_dir, f + ".svg"), errors, warns)

    print(f"対象 {len(want)}語 / 作成済 {len(have & want)}語")
    print(f"ERROR {len(errors)}件 / WARN {len(warns)}件")
    for e in errors[:60]:
        print("  [E]", e)
    for w in warns[:40]:
        print("  [W]", w)
    sys.exit(1 if errors else 0)

if __name__ == "__main__":
    main()
