const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone');

// Konfigurasi Telegram
const TELEGRAM_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'; // Ganti dengan token bot Telegram Anda
const CHAT_ID = 'YOUR_CHAT_ID'; // Ganti dengan ID pengguna Telegram

// URL API
const API_URL = 'https://pwrrpc.pwrlabs.io/validator/?validatorAddress=YOUR_ADDRESS_PWR_VALIDATOR';

// Variabel untuk menyimpan lastCreateBlock terakhir
let lastProcessedBlock = null;

// Inisialisasi bot Telegram
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Fungsi untuk menghitung waktu yang telah berlalu
const timeSince = (timestamp) => {
  const now = moment();
  const past = moment(timestamp);
  const seconds = now.diff(past, 'seconds');

  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = now.diff(past, 'minutes');
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = now.diff(past, 'hours');
  return `${hours} hours ago`;
};

// Fungsi untuk memeriksa perubahan pada lastCreatedBlock
const checkForNewBlock = async () => {
  try {
    // Ambil data dari API
    const response = await axios.get(API_URL);
    const data = response.data.validator; // Properti validator
    const lastCreateBlock = data.lastCreatedBlock || null;

    // Periksa apakah ada blok baru
    if (lastProcessedBlock === null) {
      lastProcessedBlock = lastCreateBlock; // Inisialisasi pada awalnya
      console.log(`Initial block set to: ${lastProcessedBlock}`);
    } else if (lastCreateBlock !== lastProcessedBlock) {
      // Blok baru terdeteksi
      lastProcessedBlock = lastCreateBlock;

      // Ambil informasi tambahan
      const lastCreateBlockTimeAgo = data.lastCreatedBlockTime
        ? timeSince(data.lastCreatedBlockTime)
        : 'N/A';
      const ip = data.ip || 'N/A';
      const status = data.status || 'N/A';
      const validatorAddress = data.address
        ? `${data.address.slice(0, 4)}...${data.address.slice(-4)}`
        : 'N/A';

      // Format pesan
      const message = `
Blok Baru Ditemukan!
- Last Create Block: ${lastCreateBlock}
- Last Create Block Time: ${lastCreateBlockTimeAgo}
- IP Address: ${ip}
- Status: ${status}
- Validator Address: ${validatorAddress}
      `;

      console.log('New Block Detected:', message); // Log pesan ke konsol
      await sendMessageToTelegram(message); // Kirim pesan ke Telegram
    } else {
      console.log('No new block detected.'); // Log jika tidak ada blok baru
    }
  } catch (error) {
    console.error('Error fetching data:', error.message); // Log kesalahan
  }
};

// Fungsi untuk mengirim pesan ke Telegram
const sendMessageToTelegram = async (message) => {
  try {
    await bot.sendMessage(CHAT_ID, message);
    console.log('Message sent to Telegram!'); // Log pengiriman pesan berhasil
  } catch (error) {
    console.error('Error sending message to Telegram:', error.message); // Log kesalahan pengiriman
  }
};

// Jalankan secara berkala setiap 1 menit untuk memantau perubahan
setInterval(checkForNewBlock, 1 * 60 * 1000); // 1 menit
checkForNewBlock(); // Jalankan segera saat script dimulai
