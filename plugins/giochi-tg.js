import fetch from 'node-fetch'
import { FormData } from 'formdata-node'
import { createCanvas, loadImage, registerFont } from 'canvas' // Assicurati di avere i font se necessario
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const __dirname = path.resolve()
const execPromise = promisify(exec)

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// API MIGLIORATA: Usa il modello FLUX di Pollinations (Fotorealistico)
async function generateImage(prompt) {
  // Prompt ottimizzato per il modello Flux
  const cleanPrompt = prompt.replace(/[^a-zA-Z0-9 ]/g, '')
  const enhancedPrompt = `breaking news TV studio, professional news anchor desk, background screen displaying text "${cleanPrompt}", cinematic lighting, 8k resolution, photorealistic, broadcasting atmosphere, modern newsroom`
  const encodedPrompt = encodeURIComponent(enhancedPrompt)
  // Aggiunto &model=flux per qualità superiore
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&model=flux&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`
}

// Funzione opzionale: Catbox (Migliore di ImgBB, keyless e permanente)
// Non usata nel flusso principale per velocità, ma utile se ti serve l'URL
async function uploadToCatbox(buffer) {
  const formData = new FormData()
  formData.append('reqtype', 'fileupload')
  formData.append('fileToUpload', new Blob([buffer]), 'news.jpg')

  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: formData
  })
  return await response.text()
}

async function createNewsImage(newsTitle, backgroundUrl) {
  const canvas = createCanvas(1280, 720)
  const ctx = canvas.getContext('2d')
  
  try {
    const image = await loadImage(backgroundUrl)
    ctx.drawImage(image, 0, 0, 1280, 720)
  } catch (e) {
    // Fallback se l'immagine non carica (sfondo blu scuro generico)
    ctx.fillStyle = '#0a192f'
    ctx.fillRect(0, 0, 1280, 720)
  }
  
  // Overlay Sfumato (Gradiente per leggibilità)
  const gradient = ctx.createLinearGradient(0, 500, 0, 720);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.8)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.95)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 450, 1280, 270);
  
  // Barra rossa Breaking News
  ctx.fillStyle = '#CC0000'
  ctx.fillRect(0, 560, 1280, 50)
  
  // Scritta "BREAKING NEWS" fissa sulla barra rossa
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold italic 30px "Sans"' // Usa un font di sistema sicuro se Roboto non c'è
  ctx.textAlign = 'left'
  ctx.fillText('BREAKING NEWS  •  ULTIM' + 'ORA  •  NOTIZIA IN TEMPO REALE', 140, 595)
  
  // News title
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 38px "Sans"'
  ctx.textAlign = 'left'
  // Ombra per il testo
  ctx.shadowColor = "black";
  ctx.shadowBlur = 5;
  splitText(newsTitle, 45).forEach((line, i) => ctx.fillText(line, 30, 645 + i * 45))
  ctx.shadowBlur = 0; // Reset ombra
  
  // Current date and time
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
  const now = new Date()
  const newsTime = `${days[now.getDay()]} ${now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
  ctx.font = '24px "Sans"'
  ctx.fillText(newsTime, 30, 705)
  
  // News channel branding
  const channels = ['TG VAREBOT', 'VAREBOT 24', 'SKY VAREBOT']
  const newsChannel = channels[Math.floor(Math.random() * channels.length)]
  ctx.font = 'bold italic 32px "Sans"'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#FFD700' // Colore oro
  ctx.fillText(newsChannel, 1250, 705)
  
  // Live indicator (top-left corner)
  ctx.fillStyle = '#CC0000'
  ctx.beginPath()
  ctx.arc(40, 40, 15, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 24px "Sans"'
  ctx.textAlign = 'left'
  ctx.fillText('LIVE', 65, 48)
  
  // Animazione pulsante (simulata statica)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(40, 40, 15, 0, Math.PI * 2)
  ctx.stroke()
  
  return canvas.toBuffer('image/jpeg', { quality: 0.95 })
}

async function createNewsAudio(newsTitle) {
  const ttsFile = path.join(__dirname, './temp', `news_${Date.now()}.mp3`)
  const finalAudioFile = path.join(__dirname, './temp', `final_news_${Date.now()}.mp3`)
  // Assicurati che questo file esista nella cartella del bot!
  const bgAudioPath = path.join(__dirname, './media/audio/tg.mp3') 
  
  if (!fs.existsSync(path.dirname(ttsFile))) fs.mkdirSync(path.dirname(ttsFile), { recursive: true })
  
  const tts = new MsEdgeTTS()
  await tts.setMetadata('it-IT-GianniNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)
  const result = await tts.toStream(newsTitle)
  const ttsBuffer = await streamToBuffer(result.audioStream)

  fs.writeFileSync(ttsFile, ttsBuffer)
  
  // Check se esiste la base audio, altrimenti manda solo TTS
  if (fs.existsSync(bgAudioPath)) {
      await execPromise(`ffmpeg -y -i "${ttsFile}" -i "${bgAudioPath}" -filter_complex "[1:a]volume=0.3[a1];[0:a][a1]amix=inputs=2:duration=shortest" -c:a mp3 "${finalAudioFile}"`)
      return { ttsFile, finalAudioFile, finalPath: finalAudioFile }
  } else {
      return { ttsFile, finalAudioFile: ttsFile, finalPath: ttsFile }
  }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) throw `*⚠️ Edizione Straordinaria*\n\nInserisci la notizia!\nEsempio:\n*${usedPrefix + command}* Varebot eletto miglior bot dell'anno!`
  
  try {
    await m.reply('*🎥 Regia in azione... Generazione TG in corso*')
    
    const newsTitle = text.slice(0, 120)
    
    // 1. Genera Sfondo (Flux Model)
    const backgroundUrl = await generateImage(newsTitle)
    
    // 2. Crea Composizione (Canvas)
    const buffer = await createNewsImage(newsTitle, backgroundUrl)
    
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
    const now = new Date()
    const newsTime = `${days[now.getDay()]} ${now.toLocaleDateString('it-IT')} ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
    
    // 3. Invia direttamente il Buffer (Più veloce, niente API upload)
    await conn.sendFile(m.chat, buffer, 'breaking_news.jpg', 
      `🔴 *EDIZIONE STRAORDINARIA* 📺\n\n📰 *${newsTitle}*\n\n🕒 ${newsTime}\n📡 _In diretta da Varebot Studios_`, m)
    
    // 4. Audio
    try {
        const { ttsFile, finalPath } = await createNewsAudio(newsTitle)
        await conn.sendFile(m.chat, finalPath, 'news_audio.mp3', null, m, true, {
          mimetype: 'audio/mp4',
          ptt: true // Invia come nota vocale
        })
        
        // Pulizia file temporanei
        setTimeout(() => {
            if (fs.existsSync(ttsFile)) fs.unlinkSync(ttsFile)
            if (fs.existsSync(finalPath) && finalPath !== ttsFile) fs.unlinkSync(finalPath)
        }, 5000)
    } catch (e) {
        console.error('Errore Audio:', e)
        // Non bloccare se l'audio fallisce
    }

  } catch (error) {
    console.error(error)
    await m.reply(`*❌ Problemi tecnici in studio:*\n${error.message}`)
  }
}

handler.help = ['tg <notizia>']
handler.tags = ['fun']
handler.command = /^(tg|telegiornale|news|breaking)$/i
handler.group = true

export default handler

function splitText(text, maxLength) {
  const words = text.split(' ')
  const lines = []
  let currentLine = ''
  
  words.forEach(word => {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  })
  if (currentLine) lines.push(currentLine)
  return lines
}