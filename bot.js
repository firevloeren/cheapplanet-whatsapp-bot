error?.statusCode;

      console.log('');
      console.log('⚠️ WhatsApp verbinding gesloten');
      console.log('Statuscode:', statusCode || 'onbekend');

      if (lastDisconnect?.error) {
        console.log(
          'Reden:',
          lastDisconnect.error?.message ||
          String(lastDisconnect.error)
        );
      }

      const loggedOut =
        statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        console.log('');
        console.log('❌ WhatsApp sessie is uitgelogd.');
        console.log('➡️ Er is opnieuw een QR-scan nodig.');
        console.log('');
        return;
      }

      console.log('🔄 Automatisch opnieuw verbinden...');
      scheduleReconnect(5000);
    }

  } catch (error) {
    console.error(
      '❌ connection.update fout:',
      error?.message || error
    );
  }
});

// ==================================================
// BERICHTEN
// ==================================================

sock.ev.on('messages.upsert', async (event) => {
  try {
    const messages = event?.messages || [];

    for (const msg of messages) {
      try {
        if (!msg) continue;
        if (!msg.message) continue;

        // Geen reactie op eigen berichten
        if (msg.key?.fromMe) {
          continue;
        }

        const from = msg.key?.remoteJid;

        if (!from) {
          continue;
        }

        // WhatsApp statusmeldingen overslaan
        if (from === 'status@broadcast') {
          continue;
        }

        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          '';

        console.log('');
        console.log('📩 Nieuw WhatsApp bericht');
        console.log('Van:', from);
        console.log('Tekst:', text || '[geen tekst]');

        // Geen tekst? Dan niets terugsturen.
        if (!text) {
          continue;
        }

        const lowerText = text
          .trim()
          .toLowerCase();

        // TESTCOMMANDO: LIJST
        if (lowerText.includes('lijst')) {
          await sock.sendMessage(from, {
            text:
              '📋 Klanten\n\n' +
              '• Klant A\n' +
              '• Klant B\n\n' +
              `✅ WhatsApp Bot ${VERSION}`
          });

          continue;
        }

        // TESTCOMMANDO: TEST
        if (
          lowerText === 'test' ||
          lowerText === '/test'
        ) {
          await sock.sendMessage(from, {
            text:
             
 ✅ ${VERSION} werkt!\n\n 
+
              'WhatsApp is succesvol gekoppeld.'
          });

          continue;
        }

        // STANDAARD TESTANTWOORD
        await sock.sendMessage(from, {
          text:
           
 ✅ ${VERSION} werkt!\n\n 
+
           
 Je stuurde:\n${text}
        });

      } catch (messageError) {
        console.error('');
        console.error('❌ Bericht verwerken mislukt:');
        console.error(
          messageError?.message ||
          messageError
        );

        // Belangrijk:
        // één slecht bericht mag de hele bot niet stoppen
        continue;
      }
    }

  } catch (error) {
    console.error(
      '❌ messages.upsert fout:',
      error?.message || error
    );
  }
});
} catch (error) { console.error(''); console.error(❌ ${VERSION} STARTFOUT); console.error(error);
scheduleReconnect(10000);
} finally { starting = false; } }
// ====================================================== // START // ======================================================
startBot();
// ====================================================== // HEARTBEAT // ======================================================
setInterval(() => { console.log( 💓 Heartbeat ${VERSION} - ${new Date().toISOString()} ); }, 30000);
// ====================================================== // FOUTAFHANDELING // ======================================================
process.on('unhandledRejection', (reason) => { console.error( '⚠️ Unhandled Promise Rejection:', reason ); });
process.on('uncaughtException', (error) => { console.error( '⚠️ Uncaught Exception:', error ); });
