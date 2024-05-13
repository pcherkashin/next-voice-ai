import React, { useState, useRef } from 'react'

const HomePage = () => {
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const [audioChunks, setAudioChunks] = useState([])

  const startRecording = async () => {
    setIsRecording(true)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorderRef.current = new MediaRecorder(stream)
    mediaRecorderRef.current.start()
    setAudioChunks([])

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setAudioChunks((prev) => [...prev, event.data])
      }
    }

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audioData', audioBlob)

      const response = await fetch('/api/voice-to-text', {
        method: 'POST',
        body: formData,
      })
      const { text } = await response.json()
      setTranscript(text)
      // Now send this text to text-to-speech
      const speechResponse = await fetch('/api/text-to-speech', {
        method: 'POST',
        body: JSON.stringify({ text }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const { audio } = await speechResponse.json()
      // Handle audio playback here
    }
  }

  const stopRecording = () => {
    setIsRecording(false)
    mediaRecorderRef.current.stop()
  }

  return (
    <div>
      <button onClick={startRecording} disabled={isRecording}>
        Start Recording
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop Recording
      </button>
      <p>Transcription: {transcript}</p>
    </div>
  )
}

export default HomePage
