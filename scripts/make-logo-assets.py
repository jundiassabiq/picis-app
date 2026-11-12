"""Menyiapkan aset logo Picis dari gambar sumber.

Menghasilkan:
  public/logo.png         tile pink 512 px untuk ikon aplikasi
  public/logo-mark.png    versi transparan untuk latar pink
  public/favicon-64.png   favicon
  public/apple-touch-icon.png  180 px
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets-logo-source.png"
OUT = ROOT / "public"

img = Image.open(SOURCE).convert("RGB")
w, h = img.size
square = img.crop((0, 0, min(w, h), min(w, h)))

# Tile aplikasi, dipakai apa adanya sebagai ikon bersudut bulat.
square.resize((512, 512), Image.LANCZOS).save(OUT / "logo.png", optimize=True)
square.resize((64, 64), Image.LANCZOS).save(OUT / "favicon-64.png", optimize=True)
square.resize((180, 180), Image.LANCZOS).save(OUT / "apple-touch-icon.png", optimize=True)

# Versi transparan: pisahkan latar pink dengan alpha lembut di tepi.
data = np.asarray(square).astype(np.float32)
bg = np.array([215, 40, 78], dtype=np.float32)
distance = np.linalg.norm(data - bg, axis=2)
alpha = np.clip((distance - 16) / 34, 0, 1)
rgba = np.dstack([data, alpha * 255]).astype(np.uint8)
mark = Image.fromarray(rgba, "RGBA")
mark.resize((512, 512), Image.LANCZOS).save(OUT / "logo-mark.png", optimize=True)

print("logo.png, logo-mark.png, favicon-64.png, apple-touch-icon.png siap")
