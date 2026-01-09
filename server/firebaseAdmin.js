import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ajusta el nombre si tu archivo JSON tiene otro nombre
const serviceAccountPath = path.join(__dirname, '..', 'ramd-b7538-firebase-adminsdk-fbsvc-0bf44802bc.json')
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

export default admin
