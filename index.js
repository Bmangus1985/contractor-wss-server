const WebSocket = require('ws');
const express = require('express');
const http = require('http');

// Create Express app
const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('🎧 Telnyx connected to WSS');

  ws.on('message', (message) => {
    console.log('🔊 Received audio stream data');
    // In production, you'd forward this audio to Deepgram here if needed
  });

  ws.on('close', () => {
    console.log('❌ WebSocket connection closed');
  });
});

// Simple GET route to keep server alive
app.get('/', (req, res) => {
  res.send('WSS server is running.');
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🛡️ WSS Server running on port ${PORT}`);
});
