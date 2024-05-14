'use client'
import { useState, useEffect, useRef } from 'react'
import VoiceButton from './components/VoiceButton'
import { FaClipboard } from 'react-icons/fa'

const VoiceAssistantPage = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [results, setResults] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef(null)
  let audioChunks = []

  useEffect(() => {
    navigator.permissions
      .query({ name: 'microphone' })
      .then((permissionStatus) => {
        console.log('Microphone permission status:', permissionStatus.state)
        permissionStatus.onchange = () => {
          console.log(
            'Microphone permission status changed to:',
            permissionStatus.state
          )
        }
      })
  }, [])

  const handlePlayAudio = (index) => {
    const resultsCopy = [...results]
    const result = resultsCopy[index]

    if (!result.isPlaying) {
      result.audio = new Audio(result.audioSrc)
      result.isPlaying = true
      result.buttonText = 'Stop'
      setResults([...resultsCopy]) // Update the state before playing audio

      result.audio.play()
      result.audio.onended = () => {
        result.isPlaying = false
        result.buttonText = 'Play'
        setResults([...resultsCopy]) // Update the state after audio ends
      }
    } else {
      if (result.audio) {
        result.audio.pause()
        result.audio.currentTime = 0
      }
      result.isPlaying = false
      result.buttonText = 'Play'
      setResults([...resultsCopy]) // Update the state to trigger a re-render
    }
  }

  const handleModal = (text) => {
    setModalContent(text)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalContent('')
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(modalContent)
    alert('Text copied to clipboard!')
  }

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
              setIsProcessing(false)
              setIsRecording(false)
              return
            })
        }

        setIsRecording(true)
        setIsProcessing(true)
        const mimeType = 'audio/webm;codecs=opus'
        if (MediaRecorder.isTypeSupported(mimeType)) {
          startMediaRecorder(mimeType)
        } else {
          startMobileRecording()
        }
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

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: mimeType })
          const audioUrl = URL.createObjectURL(audioBlob)
          audioChunks = []

          handleTranscription(audioUrl, audioBlob)
        }
      })
      .catch((error) => {
        console.error('Error accessing media devices:', error)
        alert('Could not access the microphone. Please check your permissions.')
        setIsProcessing(false)
        setIsRecording(false)
      })
  }

  const startMobileRecording = () => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const options = { mimeType: 'audio/x-m4a' }
        const mediaRecorder = new MediaRecorder(stream, options)
        mediaRecorderRef.current = mediaRecorder
        mediaRecorder.start()

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/x-m4a' })
          const audioUrl = URL.createObjectURL(audioBlob)
          audioChunks = []

          handleTranscription(audioUrl, audioBlob)
        }
      })
      .catch((error) => {
        console.error('Error accessing media devices:', error)
        alert('Could not access the microphone. Please check your permissions.')
        setIsProcessing(false)
        setIsRecording(false)
      })
  }

  const handleTranscription = (audioUrl, audioBlob) => {
    const formData = new FormData()
    formData.append(
      'audioData',
      new File([audioBlob], 'recording.m4a', { type: 'audio/x-m4a' })
    )

    fetch('http://localhost:5000/api/transcribe', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        const transcription = data.text
        handleAnswer(transcription, audioUrl)
      })
      .catch((error) => {
        console.error('Error during transcription processing:', error)
      })
  }

  const handleAnswer = (transcription, audioUrl) => {
    fetch('http://localhost:5000/api/answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: transcription }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Parse the stringified JSON data into an object
        const parsedData = JSON.parse(data)
        console.log('Complete response data:', parsedData)

        if (parsedData && parsedData.response) {
          console.log('Answer field:', parsedData.response)
          const answer =
            typeof parsedData.response === 'string'
              ? parsedData.response
              : JSON.stringify(parsedData.response)

          // Update results to include the new data before TTS request
          setResults((prevResults) => [
            ...prevResults,
            {
              transcription,
              audioUrl,
              answer,
              audioSrc: '', // This will be updated by the TTS request
            },
          ])

          requestTTS(transcription, audioUrl, answer) // Send the answer to TTS
        } else {
          console.error('No response field in parsed data:', parsedData)
          throw new Error('No response field in parsed data')
        }
      })
      .catch((error) => {
        console.error('Error during answer processing:', error)
        setResults((prevResults) => [
          ...prevResults,
          {
            transcription,
            audioUrl,
            answer: 'Error processing answer', // Provide a more descriptive error or the error message
            audioSrc: '',
          },
        ])
      })
  }

  const requestTTS = (transcription, audioUrl, answer) => {
    if (!answer) {
      console.error('No answer provided for TTS')
      return
    }

    // Convert the answer to a string if it is an object
    const text = typeof answer === 'string' ? answer : JSON.stringify(answer)

    fetch('http://localhost:5000/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }), // Ensure this matches server expectation
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.blob()
      })
      .then((blob) => {
        const audioSrc = URL.createObjectURL(blob)
        setResults((prevResults) => {
          const updatedResults = [...prevResults]
          updatedResults[updatedResults.length - 1].audioSrc = audioSrc
          return updatedResults
        })
        setIsProcessing(false)
      })
      .catch((error) => {
        console.error('Error fetching audio:', error)
        setResults((prevResults) => {
          const updatedResults = [...prevResults]
          updatedResults[updatedResults.length - 1].audioSrc = ''
          return updatedResults
        })
        setIsProcessing(false)
      })
  }

  const stopRecording = () => {
    setIsRecording(false)
    mediaRecorderRef.current.stop()
  }

  const renderAnswer = (answer) => {
    if (typeof answer === 'string') {
      return <p>{answer}</p>
    }

    if (typeof answer === 'object') {
      return (
        <div>
          {answer.title && <h3 className='font-bold'>{answer.title}</h3>}
          {answer.introduction && <p>{answer.introduction}</p>}
          {answer.ingredients && (
            <div>
              <h4 className='font-bold'>Ingredients</h4>
              <ul>
                {answer.ingredients.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            </div>
          )}
          {answer.instructions && (
            <div>
              <h4 className='font-bold'>Instructions</h4>
              <ol>
                {answer.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>
          )}
          {answer.conclusion && <p>{answer.conclusion}</p>}
        </div>
      )
    }

    return null
  }

  return (
    <>
      <div className='flex flex-col items-center justify-center h-screen bg-blue-100'>
        <VoiceButton onClick={handleRecording} isRecording={isRecording} />
        {isProcessing && (
          <p className='text-lg text-gray-700 mt-2'>Processing...</p>
        )}
        <div className='overflow-x-auto pt-8 relative shadow-md sm:rounded-lg table-container'>
          <table className='w-full text-sm text-left text-gray-500 table'>
            <thead className='text-xs text-gray-700 uppercase bg-gray-50'>
              <tr>
                <th scope='col' className='py-3 px-6'>
                  Transcription
                </th>
                <th scope='col' className='py-3 px-6'>
                  Download Audio
                </th>
                <th scope='col' className='py-3 px-6'>
                  Answer Text
                </th>
                <th scope='col' className='py-3 px-6'>
                  Play Answer
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} className='bg-white border-b'>
                  <td className='py-4 px-6'>
                    {result.transcription.length > 70 ? (
                      <>
                        {result.transcription.substring(0, 70)}...
                        <button
                          onClick={() => handleModal(result.transcription)}
                          className='text-blue-600 hover:underline'>
                          More...
                        </button>
                      </>
                    ) : (
                      result.transcription
                    )}
                  </td>
                  <td className='py-4 px-6'>
                    <a
                      href={result.audioUrl}
                      download
                      className='text-blue-600 hover:underline'>
                      Download
                    </a>
                  </td>
                  <td className='py-4 px-6'>
                    {typeof result.answer === 'string' &&
                    result.answer.length > 70 ? (
                      <>
                        {result.answer.substring(0, 70)}...
                        <button
                          onClick={() => handleModal(result.answer)}
                          className='text-blue-600 hover:underline'>
                          More...
                        </button>
                      </>
                    ) : (
                      renderAnswer(result.answer)
                    )}
                  </td>
                  <td className='py-4 px-6'>
                    <button
                      onClick={() => handlePlayAudio(index)}
                      className='text-blue-600 hover:underline'>
                      {results[index].buttonText || 'Play'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {modalOpen && (
          <div className='absolute top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex items-center justify-center'>
            <div className='bg-white p-8 rounded-lg w-11/12 max-w-lg modal-content'>
              <div className='flex justify-between items-center mb-4 flex-container'>
                <h2 className='text-lg font-bold'>Full Text</h2>
                <button
                  onClick={handleCopyToClipboard}
                  className='text-blue-500 hover:text-blue-700'>
                  <FaClipboard size={20} />
                </button>
              </div>
              {renderAnswer(modalContent)}
              <button
                onClick={closeModal}
                className='bg-blue-500 hover:bg-blue-700 text-white font-bold mt-4 py-2 px-4 rounded mx-auto block'>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default VoiceAssistantPage
