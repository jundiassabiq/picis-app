# DESIGN.md, arah visual duitku

Dokumen ini mencatat keputusan desain dan alasannya, supaya perubahan berikutnya tetap konsisten.

## Design Read

Membaca brief ini sebagai: aplikasi keuangan pribadi untuk pekerja muda Indonesia, dengan bahasa visual kartu tempel yang berani dan hangat, dial **ENERGY 3 / RHYTHM 3 / MOTION 2**.

- ENERGY 3: blok warna tebal, angka besar, judul rapat. Aplikasi keuangan biasanya membosankan, ini tidak.
- RHYTHM 3: tiap bagian punya komposisi berbeda. Hero dengan pita warna, deret kartu statistik, grafik batang, papan peringkat tiga warna, daftar baris.
- MOTION 2: transisi halaman 8 piksel, angka dihitung naik, busur anggaran tumbuh, toast masuk. Tidak ada parallax.

## Referensi dan cara memetakannya

Referensi adalah aplikasi belajar dengan kartu krem, angka raksasa, busur progres, dan papan peringkat bertingkat. Yang diambil adalah bahasa visualnya, bukan isinya:

| Di referensi | Di duitku |
|---|---|
| Progres belajar dengan busur | Anggaran terpakai dengan busur yang sama |
| Papan peringkat tiga warna | Tiga kategori pengeluaran terbesar |
| Sapaan dan tanggal di atas | Sapaan dan tanggal di atas |
| Kartu krem berlekuk | Kartu krem bersudut besar dengan bayangan tipis |
| Angka 78 persen raksasa | Sisa uang bulan ini sebagai angka utama |

## Palet

Tiga warna inti, masing-masing punya arti. Warna tidak dipakai sebagai dekorasi cepat.

| Token | Nilai terang | Arti |
|---|---|---|
| `--pink` | `#db2a50` | Uang keluar, aksi utama, sorotan peringkat 1 |
| `--teal` | `#0f6755` | Uang masuk, aman, saldo dompet |
| `--butter` | `#efaf23` | Perhatian, anggaran mendekati batas, insight |
| `--paper` | `#f5ebd8` | Kanvas krem |
| `--ink` | `#1a1512` | Teks dan blok kontras |

Kontras diuji: teks putih pada pink 4,7:1, teks ink pada krem di atas 10:1, teks sekunder `#6e6455` pada krem 5:1.

Mode gelap memakai kanvas `#14100d`, permukaan `#1e1915`, dan pink yang lebih gelap agar teks putih tetap lolos. Warna semantik terang versi gelap (`--expense` menjadi `#ff8fa6`) dipakai untuk angka di atas permukaan gelap.

## Tipografi

- **Bricolage Grotesque**, judul dan angka. Alasan: grotesque dengan detail sedikit canggung, cocok dengan bahasa kartu tempel, dan tidak jatuh ke pilihan default Inter atau Space Grotesk.
- **Plus Jakarta Sans**, teks antarmuka. Alasan: digambar di Jakarta untuk antarmuka Indonesia, x-height tinggi, tetap tajam di 11 sampai 15 piksel.
- Angka memakai `font-variant-numeric: tabular-nums` supaya kolom rupiah tidak bergoyang.

## Bentuk dan jarak

- Radius kartu 26 sampai 34 piksel, input 18, chip dan tombol pil. Variasi radius menandai hierarki, bukan semua serba pil.
- Bayangan tipis, bukan efek mengambang: `0 1px 0` untuk tepi dan `0 20px 40px -32px` untuk kedalaman.
- Jarak antarbagian 16 piksel di ponsel, 18 di desktop. Whitespace dipakai untuk memisahkan kelompok, bukan sisa.

## Motif identitas

Tiga hal yang berulang dan membuat aplikasi ini bisa dikenali:

1. **Gelang putus-putus** di sekitar angka statistik dan di sekitar busur. Diambil dari lingkaran garis putus-putus pada referensi, dipakai sebagai penanda "angka ini diukur".
2. **Sparkle empat sudut** sebagai penanda bagian dan aksen kecil di sapaan.
3. **Blok warna penuh dengan satu angka mati**: kartu pink, kartu teal, kartu tinta, kartu butter.

## Motion

- Angka hero dihitung naik dari 0 dalam 900 ms saat pertama tampil.
- Busur anggaran memakai transisi `stroke-dasharray` 700 ms.
- Batang grafik tumbuh dari bawah 520 ms.
- Halaman masuk dengan geser 8 piksel dan fade 260 ms.
- Semua dimatikan di bawah `prefers-reduced-motion: reduce`.

## Ikon

Satu set ikon digambar sendiri untuk aplikasi ini: stroke 1,9, ujung membulat, geometri sedikit tidak simetris. Ikon kategori memakai benda yang benar-benar mewakili isinya (mangkuk untuk makan, dompet untuk dompet, struk bergerigi untuk tagihan). Tidak ada sparkle sebagai ikon fitur, sparkle hanya merek.

## Yang sengaja tidak dipakai

- Gradien biru ke ungu, glow, dan kaca buram: tidak ada alasan hierarki untuk itu.
- Bento grid dan deretan kartu fitur seragam: komposisi mengikuti isi, bukan templat.
- Statistik karangan, testimoni, dan logo klien: tidak ada sumbernya, jadi tidak ditampilkan.
- Ikon Lucide dan ilustrasi Undraw: diganti set ikon sendiri dan foto struk asli.

## Aksesibilitas

- Fokus terlihat 3 piksel dengan offset 3, kontras terhadap kanvas di kedua tema.
- Semua kontrol punya nama aksesibel, ikon dekoratif `aria-hidden`.
- Dialog: `role="dialog"`, `aria-modal`, judul terhubung, fokus terkunci, `Escape` menutup.
- Grafik tren dapat difokuskan dan dibaca sebagai tombol dengan label nominal lengkap.
