// contractor-wss-server/index.js

const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Create WebSocket Server
const wss = new WebSocket.Server({ server });

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve XML at /webhook
app.get('/webhook', (req, res) => {
  const xmlResponse = `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <StartStream url="wss://contractor-wss-server.onrender.com/media"/>
      <SpeakSentence voice="female/en_us/callie" language="en-US">
        Hello! Please tell us what service you are needing today.
      </SpeakSentence>
    </Response>
  `;
  res.set('Content-Type', 'text/xml');
  res.send(xmlResponse.trim());
});

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
  console.log('🚀 New WebSocket connection established.');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      if (message.event === 'start') {
        console.log('✅ Start event received from Telnyx.');

        // 🔥 Immediately ACK the stream start
        ws.send(JSON.stringify({
          event: 'connected',
          streamSid: message.start.streamSid
        }));

      } else if (message.event === 'media') {
        // Media data incoming
        console.log('🎤 Media packet received.');
        // You could process audio here
      } else if (message.event === 'stop') {
        console.log('🛑 Stop event received. Closing connection.');
        ws.close();
      } else {
        console.log('📩 Unhandled event:', message.event);
      }

    } catch (error) {
      console.error('❌ Failed to process incoming WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket connection closed.');
  });
});

// Start the hybrid server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🛡️ Contractor Hybrid Server (HTTP + WSS) running on port ${PORT}`);
});
