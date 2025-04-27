// Contractor AI WSS Server - Final Fixed Version

const WebSocket = require('ws');
const http = require('http');
const { createClient } = require('@deepgram/sdk');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');

// Create Express app
const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({
  server,
  perMessageDeflate: false // IMPORTANT: Turn off compression for Telnyx
});

// Your Deepgram and OpenAI Keys
const deepgram = createClient('964565b31584572965195fca41a9d08d2e1ae170');
const openaiApiKey = `sk-proj-1fAVSCPk27GgzfaK0ukfqYvKfhjQr0DEU-t0D9hRPz0CkM7tF8v1HRz26IsCaPcxL90Em7bhIK3pFLJp_1-ttdhnyt7oUxhTbKo44810szPcMBFg0uvSe2b01mDJAQ1Inn6bKP_FH2SlOUFuygA`;

// Simple HTTP route
app.get('/', (req, res) => {
  res.send('Contractor WSS Server is running.');
});

// Webhook XML for Telnyx
app.all('/webhook', (req, res) => {
  console.log('📞 Incoming call webhook from Telnyx');

  const websocketUrl = 'wss://contractor-wss-server-production.up.railway.app/';

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

// Handle incoming WebSocket connection
wss.on('connection', (ws) => {
  console.log('🚀 New Telnyx WebSocket connection established');

  let deepgramConnection;

  ws.on('message', (message) => {
    const parsed = JSON.parse(message);

    if (parsed.event === 'start') {
      console.log('🔔 Telnyx sent START event');

      // 🔥 Send acknowledgment to Telnyx
      ws.send(JSON.stringify({
        event: "connected",
        message: "Ready to receive media"
      }));

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
    }
  });

  ws.on('close', () => {
    console.log('❌ Telnyx WebSocket closed');
  });
});

// Start HTTP server
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
