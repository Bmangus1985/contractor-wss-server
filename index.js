// index.js (Render-Compatible, Corrected Version)

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { createClient } = require('@deepgram/sdk');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const deepgram = createClient('YOUR_DEEPGRAM_API_KEY');
const openaiApiKey = 'YOUR_OPENAI_API_KEY';

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Root route for manual check
app.get('/', (req, res) => {
  res.send('Contractor WSS Server is up.');
});

// Webhook endpoint for Telnyx
app.get('/webhook', (req, res) => {
  console.log('📞 Webhook hit!');
  res.set({
    'Content-Type': 'application/xml',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });

  const response = `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <StartStream url="wss://contractor-wss-server.onrender.com/media"/>
      <SpeakSentence voice="female/en_us/callie" language="en-US">
        Hello! Please tell us what service you are needing today.
      </SpeakSentence>
    </Response>
  `;

  res.status(200).send(response.trim());
});

// WebSocket server handler
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket connection established');
  let dgSocket;

  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.event === 'start') {
        console.log('🚀 Start event received');
        dgSocket = deepgram.listen.live({
          model: 'general',
          language: 'en-US',
          punctuate: true,
          interim_results: false
        });

        dgSocket.on('transcriptReceived', async (transcription) => {
          const result = JSON.parse(transcription);
          const transcript = result.channel?.alternatives?.[0]?.transcript;
          if (transcript) {
            console.log('🗣️ Heard:', transcript);
            const reply = await getReply(transcript);
            console.log('🤖 Reply:', reply);
          }
        });
      }

      if (data.event === 'media' && dgSocket) {
        const audio = Buffer.from(data.media.payload, 'base64');
        dgSocket.send(audio);
      }

      if (data.event === 'stop' && dgSocket) {
        console.log('🛑 Stop event received');
        dgSocket.finish();
      }
    } catch (err) {
      console.error('❌ Message handling error:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket connection closed');
  });
});

// 🚨 IMPORTANT: Use Render's assigned port ONLY
const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`🛡️ Contractor Hybrid Server running on port ${PORT}`);
});

// GPT-4 integration
async function getReply(input) {
  try {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-1106-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a friendly AI receptionist for a roofing contractor. Help schedule estimates by asking customers their name, address, and best day for an appointment.'
          },
          {
            role: 'user',
            content: input
          }
        ],
        temperature: 0.5,
        max_tokens: 150
      },
      {
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('🧠 GPT-4 Error:', error.message);
    return "I'm having trouble answering that. Please try again later.";
  }
} 
