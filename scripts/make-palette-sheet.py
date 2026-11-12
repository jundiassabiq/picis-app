"""Membuat lembar palet duitku (aplikasi dan maskot) sebagai PNG.

Jalankan: python scripts/make-palette-sheet.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs"
OUT.mkdir(exist_ok=True)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_SEMI = "C:/Windows/Fonts/seguisb.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"

PAPER = "#F5EBD8"
INK = "#1A1512"
INK_SOFT = "#574E43"
INK_FAINT = "#6E6455"
LINE = "#D3C0A0"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def wrap(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=f) <= width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def chip(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    w: int,
    h: int,
    fill: str,
    name: str,
    hexv: str,
    role: str,
    fg: str,
    border: str | None = None,
    big: bool = True,
) -> None:
    draw.rounded_rectangle([x, y, x + w, y + h], radius=22, fill=fill, outline=border, width=2)

    name_font = font(FONT_BOLD, 20 if big else 13)
    hex_font = font(FONT_SEMI, 17 if big else 15)
    role_font = font(FONT_REG, 12)

    name_y = y + h - (116 if big else 88)
    draw.text((x + 18, name_y), name, font=name_font, fill=fg)
    draw.text((x + 18, name_y + (32 if big else 24)), hexv.upper(), font=hex_font, fill=fg)

    if role:
        for i, line in enumerate(wrap(draw, role, role_font, w - 36)[:2]):
            draw.text((x + 18, name_y + (60 if big else 50) + i * 16), line, font=role_font, fill=fg)


def heading(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, note: str = "") -> None:
    draw.text((x, y), text, font=font(FONT_BOLD, 24), fill=INK)
    if note:
        draw.text((x, y + 34), note, font=font(FONT_REG, 14), fill=INK_FAINT)


def app_sheet() -> None:
    W, H = 1500, 1060
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    d.text((70, 52), "duitku", font=font(FONT_BOLD, 46), fill=INK)
    d.text((70, 112), "Palet aplikasi. Tiga warna, masing-masing punya tugas.", font=font(FONT_REG, 18), fill=INK_SOFT)
    d.text((W - 70, 62), "v0.1  /  light + dark", font=font(FONT_SEMI, 14), fill=INK_FAINT, anchor="ra")

    heading(d, 70, 176, "Inti")
    chips = [
        ("Pink", "#DB2A50", "Uang keluar, aksi utama, peringkat 1", "#FFFFFF", None),
        ("Teal", "#0F6755", "Uang masuk, aman, saldo dompet", "#FFFFFF", None),
        ("Butter", "#EFAF23", "Perhatian, insight, aksen merek", INK, None),
        ("Ink", "#1A1512", "Teks, tombol tegas, garis ikon", "#FFF9EE", None),
        ("Paper", "#F5EBD8", "Kanvas, latar halaman", INK, LINE),
    ]
    for i, (name, hexv, role, fg, border) in enumerate(chips):
        chip(d, 70 + i * (268 + 20), 222, 268, 216, hexv, name, hexv, role, fg, border)

    heading(d, 70, 486, "Fungsional, tema terang", "Turunan dan pasangan teks untuk tiap warna inti.")
    chips2 = [
        ("pink-soft", "#FBDDE4", "Latar tag pengeluaran", INK, None),
        ("pink-deep", "#A8193C", "Teks di atas pink-soft", "#FFFFFF", None),
        ("teal-soft", "#D9EFE6", "Latar tag pemasukan", INK, None),
        ("teal-deep", "#0A4A3D", "Teks di atas teal-soft", "#FFFFFF", None),
        ("butter-soft", "#FBE8BD", "Latar insight dan peringatan", INK, None),
        ("surface", "#FFFDF8", "Kartu dan sheet", INK, "#E6D8C0"),
    ]
    for i, (name, hexv, role, fg, border) in enumerate(chips2):
        chip(d, 70 + i * (220 + 20), 548, 220, 140, hexv, name, hexv, role, fg, border, big=False)

    heading(d, 70, 716, "Tema gelap", "Kanvas hampir hitam hangat, teks krem, warna inti tetap terbaca.")
    d.rounded_rectangle([70, 772, 1430, 966], radius=28, fill="#14100D")
    dark = [
        ("paper", "#14100D", "#A99B88", "#352B23", "kanvas"),
        ("surface", "#1E1915", "#A99B88", None, "kartu"),
        ("ink", "#F8EFE1", INK, None, "teks"),
        ("expense", "#FF8FA6", INK, None, "uang keluar"),
        ("income", "#8CE2CB", INK, None, "uang masuk"),
    ]
    for i, (name, hexv, fg, border, role) in enumerate(dark):
        x = 100 + i * (248 + 16)
        d.rounded_rectangle([x, 816, x + 248, 924], radius=20, fill=hexv, outline=border, width=2)
        d.text((x + 18, 844), name, font=font(FONT_BOLD, 15), fill=fg)
        d.text((x + 18, 872), hexv.upper(), font=font(FONT_SEMI, 17), fill=fg)
        d.text((x + 18, 898), role, font=font(FONT_REG, 11), fill=fg)

    d.text(
        (100, 932),
        "Tombol dan aksi utama di tema gelap memakai pink #D92651, teks putih 4,8:1.",
        font=font(FONT_REG, 12),
        fill="#A99B88",
    )

    d.line([70, 1000, 1430, 1000], fill=LINE, width=1)
    d.text(
        (70, 1014),
        "Kontras diukur: putih di pink 4,7:1  ·  ink di butter 9,3:1  ·  ink-faint di krem 4,9:1  ·  putih di teal 6,8:1",
        font=font(FONT_REG, 13),
        fill=INK_FAINT,
    )

    img.save(OUT / "palette-aplikasi.png")
    print("docs/palette-aplikasi.png")


def mascot_sheet() -> None:
    W, H = 1500, 1000
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    d.text((70, 52), "duitku · palet maskot", font=font(FONT_BOLD, 42), fill=INK)
    d.text(
        (70, 108),
        "Kandidat utama: Koin Duit. Badan butter tetap, emosi dan status dibawa aksen.",
        font=font(FONT_REG, 18),
        fill=INK_SOFT,
    )

    heading(d, 70, 172, "Bahan", "Enam warna, tidak lebih. Garis selalu ink, bukan hitam pekat.")
    materials = [
        ("Badan", "#EFAF23", "butter, porsi 65%", INK, None),
        ("Sorot", "#FBE8BD", "butter-soft, porsi 20%", INK, None),
        ("Bayangan", "#C98C12", "turunan butter, porsi 10%", INK, None),
        ("Garis", "#1A1512", "ink, porsi 10%", "#FFF9EE", None),
        ("Pipi", "#F8C9D4", "pink-tint, porsi 5%", INK, None),
        ("Aksen", "#0F6755", "teal, porsi 5%", "#FFFFFF", None),
    ]
    for i, (name, hexv, role, fg, border) in enumerate(materials):
        chip(d, 70 + i * (220 + 20), 258, 220, 190, hexv, name, hexv, role, fg, border, big=False)

    heading(d, 70, 500, "Perbandingan", "Terapkan rasio ini di setiap pose, termasuk stiker dan favicon.")
    bar_x, bar_y, bar_w, bar_h = 70, 560, 1360, 44
    segments = [
        (0.65, "#EFAF23", "Badan 65%", INK),
        (0.20, "#FFFDF8", "Kertas 20%", INK),
        (0.10, "#1A1512", "Garis 10%", "#FFF9EE"),
        (0.05, "#0F6755", "Aksen 5%", "#FFFFFF"),
    ]
    x = bar_x
    for share, color, label, fg in segments:
        w = int(bar_w * share)
        d.rounded_rectangle([x, bar_y, x + w, bar_y + bar_h], radius=10, fill=color, outline=PAPER, width=2)
        d.text((x + w / 2, bar_y + bar_h + 10), label, font=font(FONT_SEMI, 12), fill=INK_FAINT, anchor="ma")
        x += w

    heading(d, 70, 648, "Mood mengikuti status anggaran", "Warna tubuh tidak berubah. Yang berubah hanya aksen dan ekspresi.")
    moods = [
        ("Aman", "#D9EFE6", "#0F6755", "Mata santai, aksen teal, tanpa properti tambahan.", "Aksen #0F6755"),
        ("Hati-hati", "#FBE8BD", "#EFAF23", "Alis miring, keringat butter-soft. Pink belum boleh muncul.", "Aksen #EFAF23"),
        ("Melebihi", "#FBDDE4", "#DB2A50", "Pipi pink penuh, koin retak halus, tanpa teal.", "Aksen #DB2A50"),
    ]
    for i, (title, bg, dot, body, accent) in enumerate(moods):
        x = 70 + i * (440 + 20)
        y = 706
        d.rounded_rectangle([x, y, x + 440, y + 176], radius=24, fill=bg)
        d.ellipse([x + 24, y + 26, x + 52, y + 54], fill=dot)
        d.text((x + 64, y + 24), title, font=font(FONT_BOLD, 22), fill=INK)
        for j, line in enumerate(wrap(d, body, font(FONT_REG, 14), 392)[:2]):
            d.text((x + 24, y + 80 + j * 22), line, font=font(FONT_REG, 14), fill=INK_SOFT)
        d.text((x + 24, y + 138), accent, font=font(FONT_SEMI, 13), fill=INK)

    d.line([70, 932, 1430, 932], fill=LINE, width=1)
    d.text(
        (70, 946),
        "Kanvas induk 512 px, garis 3 sampai 4 px, tanpa gradien, maksimal tiga warna per pose. Di bawah 32 px buang pipi dan sorot.",
        font=font(FONT_REG, 13),
        fill=INK_FAINT,
    )
    d.text(
        (70, 966),
        "Di latar gelap, garis berubah paper #F5EBD8 dan bayangan tetap #C98C12. Badan butter tidak diganti.",
        font=font(FONT_REG, 13),
        fill=INK_FAINT,
    )

    img.save(OUT / "palette-maskot.png")
    print("docs/palette-maskot.png")


app_sheet()
mascot_sheet()
