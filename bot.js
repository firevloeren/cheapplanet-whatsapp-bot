const { Client, LocalAuth } = require('whatsapp-web.js'); const qrcode = require('qrcode-terminal'); const fs = require('fs'); const path = require('path');
const ADMIN_NUMBER = '31307850843@c.us';
const CLIENTS_FOLDER = './clients';
const client = new Client({ authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }), puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] } });
client.on('qr', (qr) => { console.log('SCAN DEZE QR MET JE 06 43998066 TELEFOON:'); qrcode.generate(qr, { small: true }); });
client.on('ready', () => { console.log('BOT IS READY!'); });
client.on('message', async (msg) => { if (msg.from !== ADMIN_NUMBER) return; const text = msg.body.toLowerCase().trim(); if (text === '!help' || text === 'help') { return msg.reply(🤖 Commands:\nverander website klant 1 naar rood\n!klanten\n!status); } if (text === '!klanten') { try { const folders = fs.readdirSync(CLIENTS_FOLDER); return msg.reply(Klanten: ${folders.join(', ')}); } catch (e) { return msg.reply(Geen clients map); } } if (text.includes('verander') && text.includes('website') && text.includes('naar')) { const klantMatch = text.match(/klant\s*(\d+|[\w]+)/); const kleurMatch = text.match(/naar\s+(\w+)/); if (!klantMatch || !kleurMatch) return msg.reply('Probeer: verander website klant 1 naar rood'); const klant = klantMatch[0].replace(' ', ''); const kleur = kleurMatch[1]; return msg.reply(Website van ${klant} is nu ${kleur}!); } });
client.initialize();
const express = require('express'); const app = express(); app.get('/', (req, res) => res.send('Bot is online')); app.listen(process.env.PORT || 3000);
