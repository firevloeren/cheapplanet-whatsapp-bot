const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const VERSION = 'V10-FATHERBOT-BRIDGE-QR-PAGE';

const AUTH_DIR =
  process.env.AUTH_DIR ||
  path.join(__dirname, 'baileys_auth');

const FATHERBOT_BRIDGE_URL =
  (process.env.FATHERBOT_BRIDGE_URL || '').trim();

const WHATSAPP_BRIDGE_SECRET =
  (process.env.WHATSAPP_BRIDGE_SECRET || '').trim();

fs.mkdirSync(AUTH_DIR, { recursive: true });

let latestQr = '';
let latestQrDataUrl = '';
let latestQrUpdatedAt = null;
let whatsappReady = false;

// ======================================================
// RENDER WEBSERVER
// ======================================================

const app = express();

app.get('/', (_, res) =>
  res.send(
    `WhatsApp ${VERSION} online - ${new Date().toISOString()}`
  )
);

app.get('/health', (_, res) =>
  res.json({
    status: 'ok',
    version: VERSION,
    whatsappReady,
    hasQr: Boolean(latestQrDataUrl),
    qrUpdatedAt: latestQrUpdatedAt
  })
);

app.get('/qr', (_, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (whatsappReady) {
    return res.send(`<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="5"><title>WhatsApp gekoppeld</title><style>
body{margin:0;background:#07120c;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}.card{max-width:560px;width:100%;background:#0d2116;border:1px solid #285b3d;border-radius:24px;padding:28px;text-align:center;box-sizing:border-box}.ok{font-size:56px}.title{font-size:28px;font-weight:900;margin:8px 0}.muted{color:#b7c9bd;line-height:1.5}</style></head><body><main class="card"><div class="ok">✅</div><div class="title">WhatsApp is gekoppeld</div><p class="muted">${VERSION} is READY. Er hoeft geen QR-code meer gescand te worden.</p></main></body></html>`);
  }

  if (!latestQrDataUrl) {
    return res.status(503).send(`<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="3"><title>QR wordt gemaakt</title><style>
body{margin:0;background:#080808;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}.card{max-width:560px;width:100%;background:#111;border:1px solid #333;border-radius:24px;padding:28px;text-align:center;box-sizing:border-box}.title{font-size:26px;font-weight:900}.muted{color:#aaa;line-height:1.5}</style></head><body><main class="card"><div class="title">QR-code wordt geladen…</div><p class="muted">Deze pagina ververst automatisch.</p></main></body></html>`);
  }

  const updated = latestQrUpdatedAt ? new Date(latestQrUpdatedAt).toLocaleString('nl-NL') : '';
  return res.send(`<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="20"><title>WhatsApp koppelen</title><style>
*{box-sizing:border-box}body{margin:0;background:#070707;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;min-height:100vh;display:grid;place-items:center;padding:18px}.card{width:min(640px,100%);background:#111;border:1px solid #2e2e2e;border-radius:24px;padding:22px;text-align:center}.brand{font-weight:950;font-size:15px;letter-spacing:.12em;color:#86efac;margin-bottom:8px}.title{font-size:28px;font-weight:950;margin:0 0 8px}.muted{color:#aaa;line-height:1.5;margin:0 auto 18px;max-width:520px}.qrbox{background:#fff;border-radius:20px;padding:14px;display:inline-block;max-width:100%}.qrbox img{display:block;width:min(480px,82vw);height:auto;image-rendering:auto}.small{color:#777;font-size:12px;margin-top:14px}.steps{margin:18px auto 0;text-align:left;max-width:520px;color:#ddd;line-height:1.7}.steps b{color:#fff}</style></head><body><main class="card"><div class="brand">WHATSAPP · ${VERSION}</div><h1 class="title">Scan deze QR-code</h1><p class="muted">Dit is altijd de meest recente QR-code van de WhatsApp-bot. De pagina ververst automatisch.</p><div class="qrbox"><img src="${latestQrDataUrl}" alt="Actuele WhatsApp QR-code"></div><div class="steps"><b>Op de WhatsApp-telefoon:</b><br>WhatsApp → Instellingen → Gekoppelde apparaten → Apparaat koppelen → scan deze code.</div><div class="small">QR bijgewerkt: ${updated}</div></main></body></html>`);
});

app.listen(
  process.env.PORT || 3000,
  () => console.log(`Webserver ${VERSION} online`)
);

// ======================================================
// RECONNECT
// ======================================================

let reconnectTimer = null;
let starting = false;

function reconnect(delay = 5000) {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startBot();
  }, delay);
}

// ======================================================
// FATHERBOT BRIDGE
// ======================================================

async function askFatherBot(from, text) {
  if (!FATHERBOT_BRIDGE_URL || !WHATSAPP_BRIDGE_SECRET) {
    return '❌ FatherBot bridge is nog niet ingesteld in Render.';
  }

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    190000
  );

  try {
    const response = await fetch(
      FATHERBOT_BRIDGE_URL,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'Authorization':
            `Bearer ${WHATSAPP_BRIDGE_SECRET}`
        },

        body: JSON.stringify({
          from,
          text
        }),

        signal: controller.signal
      }
    );

    const data =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      return (
        data.reply ||
        `❌ FatherBot HTTP ${response.status}`
      );
    }

    return (
      data.reply ||
      '✅ FatherBot heeft het bericht verwerkt.'
    );

  } catch (err) {
    console.error(
      'FatherBot bridge fout:',
      err?.message || err
    );

    return (
      '❌ FatherBot kon nu niet worden bereikt. ' +
      'Probeer het opnieuw.'
    );

  } finally {
    clearTimeout(timer);
  }
}

// ======================================================
// WHATSAPP START
// ======================================================

async function startBot() {
  if (starting) return;

  starting = true;
  whatsappReady = false;

  try {
    const {
      state,
      saveCreds
    } = await useMultiFileAuthState(AUTH_DIR);

    const sock = makeWASocket({
      auth: state,

      logger: pino({
        level: 'silent'
      }),

      printQRInTerminal: false,

      markOnlineOnConnect: false,

      syncFullHistory: false
    });

    sock.ev.on(
      'creds.update',
      saveCreds
    );

    sock.ev.on(
      'connection.update',
      async ({
        connection,
        lastDisconnect,
        qr
      }) => {

        if (qr) {
          latestQr = qr;
          latestQrUpdatedAt = new Date().toISOString();
          whatsappReady = false;

          try {
            latestQrDataUrl = await QRCode.toDataURL(qr, {
              width: 900,
              margin: 2,
              errorCorrectionLevel: 'M'
            });
          } catch (err) {
            console.error('QR afbeelding maken mislukt:', err?.message || err);
          }

          console.log(
            '===== QR CODE SCAN NU ====='
          );

          qrcodeTerminal.generate(
            qr,
            { small: true }
          );

          console.log(
            '===== EINDE QR ====='
          );
          console.log('Open /qr voor alleen de actuele QR-code.');
        }

        if (connection === 'open') {
          whatsappReady = true;
          latestQr = '';
          latestQrDataUrl = '';
          latestQrUpdatedAt = null;

          console.log(
            `===== ${VERSION} READY =====`
          );
        }

        if (connection === 'close') {

          const code =
            lastDisconnect
              ?.error
              ?.output
              ?.statusCode ||
            lastDisconnect
              ?.error
              ?.statusCode;

          if (
            code !==
            DisconnectReason.loggedOut
          ) {
            reconnect();

          } else {
            whatsappReady = false;
            console.log(
              'WhatsApp is uitgelogd; ' +
              'nieuwe QR-scan vereist.'
            );
          }
        }
      }
    );

    sock.ev.on(
      'messages.upsert',
      async ({ messages }) => {

        for (
          const msg of messages || []
        ) {

          try {
            if (
              !msg?.message ||
              msg.key?.fromMe
            ) {
              continue;
            }

            const from =
              msg.key?.remoteJid;

            if (
              !from ||
              from === 'status@broadcast'
            ) {
              continue;
            }

            const text =
              msg.message?.conversation ||

              msg.message
                ?.extendedTextMessage
                ?.text ||

              msg.message
                ?.imageMessage
                ?.caption ||

              msg.message
                ?.videoMessage
                ?.caption ||

              '';

            if (!text.trim()) {
              continue;
            }

            console.log(
              `WhatsApp -> FatherBot: ${from} ` +
              `(${text.length} tekens)`
            );

            await sock.sendMessage(
              from,
              {
                text:
                  '⏳ FatherBot verwerkt je opdracht…'
              }
            );

            const reply =
              await askFatherBot(
                from,
                text.trim()
              );

            await sock.sendMessage(
              from,
              {
                text:
                  String(reply)
                    .slice(0, 12000)
              }
            );

          } catch (err) {

            console.error(
              'Berichtfout:',
              err?.message || err
            );
          }
        }
      }
    );

  } catch (err) {

    console.error(
      `${VERSION} startfout:`,
      err
    );

    reconnect(10000);

  } finally {

    starting = false;
  }
}

startBot();

setInterval(
  () =>
    console.log(
      `Heartbeat ${VERSION} - ` +
      new Date().toISOString()
    ),
  30000
);

process.on(
  'unhandledRejection',
  reason =>
    console.error(
      'Unhandled rejection:',
      reason
    )
);

process.on(
  'uncaughtException',
  error =>
    console.error(
      'Uncaught exception:',
      error
    )
);
