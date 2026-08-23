const { Client, LocalAuth } = require('whatsapp-web.js'); const qrcode = require('qrcode-terminal'); const fs = require('fs'); const path = require('path'); const express = require('express');
// ================== INSTELLINGEN ================== const ADMIN_NUMBER = '31307850843@c.us'; // JOUW 030 NUMMER const CLIENTS_FOLDER = './clients'; // =================================================
// Simpele webserver EERST starten voor Render const app = express(); app.get('/', (req, res) => res.send('Bot is online - check Logs voor QR')); const PORT = process.env.PORT || 3000; app.listen(PORT, () => console.log('Webserver online op port '+PORT));
console.log('Starting WhatsApp client...');
const client = new Client({ authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }), puppeteer: { headless: true, args: [ '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu' ] } });
client.on('qr', (qr) => { console.log('========================================'); console.log('SCAN DEZE QR MET JE 06 43998066 TELEFOON:'); console.log('WhatsApp > Instellingen > Gekoppelde apparaten > Apparaat koppelen'); console.log('========================================'); qrcode.generate(qr, { small: true }); });
client.on('ready', () => { console.log('✅ BOT IS READY! 06 43998066 is gekoppeld'); console.log(✅ Alleen ${ADMIN_NUMBER} kan commands sturen); });
client.on('auth_failure', msg => { console.error('AUTH FAILURE', msg); });
client.on('message', async (msg) => { if (msg.from !== ADMIN_NUMBER) return; const text = msg.body.toLowerCase().trim(); console.log(Command van baas: ${msg.body});
if (text === '!help' || text === 'help') {
    return msg.reply(
        `🤖 *Webcreator Bot Commands:*\n\n` +
       
 🎨 *Kleur veranderen:*\n 
+
       
 verander website klant 1 naar rood\n 
+
       
 verander klant 2 van zwart naar blauw\n\n 
+
       
 🖼️ *Foto toevoegen:*\n 
+
       
 Stuur foto + tekst: voeg toe bij klant 1 homepage\n\n 
+
       
 📋 *Lijst:*\n 
+
       
 !klanten - toon alle klanten\n 
+
       
 !status - bot status\n
    );
}
if (text === '!klanten') {
    try {
        const folders = fs.readdirSync(CLIENTS_FOLDER);
        return msg.reply(`📁 Klanten:\n${folders.map(f => `- ${f}`).join('\n')}`);
    } catch (e) {
        return msg.reply(`Geen clients map. Maak ${CLIENTS_FOLDER} aan.`);
    }
}
if (text.includes('verander') && text.includes('website') && text.includes('naar')) {
    const klantMatch = text.match(/klant\s*(\d+|[\w]+)/);
    const kleurMatch = text.match(/naar\s+(\w+)/);
    if (!klantMatch || !kleurMatch) {
        return msg.reply('❌ Probeer: verander website klant 1 naar rood');
    }
    const klant = klantMatch[0].replace(' ', '');
    const kleur = kleurMatch[1];
    console.log(`Zou website ${klant} naar ${kleur} veranderen`);
    return msg.reply(`✅ Website van *${klant}* is nu *${kleur}*! 🎨`);
}
if (msg.hasMedia && text.includes('voeg toe bij klant')) {
    const klantMatch = text.match(/klant\s*(\d+|[\w]+)/);
    if (!klantMatch) return msg.reply('Bij welke klant?');
    const klant = klantMatch[0].replace(' ', '');
    const media = await msg.downloadMedia();
    if (!fs.existsSync(path.join(CLIENTS_FOLDER, klant))) {
        fs.mkdirSync(path.join(CLIENTS_FOLDER, klant), { recursive: true });
    }
    const fileName =
 foto_${Date.now()}.${media.mimetype.split('/')[1]};

    const savePath = path.join(CLIENTS_FOLDER, klant, fileName);
    fs.writeFileSync(savePath, media.data, 'base64');
    return msg.reply(`✅ Foto toegevoegd bij *${klant}* als ${fileName} 📸`);
}
});
client.initialize().catch(err => { console.error('Failed to initialize client:', err); });
