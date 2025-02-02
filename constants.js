const path = require('path')

const supportedLanguages = ["es-ES", "pt", "fr", "en-US", "zh"];

const AUDIO_FILE_PATH = path.join(__dirname, "audio_temp.wav");

module.exports = {
  supportedLanguages,
  AUDIO_FILE_PATH
}
