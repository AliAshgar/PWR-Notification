const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone');
const { exec } = require('child_process');
require('dotenv').config();

// Configuration from .env file
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const VALIDATOR_ADDRESS = process.env.VALIDATOR_ADDRESS;
const API_URL = `https://pwrrpc.pwrlabs.io/validator/?validatorAddress=${VALIDATOR_ADDRESS}`;
const BLOCKS_URL = `https://pwrexplorerv2.pwrlabs.io/blocksCreated/?validatorAddress=${VALIDATOR_ADDRESS}&page=1&count=1`;
const BLOCK_EXPLORER_URL = 'https://explorer.pwrlabs.io/blocks/'; // URL dasar untuk blok

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

let lastProcessedBlock = null;
let lastStatus = null;
let totalBlocksCreated = 0;

const checkForNewBlock = async () => {
  try {
    const response = await axios.get(API_URL, { timeout: 5000 });
    const data = response.data.validator;
    const lastCreateBlock = data.lastCreatedBlock || null;
    const status = data.status || 'Unknown';
    const ip = data.ip || 'N/A';
    const validatorAddress = data.address ? `${data.address.slice(0, 6)}...${data.address.slice(-4)}` : 'N/A';

    // Ambil informasi block terbaru dari blocksCreated API
    const blockData = await fetchBlocks();
    const latestBlock = blockData?.blocks?.[0];
    totalBlocksCreated = blockData?.metadata?.totalItems || 0;

    let blockMessage = `📢 *Your PWR Validator Info*\n` +
                      `-----------------------------------\n` +
                      `🆔 *Validator Address:* \`${validatorAddress}\`\n` +
                      `🌐 *IP Address:* \`${ip}\`\n` +
                      `📊 *Status:* \`${status}\`\n` +
                      `📈 *Total Blocks Created:* \`${totalBlocksCreated}\`\n`;

    if (latestBlock) {
      const time = moment(latestBlock.timeStamp).format('YYYY-MM-DD HH:mm:ss');
      const blockHeight = latestBlock.blockHeight;
      const blockLink = `${BLOCK_EXPLORER_URL}${blockHeight}`;
      blockMessage += `🚀 *New Block Found!*\n` +
                      `-----------------------------------\n` +
                      `📌 *Last Created Block:* \`${lastCreateBlock}\`\n` +
                      `🕒 *Timestamp:* \`${time}\`\n` +
                      `🔄 *Transactions:* \`${latestBlock.txnsCount}\`\n` +
                      `🎁 *Block Reward:* \`${latestBlock.blockReward}\`\n` +
                      `🔗 *Last Block:* [Explorer](${blockLink})\n`;
    }

    console.log(blockMessage);
    await sendMessageToTelegram(blockMessage);

    if (status.toLowerCase() === 'standby') {
      if (lastStatus !== 'standby') {
        await sendMessageToTelegram(`⚠️ *Validator in STANDBY Mode!*\n` +
                                    `-----------------------------------\n` +
                                    `🚨 *Validator is detected in Standby mode.*\n` +
                                    `🔄 *Attempting to restart...*`);
      }
      restartValidator(ip);
    }
    lastStatus = status;
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
};

const fetchBlocks = async () => {
  try {
    const response = await axios.get(BLOCKS_URL);
    return response.data || {};
  } catch (error) {
    console.error('Error fetching blocks:', error.message);
    return {};
  }
};

const restartValidator = (ip) => {
  console.log('Validator is in STANDBY mode. Restarting process...');

  const command = `sudo pkill java && sudo pkill -9 java && nohup sudo java -jar validator.jar ${ip} --loop-udp-test &`;

  exec(command, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Failed to execute command: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error Output: ${stderr}`);
      return;
    }
    console.log(`Validator restarted successfully: ${stdout}`);

    await sendMessageToTelegram(`✅ *Validator Successfully Restarted!*\n` +
                                `-----------------------------------\n` +
                                `🔄 *Validator is now active and running.*`);
  });
};

const sendMessageToTelegram = async (message) => {
  try {
    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    console.log('Message sent to Telegram!');
  } catch (error) {
    console.error('Error sending message to Telegram:', error.message);
  }
};

setInterval(checkForNewBlock, 60 * 1000);
checkForNewBlock();
