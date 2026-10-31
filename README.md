# Uyqu Ritmi

Shaxsiy uyqu ilovasi (PWA): 90 daqiqalik sikllar bo'yicha yotish vaqti, kundalik, tahlil, odat va ilmiy maqolalar.
Ma'lumotlar faqat qurilmaning o'zida (localStorage) saqlanadi. Server, akkaunt, reklama, tracker yo'q.

## Ishga tushirish (kompyuterda)

```
npm start      # http://localhost:5180
npm test       # dvigatel testlari (Node 22+)
```

Hech qanday paket o'rnatish shart emas.

## iPhone'ga o'rnatish

iPhone'da PWA ishlashi uchun ilova HTTPS manzilda turishi kerak (GitHub Pages, Vercel yoki Netlify; papkani shundayligicha yuklash kifoya).
Keyin Safari'da manzilni oching → Ulashish → "Bosh ekranga qo'shish".

## Fayllar

| Fayl | Vazifasi |
|---|---|
| `engine.js` | Sof hisob funksiyalari: yotish vaqti, SRI, uyqu qarzi, ijtimoiy jetlag, reja |
| `app.js` | Ekranlar va saqlash |
| `content.js` | "Bilim" bo'limidagi maqolalar (manbasi bilan) |
| `styles.css` | Dizayn, kunduzgi va tungi rejim |
| `sw.js` | Offline kesh (fayl o'zgarsa `VERSION` ni oshiring) |
| `tests/` | Dvigatel testlari |

## Cheklovlar

- Veb-ilova telefon yopiq turganda budilnik chala olmaydi; budilnik iPhone "Soat" ilovasiga qo'yiladi.
- Uyqu fazasi datchik bilan o'lchanmaydi; sikl hisobi o'rtacha qiymatga va sizning yozuvlaringizga asoslanadi.
- Tibbiy maslahat o'rnini bosmaydi.
