#!/usr/bin/env python3
"""生成イラストPNGをWebPに変換してサイトへ組み込む。
使い方: python3 scripts/build_illust.py <生成PNGディレクトリ>
- illust_{id}.png → assets/img/illust/{id}.webp（640px・q82）
- data/illust.js に window.SHAKAI_ILLUST = {id:1,...} を書き出す
"""
import sys, os, json
from PIL import Image

def main():
    src_dir = sys.argv[1]
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, "assets", "img", "illust")
    os.makedirs(out_dir, exist_ok=True)

    ids = []
    total_bytes = 0
    for f in sorted(os.listdir(src_dir)):
        if not (f.startswith("illust_") and f.endswith(".png")):
            continue
        tid = f[len("illust_"):-4]
        dst = os.path.join(out_dir, f"{tid}.webp")
        src_m = os.path.getmtime(os.path.join(src_dir, f))
        if not os.path.exists(dst) or os.path.getmtime(dst) < src_m:
            img = Image.open(os.path.join(src_dir, f)).convert("RGB")
            img.thumbnail((640, 640), Image.LANCZOS)
            img.save(dst, "WEBP", quality=82, method=6)
        ids.append(tid)
        total_bytes += os.path.getsize(dst)

    js = ["(() => {", "window.SHAKAI_ILLUST = {"]
    js += [f"{json.dumps(tid)}: 1," for tid in ids]
    js += ["};", "})();", ""]
    open(os.path.join(root, "data", "illust.js"), "w").write("\n".join(js))
    print(f"{len(ids)}語 → assets/img/illust/ 合計 {total_bytes//1024}KB")

if __name__ == "__main__":
    main()
