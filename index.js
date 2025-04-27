// Contractor Hybrid Server (HTTP + WebSocket)

const http = require('http');
const WebSocket = require('ws');
const express = require('express');

// Create Express app
const app = express();

// Handle webhook (XML response for Telnyx)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Main webhook for call events
app.post('/webhook', (req, res) => {
  console.log('📞 Incoming Telnyx webhook hit.');

  const response = `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <StartStream url="wss://contractor-wss-server-production.up.railway.app/media" />
      <SpeakSentence voice="female/en_us/callie" language="en-US">Hello! Please tell us what service you are needing today.</SpeakSentence>
    </Response>
  `;

  res.set('Content-Type', 'text/xml');
  res.send(response.trim());
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server (ONLY for /media)
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
  if (request.url === '/media') {
    console.log('🔗 Telnyx is attempting to open a WebSocket connection...');
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    console.log('❌ WebSocket upgrade attempted on unknown path:', request.url);
    socket.destroy();
  }
});

// Handle actual WebSocket connection
wss.on('connection', (ws) => {
  console.log('✅ WebSocket connected!');

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.event === 'start') {
        console.log('🎯 Call media streaming started.');
      } else if (parsed.event === 'media') {
        // Handle media streaming audio here if needed
      } else if (parsed.event === 'stop') {
        console.log('🛑 Call media streaming stopped.');
      } else {
        console.log('📩 Other event:', parsed.event);
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket closed.');
  });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🛡️ Contractor Hybrid Server (HTTP + WSS) running on port ${PORT}`);
});
