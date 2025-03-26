## Install

```
sudo apt install node js
sudo apt install screen
npm install axios node-telegram-bot-api child_process
```

```
git clone https://github.com/AliAshgar/PWR-Notification.git
cd PWR-Notification
```
create file .env
```
nano .env
```
PASTE
```
TELEGRAM_TOKEN=YOUR_TETELGRAM_TOKEN_BOT
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
VALIDATOR_ADDRESS=YOUR_VALIDATOR_ADDRESS
```
edit on YOUR_ADDRESS_PWR_VALIDATOR, YOUR_TELEGRAM_BOT_TOKEN and YOUR_CHAT_ID
save (CTRL+X Y enter)

create screen
```
screen -S PWR
```
 Run bot
```
node pwr-notification.js
```

save screen (CTRL+A D)

to check the log

```
screen -r PWR
```

save screen (CTRL+A D)
 
