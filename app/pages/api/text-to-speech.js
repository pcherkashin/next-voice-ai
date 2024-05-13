// This file handles text to speech conversion

import { Configuration, OpenAIApi } from 'openai'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { text } = req.body
      const audioResponse = await openai.createSpeech({
        model: 'text-to-speech',
        input: text,
      })
      res.status(200).json({ audio: audioResponse.data.audio })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
