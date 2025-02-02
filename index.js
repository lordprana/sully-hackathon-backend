const WebSocket = require('ws')
const express = require('express')
const http = require('http')
const fs = require('fs')
const { processAudio } = require('./services/google-stt')
const { translateAndExtractMetadata, generateTTS } = require('./services/openai')
const { AUDIO_FILE_PATH } = require('./constants')

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const cachedData = {
  targetLanguage: null,
  conversation: [],
}

wss.on('connection', (ws) => {
  console.log('Client connected')

  // Create a writable file stream to store incoming audio data
  // const writeStream = fs.createWriteStream(AUDIO_FILE_PATH);

  ws.on('message', async (message) => {
    console.log(cachedData.targetLanguage)
    if (message.toString() === 'END') {
      console.log('Received END signal. Sending file to Google STT...')
      return
    }
    // writeStream.end(); // Close file stream

    // Process the file once complete
    const [transcript, languageCode] = await processAudio(message)
    if (!transcript) {
      return
    }
    const translationAndMetadata = await translateAndExtractMetadata(transcript, languageCode, cachedData.targetLanguage, cachedData.conversation)

    if (translationAndMetadata.shouldRepeat) {
      const lastTranslation = cachedData.conversation[cachedData.conversation.length - 1].translation
      const audioBuffer = await generateTTS(lastTranslation)
      console.log('sending back audio buffer')
      ws.send(audioBuffer, { binary: true })
      return
    } else if (translationAndMetadata.summary) {
      const audioBuffer = await generateTTS(translationAndMetadata.summary)
      console.log('sending back audio buffer')
      ws.send(audioBuffer, { binary: true })
      return
    }

    cachedData['conversation'].push({
      transcript,
      translation: translationAndMetadata.translation,
    })

    if (languageCode !== 'en-us' && !cachedData.targetLanguage) {
      cachedData['targetLanguage'] = languageCode
      console.log('here 1')
    }
    if (translationAndMetadata.targetLanguage !== 'en-US' && !cachedData.targetLanguage) {
      cachedData['targetLanguage'] = translationAndMetadata.targetLanguage
      console.log('here 2')
    }

    const audioBuffer = await generateTTS(translationAndMetadata.translation)
    console.log('sending back audio buffer')
    ws.send(audioBuffer, { binary: true })
    console.log(translationAndMetadata)
    return

    // console.log("Receiving audio chunk...");
    // writeStream.write(message);
  })

  ws.on('close', () => {
    console.log('Client disconnected')
  })
})

server.listen(5005, () => console.log('WebSocket server running on ws://localhost:5005'))

