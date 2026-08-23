const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const qrcode = require('qrcode-terminal');
const express = require('express');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const VERSION = 'V9-FATHERBOT-BRIDGE';

const AUTH_DIR =
  process.env.AUTH_DIR ||
  path.join(__dirname, 'baileys_auth');

const FATHERBOT_BRIDGE_URL =
  (process.env.FATHERBOT_BRIDGE_URL || '').trim();

const WHATSAPP_BRIDGE_SECRET =
  (process.env.WHATSAPP_BRIDGE_SECRET || '').trim();

fs.mkdirSync(AUTH_DIR, { recursive: true });

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
    version: VERSION
  })
);

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

    // Auth/sessie bewaren
    sock.ev.on(
      'creds.update',
      saveCreds
    );

    // ==================================================
    // VERBINDING
    // ==================================================

    sock.ev.on(
      'connection.update',
      ({
        connection,
        lastDisconnect,
        qr
      }) => {

        if (qr) {
          console.log(
            '===== QR CODE SCAN NU ====='
          );

          qrcode.generate(
            qr,
            { small: true }
          );

          console.log(
            '===== EINDE QR ====='
          );
        }

        if (connection === 'open') {
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
            console.log(
              'WhatsApp is uitgelogd; ' +
              'nieuwe QR-scan vereist.'
            );
          }
        }
      }
    );

    // ==================================================
    // WHATSAPP BERICHTEN
    // ==================================================

    sock.ev.on(
      'messages.upsert',
      async ({ messages }) => {

        for (
          const msg of messages || []
        ) {

          try {
            // Geen leeg bericht
            // en geen eigen berichten
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

            // Tekst uit verschillende
            // WhatsApp berichttypen halen
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

            // Eerst laten weten dat
            // FatherBot bezig is
            await sock.sendMessage(
              from,
              {
                text:
                  '⏳ FatherBot verwerkt je opdracht…'
              }
            );

            // Bericht naar bestaande
            // FatherBot sturen
            const reply =
              await askFatherBot(
                from,
                text.trim()
              );

            // Antwoord FatherBot
            // terug naar WhatsApp
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

// ======================================================
// START
// ======================================================

startBot();

// ======================================================
// HEARTBEAT
// ======================================================

setInterval(
  () =>
    console.log(
      `Heartbeat ${VERSION} - ` +
      new Date().toISOString()
    ),
  30000
);

// ======================================================
// FOUTAFHANDELING
// ======================================================

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
