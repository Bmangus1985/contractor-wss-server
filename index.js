const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Create WebSocket server — 🔥 IMPORTANT: No strict protocol negotiation
const wss = new WebSocket.Server({
  server,
  perMessageDeflate: false, // 🔥 Turn off compression (Telnyx doesn't like it)
});

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log('🎧 Telnyx connected to WSS');

  ws.on('message', (message) => {
    console.log('🔊 Received audio stream data');
    // In production, you would stream this to Deepgram or another processor
  });

  ws.on('close', () => {
    console.log('❌ WebSocket connection closed');
  });
});

// Basic GET endpoint to confirm server is alive
app.get('/', (req, res) => {
  res.send('WSS server is running and ready for Telnyx!');
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🛡️ WSS Server running on port ${PORT}`);
});
