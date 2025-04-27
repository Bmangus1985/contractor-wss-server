// contractor-wss-server: Pure WebSocket Server (No Express!)

const WebSocket = require('ws');
const { createClient } = require('@deepgram/sdk');
const axios = require('axios');

// Deepgram and OpenAI Keys
const deepgram = createClient('964565b31584572965195fca41a9d08d2e1ae170');
const openaiApiKey = `sk-proj-1fAVSCPk27GgzfaK0ukfqYvKfhjQr0DEU-t0D9hRPz0CkM7tF8v1HRz26IsCaPcxL90Em7bhIK3pFLJp_1-ttdhnyt7oUxhTbKo44810szPcMBFg0uvSe2b01mDJAQ1Inn6bKP_FH2SlOUFuygA`;

// Create WebSocket Server (WSS ONLY)
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 }, () => {
  console.log('🛡️ Contractor WSS Server running on port 8080');
});

wss.on('connection', (ws, req) => {
  console.log('🔌 New Telnyx WebSocket connection established');

  let deepgramConnection;

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);

      if (parsed.event === 'start') {
        console.log('🔔 Stream started from Telnyx:', parsed.start);

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
        console.log('🛑 Stream stopped from Telnyx.');
        if (deepgramConnection) {
          deepgramConnection.finish();
        }
      }

    } catch (error) {
      console.error('❗ Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket connection closed');
    if (deepgramConnection) {
      deepgramConnection.finish();
    }
  });

  ws.on('error', (err) => {
    console.error('❗ WebSocket error:', err);
  });
});

// Assistant Reply Function
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
