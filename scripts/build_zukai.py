#!/usr/bin/env python3
"""量産されたSVG（1語1ファイル）を data/zukai/zukai_g{3..6}.js に統合する。
使い方: python3 scripts/build_zukai.py <svgルートディレクトリ> <all_terms.json>
svgルート直下のサブディレクトリ（batch01等）を再帰で拾う。
"""
import sys, os, json, re

def main():
    svg_root, terms_json = sys.argv[1], sys.argv[2]
    terms = json.load(open(terms_json))
    grade_of = {t["id"]: t["grade"] for t in terms}

    svgs = {}
    for dirpath, _, files in os.walk(svg_root):
        for f in files:
            if f.endswith(".svg"):
                tid = f[:-4]
                if tid in grade_of:
                    raw = open(os.path.join(dirpath, f), encoding="utf-8").read().strip()
                    raw = re.sub(r"\s+", " ", raw)  # 改行・連続空白を畳む
                    svgs[tid] = raw

    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "zukai")
    os.makedirs(out_dir, exist_ok=True)

    for g in [3, 4, 5, 6]:
        ids = [t["id"] for t in terms if t["grade"] == g and t["id"] in svgs]
        lines = [
            "(() => {",
            "window.SHAKAI_ZUKAI = window.SHAKAI_ZUKAI || {};",
            "Object.assign(window.SHAKAI_ZUKAI, {",
        ]
        for tid in ids:
            lines.append(f"{json.dumps(tid)}: {{\"svg\": {json.dumps(svgs[tid], ensure_ascii=False)}}},")
        lines += ["});", "})();", ""]
        path = os.path.join(out_dir, f"zukai_g{g}.js")
        open(path, "w", encoding="utf-8").write("\n".join(lines))
        total_g = sum(1 for t in terms if t["grade"] == g)
        print(f"zukai_g{g}.js: {len(ids)}/{total_g}語 {os.path.getsize(path)//1024}KB")

    print(f"合計 {len(svgs)}/{len(terms)}語")

if __name__ == "__main__":
    main()
