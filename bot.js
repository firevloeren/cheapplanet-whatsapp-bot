const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot V5 online - ' + new Date().toISOString()));
app.get('/qr', (req, res) => res.send('Check logs voor QR'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Webserver V5 online op ' + PORT));

console.log('Starting client V5 - using bundled chromium');

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '/tmp/auth' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--no-sandbox'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('====================================');
    console.log('QR CODE HIERONDER - SCAN MET 06 NUMMER:');
    console.log('====================================');
    qrcode.generate(qr, { small: true });
    console.log(qr);
    console.log('====================================');
});

client.on('ready', () => {
    console.log('===== BOT IS READY! =====');
    console.log('06 nummer gekoppeld!');
});

client.on('auth_failure', (m) => console.error('Auth fail', m));
client.on('disconnected', (r) => console.log('Disconnected', r));

client.on('message', async (msg) => {
    if (!msg.from.includes('7850843')) return;
    console.log('CMD van baas: ' + msg.body);
    if (msg.body.toLowerCase().includes('help')) {
        msg.reply('Bot V5 werkt! Stuur: verander website klant 1 naar rood');
    } else if (msg.body.toLowerCase().includes('verander')) {
        msg.reply('Website kleur aangepast! (demo V5)');
    }
});

client.initialize().then(()=>console.log('Initialize gestart V5')).catch(e=>{
    console.error('Init error V5:', e.message);
    console.error(e.stack);
});

setInterval(()=>console.log('Heartbeat V5 - ' + new Date().toISOString()), 30000);
