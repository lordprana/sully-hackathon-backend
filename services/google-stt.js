const { AUDIO_FILE_PATH, supportedLanguages } = require('../constants')
const fs = require('fs')

/**
 * Process audio file and send to Google Speech-to-Text API
 */
const API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_STT_URL = `https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`;

async function processAudio(message) {
  try {
    const audioBuffer = message
    const audioBase64 = audioBuffer.toString("base64");

    const requestBody = {
      config: {
        encoding: "LINEAR16", // Change encoding based on client format
        sampleRateHertz: 16000,
        languageCode: "en-US", // Primary language
        alternativeLanguageCodes: supportedLanguages, // Allow multiple languages
      },
      audio: {
        content: audioBase64,
      },
    };

    const response = await fetch(GOOGLE_STT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log(data)
    if (data.results && data.results.length > 0) {
      const transcript = data.results[0].alternatives[0].transcript;
      const languageCode = data.results[0].languageCode;
      return [transcript, languageCode]
    } else {
      console.log("No transcription available.");
      return ''
      // ws.send("No transcription available.");
    }
  } catch (error) {
    console.error("Google Speech-to-Text API Error:", error);
    return ''
    // ws.send("Error processing audio.");
  } finally {
    // Delete the temp file after processing
    // fs.unlink(AUDIO_FILE_PATH, (err) => {
    //   if (err) console.error("Error deleting temp audio file:", err);
    //   else console.log("Temporary audio file deleted.");
    // });
  }
}

module.exports = {
  processAudio
}
