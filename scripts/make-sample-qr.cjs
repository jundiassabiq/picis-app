/* One-off helper: renders the sample receipt QR used by the scanner demo. */
const QRCode = require('qrcode');

const payload =
  'https://struk.warteg-sederhana.id/trx/20261112-0481?total=87500&merchant=Warteg%20Sederhana%20Cabang%20Kemang';

QRCode.toFile(
  'public/contoh-struk-qr.png',
  payload,
  { width: 560, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#151210', light: '#fffdf8' } },
  (error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    console.log('sample qr written');
  },
);
