// /pages/api/voice-to-text.js
import multer from 'multer'
import { NextApiRequest, NextApiResponse } from 'next'

// Set up storage using memory storage, which stores files in memory as Buffer objects
const storage = multer.memoryStorage()

// Initialize multer with storage configuration
const upload = multer({ storage: storage })

// Middleware to handle single file upload under the 'audioData' field name
const uploadMiddleware = upload.single('audioData')

// Handler function using Next.js API route syntax
export default function handler(req, res) {
  // Run middleware manually in Next.js
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Handle multer-specific errors here
      return res.status(500).json({ message: err.message })
    } else if (err) {
      // Handle other errors here
      return res.status(500).json({ message: err.message })
    }

    // If no errors, proceed with your logic
    // Now, req.file is the file saved and processed by multer
    console.log(req.file) // You can access file details here

    // You can now proceed to use the file with req.file
    res.status(200).json({ message: 'File processed successfully' })
  })
}
