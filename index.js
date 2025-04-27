// Contractor AI WSS Server - Ultimate Handshake Fixed Version

const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const { createClient } = require('@deepgram/sdk');
const axios = require('axios');
const bodyParser = require('body-parser');

// Express App + Server Setup
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const server = http.createServer(app);

// Deepgram + OpenAI Setup
const deepgram = createClient('964565b31584572965195fca41a9d08d2e1ae170');
const openaiApiKey = `sk-proj-1fAVSCPk27GgzfaK0ukfqYvKfhjQr0DEU-t0D9hRPz0CkM7tF8v1HRz26IsCaPcxL90Em7bhIK3pFLJp_1-ttdhnyt7oUxhTbKo44810szPcMBFg0uvSe2b01mDJAQ1Inn6bKP_FH2SlOUFuygA`;

// Manual WebSocket Upgrade Route
app.get('/media', (req, res) => {
  res.status(426).send('Upgrade Required'); // Force upgrade to WS
});

const wss = new WebSocket.Server({ noServer: true }); // Manual handshake handling

// WebSocket Upgrade Listener
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;

  if (pathname === '/media') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Handle WebSocket Connections
wss.on('connection', (ws) => {
  console.log('🚀 Telnyx WebSocket connection established at /media');

  let deepgramConnection;
  let heartbeatInterval;

  ws.on('message', (message) => {
    const parsed = JSON.parse(message);

    if (parsed.event === 'start') {
      console.log('🔔 Telnyx sent START event');

      // Start heartbeat to keep Telnyx happy
      heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(Buffer.from([0x00, 0x00, 0x00, 0x00]));
        }
      }, 2000);

      deepgramConnection = deepgram.listen.live({
        model: 'general',
        language: 'en-US',
        punctuate: true,
        interim_results: false
      });

      deepgramConnection.on('transcriptReceived', (transcription) => {
        const result = JSON.parse(transcription);
        if (result.channel && result.channel.alternatives[0]) {
          const transcript = result.channel.alternatives[0].transcript;
          if (transcript) {
            console.log('📝 Customer said:', transcript);

            getAssistantReply(transcript).then(reply => {
              console.log('🤖 AI Reply:', reply);
            });
          }
        }
      });
    }

    if (parsed.event === 'media') {
      if (deepgramConnection) {
        const audioData = Buffer.from(parsed.media.payload, 'base64');
        deepgramConnection.send(audioData);
      }
    }

    if (parsed.event === 'stop') {
      console.log('🛑 Telnyx stream stopped');
      if (deepgramConnection) {
        deepgramConnection.finish();
      }
      clearInterval(heartbeatInterval);
    }
  });

  ws.on('close', () => {
    console.log('❌ Telnyx WebSocket closed');
    clearInterval(heartbeatInterval);
  });
});

// Test Route
app.get('/', (req, res) => {
  res.send('Contractor WSS Server is running.');
});

// Telnyx Webhook Route
app.all('/webhook', (req, res) => {
  console.log('📞 Incoming call webhook from Telnyx');

  const websocketUrl = 'wss://contractor-wss-server-production.up.railway.app/media';

  const response = `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <StartStream url="${websocketUrl}" />
      <SpeakSentence voice="female/en_us/callie" language="en-US">Hello! Please tell us what service you are needing today.</SpeakSentence>
    </Response>
  `;
  res.set('Content-Type', 'text/xml');
  res.status(200).send(response.trim());
});

// Start Server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🛡️ Contractor WSS Server running on port ${PORT}`);
});

// GPT-4 Assistant Function
async function getAssistantReply(customerText) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4-1106-preview",
      messages: [
        { role: "system", content: "You are a friendly AI receptionist for a roofing contractor. Help schedule estimates by asking customers their name, address, and best day for an appointment." },
        { role: "user", content: customerText }
      ],
      temperature: 0.3,
      max_tokens: 150
    }, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('GPT-4 Error:', error.response ? error.response.data : error.message);
    return "Sorry, I'm having trouble right now.";
  }
}
