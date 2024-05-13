'use client'
import React, { useState, useEffect, useRef } from 'react'
import VoiceButton from './components/VoiceButton'

const VoiceAssistantPage = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [transcription, setTranscription] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [audioSrc, setAudioSrc] = useState('')

  const mediaRecorderRef = useRef(null)
  let audioChunks = []

  const handlePlayAudio = () => {
    if (audioSrc) {
      const audio = new Audio(audioSrc)
      audio.play()
    }
  }

  const handleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  useEffect(() => {
    console.log('setAnswer:', answer)
  }, [answer])

  const startRecording = () => {
    setIsRecording(true)
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const options = { mimeType: 'audio/webm;codecs=opus' }
        const mediaRecorder = new MediaRecorder(stream, options)
        mediaRecorderRef.current = mediaRecorder
        mediaRecorder.start()

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append(
            'audioData',
            new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
          )
          const audioUrl = URL.createObjectURL(audioBlob)
          console.log('Recording stopped. File available at:', audioUrl)
          setAudioUrl(audioUrl)
          audioChunks = []

          handleTranscription(formData)
        }
      })
      .catch((error) => {
        console.error('Error during transcription:', error)
      })
  }

  const handleTranscription = (formData) => {
    fetch('http://localhost:5000/api/transcribe', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Transcription:', data.text)
        setTranscription(data.text)
        handleAnswer(data.text)
      })
      .catch((error) => {
        console.error('Error during transcription processing:', error)
        setTranscription('Error getting transcription')
      })
  }

  const handleAnswer = (prompt) => {
    fetch('http://localhost:5000/api/answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    })
      .then((response) => response.json()) // This assumes the server responds with Content-Type: application/json
      .then((data) => {
        // Parse the stringified JSON data into an object
        const parsedData = JSON.parse(data)
        console.log('Complete response data:', parsedData)

        if (parsedData && parsedData.response) {
          console.log('Answer field:', parsedData.response)
          setAnswer(parsedData.response)
        } else {
          console.error('No response field in parsed data:', parsedData)
          setAnswer('Error: No response found in the API data.')
        }
      })
      .catch((error) => {
        console.error('Error during answer processing:', error)
        setAnswer(`Error processing your request: ${error.message}`)
      })
  }

  const requestTTS = (text) => {
    fetch('http://localhost:5000/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })
      .then((response) => response.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        setAudioSrc(url)
      })
      .catch((error) => {
        console.error('Error fetching audio:', error)
      })
  }

  useEffect(() => {
    if (answer) {
      requestTTS(answer)
    }
  }, [answer])

  const stopRecording = () => {
    setIsRecording(false)
    mediaRecorderRef.current.stop()
  }

  return (
    <>
      <div className='flex flex-col items-center justify-center h-screen bg-blue-100'>
        <VoiceButton onClick={handleRecording} isRecording={isRecording} />
        {audioUrl && (
          <a
            href={audioUrl}
            download='recording.webm'
            className='mt-4 text-lg text-blue-700'>
            Download Recorded Audio
          </a>
        )}
        {transcription && (
          <p className='mt-4 text-lg text-blue-700'>
            Transcription: {transcription}
          </p>
        )}
        {answer && (
          <p className='mt-4 text-lg text-blue-700'>Answer: {answer}</p>
        )}
        {audioSrc && (
          <button
            onClick={handlePlayAudio}
            className='mt-4 bg-blue-500 text-white py-2 px-4 rounded'>
            Play Answer
          </button>
        )}
      </div>
    </>
  )
}

export default VoiceAssistantPage
