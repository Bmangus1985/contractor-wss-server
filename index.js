const WebSocket = require('ws');
const http = require('http');
const express = require('express');

// Create Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Log that HTTP is running
server.listen(8080, () => {
  console.log('🛡️ Contractor hybrid server (HTTP + WSS) running on port 8080');
});

// Handle Telnyx Webhook for call control
app.all('/webhook', (req, res) => {
  console.log('📞 Incoming Telnyx webhook hit.');

  const websocketUrl = 'wss://contractor-wss-server-production.up.railway.app/';

  const telnyxResponse = `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <StartStream url="${websocketUrl}" />
      <SpeakSentence voice="female/en_us/callie" language="en-US">
        Hello! Please tell us what service you are needing today.
      </SpeakSentence>
    </Response>
  `.trim();

  res.set('Content-Type', 'application/xml');
  res.status(200).send(telnyxResponse);
});

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
  console.log('🔗 New WebSocket connection established.');

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);

      if (parsed.event === 'start') {
        console.log('🟢 Stream start event received:', parsed.start);
      }

      if (parsed.event === 'media') {
        console.log('🎧 Receiving media payload...');
        // Pretend to process audio to keep the stream alive
      }

      if (parsed.event === 'stop') {
        console.log('🔴 Stream stop event received.');
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error.message);
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket connection closed.');
  });
});
