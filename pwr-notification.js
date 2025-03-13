const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone');
const { exec } = require('child_process');
require('dotenv').config(); // Menggunakan .env untuk menyimpan konfigurasi

// Konfigurasi dari file .env
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const VALIDATOR_ADDRESS = process.env.VALIDATOR_ADDRESS; // Address validator dari .env

// URL API Validator
const API_URL = `https://pwrrpc.pwrlabs.io/validator/?validatorAddress=${VALIDATOR_ADDRESS}`;

// Variabel untuk menyimpan lastCreateBlock terakhir
let lastProcessedBlock = null;
let lastStatus = null;

// Inisialisasi bot Telegram
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Fungsi untuk menghitung waktu yang telah berlalu
const timeSince = (timestamp) => {
  const now = moment();
  const past = moment(timestamp);
  const seconds = now.diff(past, 'seconds');

  if (seconds < 60) return `${seconds} detik yang lalu`;
  const minutes = now.diff(past, 'minutes');
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = now.diff(past, 'hours');
  return `${hours} jam yang lalu`;
};

// Fungsi untuk memeriksa perubahan pada lastCreatedBlock
const checkForNewBlock = async () => {
  try {
    const response = await axios.get(API_URL, { timeout: 5000 });
    const data = response.data.validator;
    const lastCreateBlock = data.lastCreatedBlock || null;

    if (lastProcessedBlock === null) {
      lastProcessedBlock = lastCreateBlock;
      console.log(`Initial block set to: ${lastProcessedBlock}`);
    } else if (lastCreateBlock !== lastProcessedBlock) {
      lastProcessedBlock = lastCreateBlock;

      const lastCreateBlockTimeAgo = data.lastCreatedBlockTime
        ? timeSince(data.lastCreatedBlockTime)
        : 'N/A';
      const ip = data.ip || 'N/A';
      const status = data.status || 'N/A';
      const validatorAddress = data.address
        ? `${data.address.slice(0, 6)}...${data.address.slice(-4)}`
        : 'N/A';

      const message = `
ðŸš€ *Blok Baru Ditemukan!*
-----------------------------------
ðŸ”¹ *Validator Address:* \`${validatorAddress}\`
ðŸ”¹ *Last Create Block:* \`${lastCreateBlock}\`
ðŸ”¹ *Waktu Pembuatan:* ${lastCreateBlockTimeAgo}
ðŸ”¹ *IP Address:* \`${ip}\`
ðŸ”¹ *Status:* \`${status}\`
      `;

      console.log('New Block Detected:', message);
      await sendMessageToTelegram(message);
    } else {
      console.log('No new block detected.');
    }
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
};

// Fungsi untuk mengecek status validator dan restart jika standby
const checkValidatorStatus = async () => {
  try {
    const response = await axios.get(API_URL, { timeout: 5000 });
    const data = response.data.validator;
    const status = data.status || 'Unknown';

    console.log(`Validator Status: ${status}`);

    if (status.toLowerCase() === 'standby') {
      if (lastStatus !== 'standby') {
        const standbyMessage = `
âš ï¸ *Validator dalam Status STANDBY!*
-----------------------------------
ðŸš¨ *Validator terdeteksi dalam kondisi Standby.*
ðŸ”„ *Akan mencoba menjalankan ulang...*
        `;
        await sendMessageToTelegram(standbyMessage);
      }
      restartValidator();
    }
    
    lastStatus = status;
  } catch (error) {
    console.error('Error fetching validator status:', error.message);
  }
};

// Fungsi untuk mengeksekusi perintah restart validator
const restartValidator = () => {
  console.log('Validator dalam status STANDBY. Memulai ulang proses...');

  const command = `sudo pkill java && sudo pkill -9 java && nohup sudo java -jar validator.jar 209.97.160.138 --loop-udp-test &`;

  exec(command, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Gagal mengeksekusi perintah: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error Output: ${stderr}`);
      return;
    }
    console.log(`Validator berhasil dijalankan: ${stdout}`);

    // Kirim pesan ke Telegram setelah validator berhasil dijalankan
    const successMessage = `
âœ… *Validator Berhasil Dijalankan!*
-----------------------------------
ðŸŽ¯ *Validator telah kembali aktif dan berjalan.*
ðŸ”¥ *Memantau blok baru...*
    `;
    await sendMessageToTelegram(successMessage);
  });
};

// Fungsi untuk mengirim pesan ke Telegram
const sendMessageToTelegram = async (message) => {
  try {
    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    console.log('Message sent to Telegram!');
  } catch (error) {
    console.error('Error sending message to Telegram:', error.message);
  }
};

// Jalankan pemeriksaan setiap 1 menit
setInterval(() => {
  checkForNewBlock();
  checkValidatorStatus();
}, 60 * 1000);

checkForNewBlock();
checkValidatorStatus();

