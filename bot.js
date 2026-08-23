const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot V6 online - ' + new Date().toISOString()));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Webserver V6 online op ' + PORT));

console.log('Starting client V6');

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '/tmp/auth' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--disable-gpu'],
    }
});

client.on('qr', (qr) => {
    console.log('===== QR CODE - SCAN NU =====');
    qrcode.generate(qr, { small: true });
    console.log('===== EINDE QR =====');
});

client.on('ready', () => {
    console.log('===== BOT IS READY V6! =====');
});

client.on('message', async (msg) => {
    console.log('Bericht van: ' + msg.from + ' -> ' + msg.body);
    if (!msg.from.includes('7850843')) return;
    if (msg.body.toLowerCase().includes('help')) {
        msg.reply('🤖 Bot V6 werkt! Probeer: verander website klant 1 naar rood');
    } else {
        msg.reply('✅ Ontvangen: ' + msg.body);
    }
});

client.initialize().catch(e=>console.error('Init error V6', e));
setInterval(()=>console.log('Heartbeat V6 - ' + new Date().toISOString()), 30000);
