const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve a basic homepage (optional)
app.get('/', (req, res) => {
  res.send('Contractor WSS Server is running.');
});

// Return valid Telnyx XML for incoming call webhook
app.get('/webhook', (req, res) => {
  const responseXml = `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <StartStream url="wss://contractor-wss-server.onrender.com/media" />
      <SpeakSentence voice="female/en_us/callie" language="en-US">
        Hello! Please tell us what service you are needing today.
      </SpeakSentence>
    </Response>
  `;
  res.set('Content-Type', 'text/xml');
  res.send(responseXml.trim());
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server, path: '/media' });

// Handle incoming WebSocket connections from Telnyx
wss.on('connection', (ws) => {
  console.log('🔗 Telnyx media stream connected (WSS).');

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);

      if (parsed.event === 'start') {
        console.log('✅ Start event received.');
      }

      if (parsed.event === 'media') {
        // You can process audio frames here if needed
        console.log('🎙️ Receiving media frames.');
      }

      if (parsed.event === 'stop') {
        console.log('🛑 Stop event received. Closing connection.');
        ws.close();
      }
    } catch (error) {
      console.error('⚠️ Error parsing message:', error.message);
    }
  });

  ws.on('close', () => {
    console.log('❌ Telnyx WebSocket connection closed.');
  });
});

// Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Contractor Hybrid Server (HTTP + WSS) running on port ${PORT}`);
});
