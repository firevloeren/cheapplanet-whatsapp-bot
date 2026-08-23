const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot online ' + new Date()));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Webserver online ' + PORT));

console.log('Starting client v3');

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '/tmp/auth' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote','--disable-gpu']
    }
});

client.on('qr', (qr) => {
    console.log('SCAN QR VOOR 06 NUMMER:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('BOT READY!');
});

client.on('message', async (msg) => {
    if (!msg.from.includes('7850843')) return;
    console.log('Bericht: ' + msg.body);
    if (msg.body.toLowerCase() === 'help') {
        msg.reply('Bot werkt! Stuur: verander website klant 1 naar rood');
    }
    if (msg.body.toLowerCase().includes('verander') && msg.body.toLowerCase().includes('naar')) {
        msg.reply('Website aangepast! (demo)');
    }
});

client.initialize().catch(e => {
    console.error('Init error', e);
});

setInterval(() => console.log('Alive ' + new Date().toISOString()), 60000);
