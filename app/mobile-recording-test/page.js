'use client'
import React, { useState, useRef } from 'react'

const MobileRecordingTestPage = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const mediaRecorderRef = useRef(null)
  let audioChunks = []

  const handleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const startRecording = () => {
    navigator.permissions
      .query({ name: 'microphone' })
      .then((permissionStatus) => {
        console.log('Microphone permission status:', permissionStatus.state)

        if (permissionStatus.state === 'denied') {
          alert(
            'Microphone access is denied. Please enable it in your browser settings.'
          )
          return
        }

        if (permissionStatus.state === 'prompt') {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
              stream.getTracks().forEach((track) => track.stop())
            })
            .catch((error) => {
              console.error('Error accessing media devices:', error)
              alert(
                'Could not access the microphone. Please check your permissions.'
              )
              setIsRecording(false)
              return
            })
        }

        setIsRecording(true)
        const mimeType = 'audio/aac'
        startMediaRecorder(mimeType)
      })
  }

  const startMediaRecorder = (mimeType) => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const options = { mimeType }
        const mediaRecorder = new MediaRecorder(stream, options)
        mediaRecorderRef.current = mediaRecorder
        mediaRecorder.start()
        console.log('Recording started with MIME type:', mimeType)

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: mimeType })
          const url = URL.createObjectURL(audioBlob)
          setAudioUrl(url)
          audioChunks = []
          console.log('Recording stopped, audio URL:', url)
        }
      })
      .catch((error) => {
        console.error('Error accessing media devices:', error)
        alert('Could not access the microphone. Please check your permissions.')
        setIsRecording(false)
      })
  }

  const stopRecording = () => {
    setIsRecording(false)
    mediaRecorderRef.current.stop()
    console.log('Recording stopped')
  }

  return (
    <div className='flex flex-col items-center justify-center h-screen bg-blue-100'>
      <button
        onClick={handleRecording}
        className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {audioUrl && (
        <div className='mt-4'>
          <h3 className='text-lg font-bold'>Recorded Audio</h3>
          <audio controls src={audioUrl}></audio>
        </div>
      )}
    </div>
  )
}

export default MobileRecordingTestPage
