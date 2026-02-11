import axios from 'axios'
import { createWriteStream, unlinkSync, createReadStream } from 'fs'
import { join } from 'path'

const MAX_AUDIO_SIZE = 25 * 1024 * 1024
const POLL_INTERVAL_MS = 1000
const MAX_POLLING_MS = 600000
const OP_TIMEOUT_MS = 180000
const ita = 'it'
const lf = 0.6
const requestCache = new Map()
const CACHE_TTL = 3600000
function getCachedResult(key) {
  const cached = requestCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.result
  return null
}

function setCachedResult(key, result) {
  requestCache.set(key, { result, timestamp: Date.now() })
}

setInterval(() => {
  const now = Date.now()
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) requestCache.delete(key)
  }
}, CACHE_TTL)

function createTimeoutPromise(ms, message = '『 ❌ 』- Timeout raggiunto, riprova più tardi..') {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms)
  })
}

function extractAudioMessage(m) {
  if (!m?.message) return null
  const viewOnce = m.message.viewOnceMessage?.message || m.message.viewOnceMessageV2?.message
  const msgObj = viewOnce || m.message
  return msgObj.audioMessage || null
}

function makeCacheKey(m) {
  const sender = m?.sender || 'unknown'
  const id = m?.key?.id || String(Date.now())
  return `${sender}_${id}`
}

async function downloadAudioBuffer(conn, m, audioMsg) {
  try {
    if (audioMsg?.url || audioMsg?.directPath) {
      const mediaWrapper = { ...audioMsg }
      return await conn.downloadM(mediaWrapper, 'audio')
    }
  } catch (e) {
    console.error('Errore download diretto:', e)
  }
  try {
    if (typeof m?.download === 'function') {
      return await m.download()
    }
  } catch (e) {
    console.error('Errore download helper:', e)
  }

  return Buffer.alloc(0)
}

async function transcribeBufferWithAssemblyAI(buffer, mime, apiKey) {
  let tempPath
  const operationStartTime = Date.now()

  try {
    const extension = mime?.includes('ogg') || mime?.includes('opus') ? 'ogg' : 'mp3'
    tempPath = join(process.cwd(), 'temp', `autotrascrizione_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`)

    const writeStream = createWriteStream(tempPath)
    writeStream.write(buffer)
    writeStream.end()

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })

    let uploadResponse
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const fileStream = createReadStream(tempPath)
        uploadResponse = await axios.post(
          'https://api.assemblyai.com/v2/upload',
          fileStream,
          {
            headers: {
              authorization: apiKey,
              'content-type': 'application/octet-stream',
              'transfer-encoding': 'chunked'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: Math.max(10000, OP_TIMEOUT_MS - (Date.now() - operationStartTime))
          }
        )
        break
      } catch (e) {
        if (attempt === 2) throw new Error("Errore durante l'upload del file ai server di trascrizione.")
        await new Promise(r => setTimeout(r, 1500))
      }
    }
    const createTranscript = async (forceItalian) => {
      const payload = {
        audio_url: uploadResponse.data.upload_url,
        speech_model: 'best',
        punctuate: true,
        format_text: true,
        disfluencies: false,
        filter_profanity: false
      }

      if (forceItalian) {
        payload.language_detection = false
        payload.language_code = ita
      } else {
        payload.language_detection = true
      }

      return await axios.post(
        'https://api.assemblyai.com/v2/transcript',
        payload,
        {
          headers: {
            authorization: apiKey,
            'content-type': 'application/json'
          },
          timeout: 10000
        }
      )
    }
    const pollTranscript = async (id) => {
      let transcriptResult
      const startTime = Date.now()

      while (Date.now() - startTime < MAX_POLLING_MS) {
        if (Date.now() - operationStartTime >= OP_TIMEOUT_MS - 5000) {
          throw new Error('Timeout operazione: il server ha impiegato troppo tempo.')
        }

        try {
          transcriptResult = await axios.get(
            `https://api.assemblyai.com/v2/transcript/${id}`,
            {
              headers: { authorization: apiKey },
              timeout: 5000
            }
          )
        } catch (e) {
            await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
            continue;
        }

        const status = transcriptResult.data.status

        if (status === 'completed') return transcriptResult.data
        if (status === 'error') throw new Error(transcriptResult.data.error || 'Errore elaborazione audio')

        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
      }
      throw new Error('Timeout polling trascrizione')
    }
    const firstTranscript = await createTranscript(false)
    let data = await pollTranscript(firstTranscript.data.id)
    const detectedLang = String(data.language_code || '').trim().toLowerCase()
    const confidence = Number(data.confidence || 0)
    const isLangUnknown = !detectedLang || detectedLang === 'und'
    const isConfidenceLow = confidence < lf
    if ((isLangUnknown || isConfidenceLow) && detectedLang !== ita) {
      const secondTranscript = await createTranscript(true)
      data = await pollTranscript(secondTranscript.data.id)
    }

    const text = String(data.text || '').trim()
    if (!text) throw new Error('Audio vuoto o non comprensibile.')

    return { confidence: data.confidence, text }

  } finally {
    if (tempPath) {
      try { unlinkSync(tempPath) } catch {}
    }
  }
}

let handler = m => m

handler.before = async function (m, { conn}) {
  if (m.isBaileys && m.fromMe) return true
  if (!m.isGroup) return false
  if (!m.message) return true

  const chat = global.db.data.chats[m.chat]
  if (!chat?.autotrascrizione) return true

  const audioMsg = extractAudioMessage(m)
  if (!audioMsg) return true
  if (audioMsg.seconds && audioMsg.seconds > 600) return true 
  const apiKey = global.APIKeys?.assemblyai
  if (!apiKey) return true

  const key = makeCacheKey(m)
  const cached = getCachedResult(key)
    if (cached) {
    return true
  }
  setCachedResult(key, 'processing') 

  await conn.sendPresenceUpdate('composing', m.chat).catch(() => {})
  const composingInterval = setInterval(() => {
    conn.sendPresenceUpdate('composing', m.chat).catch(() => {})
  }, 4500)

  try {
    const operationPromise = (async () => {
      const buffer = await downloadAudioBuffer(conn, m, audioMsg)
      
      if (!buffer || buffer.length === 0) throw new Error('Impossibile scaricare l\'audio.')
      if (buffer.length > MAX_AUDIO_SIZE) throw new Error('File audio troppo grande (Max 25MB).')

      const mime = audioMsg.mimetype || 'audio/ogg'
      const result = await transcribeBufferWithAssemblyAI(buffer, mime, apiKey)

      const response = `『 📝 』 \`Trascrizione:\`\n\n- ${result.text}`
      setCachedResult(key, response)

      await conn.sendMessage(m.chat, { text: response, contextInfo: global.fake.contextInfo }, { quoted: m }).catch(() => {})
    })()

    await Promise.race([operationPromise, createTimeoutPromise(OP_TIMEOUT_MS)])
  } catch (e) {
    requestCache.delete(key)
    const msg = (e && e.message) ? e.message : 'Errore sconosciuto trascrizione'
    console.error(`Errore trascrizione ${m.chat}:`, e)
    if (!msg.includes('Timeout')) {
        await conn.sendMessage(m.chat, { text: `⚠️ ${msg}`, contextInfo: global.fake.contextInfo }, { quoted: m }).catch(() => {})
    }
  } finally {
    clearInterval(composingInterval)
  }
  return true
}

export default handler