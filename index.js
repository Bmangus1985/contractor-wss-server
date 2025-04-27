// contractor-wss-server FINAL version: Express + WSS hybrid

const WebSocket = require('ws');
const express = require('express');
const http = require('http');

// ENV Variables (Hardcoded for now)
const PORT = process.env.PORT || 8080;
const WEBSOCKET_URL = 'wss://contractor-wss-server-production.up.railway.app/'; // <- Your actual WSS URL

// Setup Express
const app = express();

// Webhook for Telnyx to start call (returns valid TeXML immediately)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.all('/webhook', (req, res) => {
  console.log('📞 Incoming Telnyx webhook hit.');

  const response = `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <StartStream url="${WEBSOCKET_URL}" />
      <SpeakSentence voice="female/en_us/callie" language="en-US">Hello! Please tell us what service you are needing today.</SpeakSentence>
    </Response>
  `;

  res.set('Content-Type', 'application/xml');
  res.status(200).send(response.trim());
});

// Simple Home Page for testing
app.get('/', (req, res) => {
  res.send('Contractor WSS Server is live ✅');
});

// Create HTTP server and bind Express + WSS
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('🚀 Telnyx WebSocket audio stream connected.');

  ws.on('message', (data) => {
    console.log('🎙️ Received media packet (size bytes):', data.length);
    // We can later handle Deepgram streaming here...
  });

  ws.on('close', () => {
    console.log('❌ WebSocket connection closed.');
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`🛡️ Contractor hybrid server (HTTP + WSS) running on port ${PORT}`);
});
