require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// URL del Webhook de n8n Cloud
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://phenix2207.app.n8n.cloud/webhook-test/24bd963b-ffb9-48f6-bea6-3145f5a165af';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Evento: Generar QR para iniciar sesión
client.on('qr', (qr) => {
    console.log('\n===========================================================');
    console.log('📱 ESCANEA ESTE QR CON TU WHATSAPP (Dispositivos vinculados) 📱');
    qrcode.generate(qr, { small: true });
    console.log('===========================================================\n');
});

// Evento: Cliente conectado y listo
client.on('ready', () => {
    console.log('✅ ¡Hera se ha conectado a WhatsApp exitosamente!');
    console.log('🤖 Escuchando mensajes que empiecen con "Hera," o "Hera "...');
});

// Evento: Escuchar mensajes entrantes o enviados por ti mismo
client.on('message_create', async msg => {
    const text = msg.body.trim();
    
    // Condición de seguridad: Solo despertar si el mensaje empieza por "hera" 
    // ignorando mayúsculas y minúsculas (ej. "Hera, busca esto" o "hera recuérdame")
    if (text.toLowerCase().startsWith('hera,') || text.toLowerCase().startsWith('hera ')) {
        console.log(`\n[WhatsApp] Mensaje recibido para Hera: "${text}"`);
        
        try {
            const chatId = msg.fromMe ? msg.to : msg.from;
            console.log('⏳ Esperando respuesta de Hera (n8n Cloud)...');
            
            // Se envía el mensaje al Webhook de n8n Cloud y se ESPERA la respuesta
            const response = await axios.post(N8N_WEBHOOK_URL, {
                chatId: chatId, 
                message: text,
                timestamp: msg.timestamp,
                sender: msg.from
            });
            
            // Extraer la respuesta. Si n8n responde con JSON { output: "mensaje..." }
            let replyMessage = "";
            if (response.data && response.data.output) {
                replyMessage = response.data.output;
            } else if (typeof response.data === 'string') {
                replyMessage = response.data;
            } else if (response.data) {
                replyMessage = JSON.stringify(response.data);
            }
            
            if (replyMessage) {
                await client.sendMessage(chatId, replyMessage);
                console.log(`✅ Respuesta de Hera enviada a WhatsApp: "${replyMessage.substring(0, 50)}..."`);
            } else {
                console.log('⚠️ n8n respondió pero el mensaje estaba vacío.');
            }

        } catch (error) {
            console.error('❌ Error comunicándose con n8n Cloud:', error.message);
            if (error.response) console.error('Detalle del servidor:', error.response.data);
        }
    }
});

client.initialize();
