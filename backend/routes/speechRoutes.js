// backend/routes/speechRoutes.js
import speech from '@google-cloud/speech';
import express from 'express';

const router = express.Router();
const client = new speech.SpeechClient();  // reads GOOGLE_APPLICATION_CREDENTIALS automatically

router.post('/transcribe', async (req, res) => {
  try {
    const { audioContent } = req.body;

    if (!audioContent) {
      return res.status(400).json({ error: 'No audio content provided.' });
    }

    const request = {
      audio:  { content: audioContent },
      config: {
        encoding:        'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode:    'en-US',
      },
    };

    // ✅ Fixed: was missing 'await' — crashed silently before
    const [response] = await client.recognize(request);

    const transcript = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    res.json({ transcript });
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

export default router;