// Full new fixed index.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { createClient } = require('@deepgram/sdk');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const deepgram = createClient('YOUR_DEEPGRAM_API_KEY');
const openaiApiKey = 'YOUR_OPENAI_API_KEY';

// Setup middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// WSS for /media stream
const wssMedia = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const { url } = request;
  if (url === '/media') {
    wssMedia.handleUpgrade(request, socket, head, (ws) => {
      wssMedia.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Handle WebSocket media stream
wssMedia.on('connection', (ws) => {
  console.log('🚀 Media stream WebSocket connected.');

  let deepgramConnection;

  ws.on('message', (message) => {
    const parsed = JSON.parse(message);

    if (parsed.event === 'start') {
      console.log('🔔 Stream started.');

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
      console.log('🛑 Stream stopped.');
      if (deepgramConnection) {
        deepgramConnection.finish();
      }
    }
  });

  ws.on('close', () => {
    console.log('❌ Media WebSocket closed.');
  });
});

// Webhook for Telnyx call
app.all('/webhook', (req, res) => {
  console.log('📞 Incoming Telnyx webhook hit.');

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <StartStream url=\"wss://${process.env.RENDER_EXTERNAL_HOSTNAME || 'contractor-wss-server.onrender.com'}/media\" />
  <SpeakSentence voice=\"female/en_us/callie\" language=\"en-US\">Hello! Please tell us what service you are needing today.</SpeakSentence>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.status(200).send(response.trim());
});

// Default route
app.get('/', (req, res) => {
  res.send('Contractor WSS Server is live.');
});

// Start the server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🛡️ Contractor Hybrid Server (HTTP + WSS) running on port ${PORT}`);
});

// GPT-4 Assistant
async function getAssistantReply(customerText) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4-1106-preview',
      messages: [
        { role: 'system', content: 'You are a friendly AI receptionist for a roofing contractor. Help schedule estimates by asking customers their name, address, and best day for an appointment.' },
        { role: 'user', content: customerText }
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
