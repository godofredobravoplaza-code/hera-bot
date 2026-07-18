require('dotenv').config();
const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

// Express App para el "Latido" (Ping) que mantiene a Render despierto
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Hera está viva y escuchando en la nube.');
});

app.listen(PORT, () => {
    console.log(`📡 Servidor de latido corriendo en el puerto ${PORT}`);
});

// URL del Webhook de n8n Cloud
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://phenix2207.app.n8n.cloud/webhook/24bd963b-ffb9-48f6-bea6-3145f5a165af';
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ ERROR: Falta configurar MONGODB_URI en el archivo .env');
    process.exit(1);
}

// Conexión a MongoDB y setup de WhatsApp
console.log('⏳ Conectando a la base de datos MongoDB...');
mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ Conectado a MongoDB. Inicializando sesión remota...');
    const store = new MongoStore({ mongoose: mongoose });
    
    const client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 300000 // Sincroniza cada 5 minutos
        }),
        puppeteer: {
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process',
                '--disable-extensions'
            ]
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
    });

    // Evento: Generar QR para iniciar sesión
    client.on('qr', (qr) => {
        console.log('\n===========================================================');
        console.log('📱 ESCANEA ESTE QR CON TU WHATSAPP (Dispositivos vinculados) 📱');
        qrcode.generate(qr, { small: true });
        console.log('\n🔗 O ABRE ESTE ENLACE PARA VERLO MÁS CLARO:');
        console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
        console.log('===========================================================\n');
    });

    // Evento: Sesión guardada remotamente
    client.on('remote_session_saved', () => {
        console.log('☁️ Sesión de WhatsApp guardada exitosamente en MongoDB (Nube).');
    });

    // Evento: Cliente conectado y listo
    client.on('ready', () => {
        console.log('✅ ¡Hera se ha conectado a WhatsApp exitosamente!');
        console.log('🤖 Escuchando mensajes que empiecen con "Hera," o "Hera "...');
    });

    // Evento: Escuchar mensajes entrantes o enviados por ti mismo
    client.on('message_create', async msg => {
        const text = msg.body.trim();
        
        if (text.toLowerCase().startsWith('hera,') || text.toLowerCase().startsWith('hera ')) {
            console.log(`\n[WhatsApp] Mensaje recibido para Hera: "${text}"`);
            
            try {
                const chatId = msg.fromMe ? msg.to : msg.from;
                console.log('⏳ Esperando respuesta de Hera (n8n Cloud)...');
                
                const response = await axios.post(N8N_WEBHOOK_URL, {
                    chatId: chatId, 
                    message: text,
                    timestamp: msg.timestamp,
                    sender: msg.from
                });
                
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
                    console.log(`✅ Respuesta enviada a WhatsApp: "${replyMessage.substring(0, 50)}..."`);
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
}).catch(err => {
    console.error('❌ Error fatal conectando a MongoDB:', err);
});
