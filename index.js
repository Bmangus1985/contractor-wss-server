// Contractor hybrid WSS + HTTP server for Telnyx AI receptionist

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
const wss = new WebSocket.Server({ server });

// Serve homepage (optional)
app.get('/', (req, res) => {
  res.send('Contractor AI WSS Server is running.');
});

// Properly formatted Webhook
app.all('/webhook', (req, res) => {
  console.log('📞 Incoming Telnyx webhook hit.');
  
  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <StartStream url="wss://contractor-wss-server-production.up.railway.app/"/>
  <SpeakSentence voice="female/en_us/callie" language="en-US">Hello! Please tell us what service you are needing today.</SpeakSentence>
</Response>`;

  res.set('Content-Type', 'application/xml');
  res.status(200).send(response.trim());
});

// Handle WebSocket connection
wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection established.');

  ws.on('message', (message) => {
    console.log('📥 Received WebSocket message.');
    // Normally, you'd handle Deepgram here
  });

  ws.on('close', () => {
    console.log('❌ WebSocket connection closed.');
  });
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🛡️ Contractor hybrid server (HTTP + WSS) running on port ${PORT}`);
});
