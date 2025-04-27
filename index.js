const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

// Create Express app
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// HTTP Route: Home (optional)
app.get('/', (req, res) => {
  res.send('Contractor AI WSS Server is alive ✅');
});

// HTTP Route: Webhook for Telnyx
app.all('/webhook', (req, res) => {
  console.log('📞 Incoming Telnyx webhook hit.');

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <StartStream url="wss://contractor-wss-server-production.up.railway.app/media"/>
  <SpeakSentence voice="female/en_us/callie" language="en-US">Hello! Please tell us what service you are needing today.</SpeakSentence>
</Response>`;

  res.set('Content-Type', 'application/xml');
  res.status(200).send(response.trim());
});

// WebSocket Upgrade Handling
server.on('upgrade', (request, socket, head) => {
  if (request.url === '/media') {
    console.log('🔗 Telnyx attempting WebSocket upgrade...');
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    console.log('❌ Invalid WebSocket upgrade path:', request.url);
    socket.destroy();
  }
});

// WebSocket Connection Handling
wss.on('connection', (ws) => {
  console.log('✅ WebSocket connection accepted.');

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);

      if (parsed.event === 'start') {
        console.log('🟢 Telnyx started audio stream.');
      }

      if (parsed.event === 'media') {
        console.log('🎧 Receiving audio packets...');
        // This is where you'd normally send to Deepgram for transcription
      }

      if (parsed.event === 'stop') {
        console.log('🔴 Telnyx ended audio stream.');
      }

    } catch (error) {
      console.error('❗ Error parsing WebSocket message:', error.message);
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket connection closed.');
  });

  ws.on('error', (err) => {
    console.error('❗ WebSocket error:', err.message);
  });
});

// Start the HTTP + WSS server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🛡️ Contractor Hybrid Server (HTTP + WSS) running on port ${PORT}`);
});
