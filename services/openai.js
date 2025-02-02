const OpenAI = require('openai')
const { zodResponseFormat } = require('openai/helpers/zod')
const { z } = require('zod')
const { supportedLanguages } = require('../constants')

const openai = new OpenAI({
  apiKey: process.env.SULLY_OPENAI_KEY
})

// Define allowed translation languages as an enum
const LanguageEnum = z.enum(supportedLanguages);

// Define intent as an optional enum (or null)
const IntentEnum = z.enum(["Schedule Follow up Appointment, Send Lab Order, Send Referral"]).nullable();

// Define the TranslationObject schema
const TranslationObjectSchema = z.object({
  translation: z.string(), // Ensure translation is not empty
  targetLanguage: LanguageEnum, // Target language must be from predefined enum
  intent: IntentEnum.optional(), // Intent can be an enum or null
  intentParameters: z.string().optional(),
  shouldRepeat: z.boolean(),
  summary: z.string(),
});

const translateAndExtractMetadata = async (string, languageCode, targetLanguage, fullConversation) => {
  if (languageCode === 'en-US' && targetLanguage) {
    string = `Translate to ${targetLanguage}. ${string}`
  }
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "For all of the following tasks, only look at the last message, unless you are asked to summarize the full conversation. You are a translator in a healthcare setting. You will be passed in a string it is your job to translate. If the string is not in english, translate to english. If the string is in english, parse out the target language from the string and supply this in the target language. Strip any translation instruction from the string, and simply translate the content of the string.\n" +
          "Furthermore, you must identify if the string is about scheduling a followup appointment, sending a lab order, or sending a referral. If so, put that in the intent field from the supplied enums and supply as you see fit data describing the intent, such as the date of the followup appointment. Put that in the intentParameters field.\m" +
          "Furthermore, please detect if the user asks you to repeat. If so, set shouldRepeat to true\n" +
          "Finally, if you are asked to summarize, look at the full message history and provide a detailed summary in the summary field in english."
      },
      ...fullConversation.map((fullConversation) => ({
        role: "user",
        content: fullConversation.transcript,
      })),
      {
        role: "user",
        content: string
      }
    ],
    response_format: zodResponseFormat(TranslationObjectSchema, "translation")
  })

  return completion.choices[0].message.parsed
}

const generateTTS = async (string) => {
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: string
  });

  const buffer = Buffer.from(await mp3.arrayBuffer())
  return buffer
}

module.exports = {
  translateAndExtractMetadata,
  generateTTS
}
