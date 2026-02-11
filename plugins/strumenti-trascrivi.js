import axios from 'axios';
import { createWriteStream, unlinkSync, createReadStream } from 'fs';
import { join } from 'path';
import { FormData } from 'formdata-node';
import { Blob } from 'buffer';

const aud = 25 * 1024 * 1024;
const img = 10 * 1024 * 1024;
const vid = 50 * 1024 * 1024;
const erpollo = 1500;
const opto = 90000;
const ita = 'it';
const lf = 0.6;
const requestCache = new Map();
const CACHE_TTL = 3600000;

function getCachedResult(key) {
    const cached = requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result;
    }
    return null;
}

function setCachedResult(key, result) {
    requestCache.set(key, {
        result,
        timestamp: Date.now()
    });
}

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            requestCache.delete(key);
        }
    }
}, CACHE_TTL);

function generateCacheKey(m, quoted) {
    const timestamp = Math.floor(Date.now() / 1000);
    const mediaId = quoted?.key?.id || quoted?.id || timestamp;
    return `${m.sender}_${mediaId}`;
}

function createTimeoutPromise(ms, message = '『 ❌ 』- Timeout raggiunto. Il file è troppo lungo o complesso per la massima precisione.') {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), ms);
    });
}

let handler = async (m, { conn, usedPrefix, command }) => {
    const ocrkey = global.APIKeys.ocrspace;
    const assemblykey = global.APIKeys.assemblyai;
    let tempPath;
    let operationStartTime = Date.now();

    try {
        if (!m.quoted) {
            return m.reply(`
ㅤㅤ⋆｡˚『 ╭ \`TRASCRIZIONE\` ╯ 』˚｡⋆\n╭\n│
│ 『 📝 』 - \`Uso:\` *${usedPrefix + command} rispondendo*
│                   *ad un audio/immagine/video*
│
│ 『 ⚠️ 』- _Limiti:_
│ ➤ \`Audio:\` *max 25MB*
│ ➤ \`Immagine:\` *max 10MB*
│ ➤ \`Video:\` *max 50MB*
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`);
        }

        const quoted = m.quoted;
        const mime = quoted.mimetype || '';

        if (!mime.includes('audio') && !mime.includes('image') && !mime.includes('video')) {
            throw new Error('\`Il messaggio deve essere un audio, immagine o video\`');
        }

        const cacheKey = generateCacheKey(m, quoted);
        const cachedResult = getCachedResult(cacheKey);
        if (cachedResult) {
            return m.reply(cachedResult);
        }

        await conn.sendPresenceUpdate('composing', m.chat);

        const operationPromise = (async () => {
            const media = await quoted.download();

            const maxSize = mime.includes('audio') ? aud : 
                           mime.includes('video') ? vid : 
                           img;

            if (media.length > maxSize) {
                throw new Error(`File troppo grande. Max ${mime.includes('audio') ? '25MB' : mime.includes('video') ? '50MB' : '10MB'}`);
            }
            if (mime.includes('audio') || mime.includes('video')) {
                const extension = mime.includes('audio') ? 'mp3' : 'mp4';
                tempPath = join(process.cwd(), 'temp', `media_${Date.now()}.${extension}`);
                const writeStream = createWriteStream(tempPath);
                writeStream.write(media);
                writeStream.end();
                await new Promise((resolve) => writeStream.on('finish', resolve));
                let uploadResponse;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        uploadResponse = await axios.post('https://api.assemblyai.com/v2/upload',
                            createReadStream(tempPath),
                            {
                                headers: {
                                    'authorization': assemblykey,
                                    'content-type': 'application/octet-stream',
                                    'transfer-encoding': 'chunked'
                                },
                                maxContentLength: Infinity,
                                maxBodyLength: Infinity,
                                timeout: Math.max(10000, opto - (Date.now() - operationStartTime))
                            }
                        );
                        break;
                    } catch (e) {
                        if (attempt === 2) throw new Error('Errore durante l\'upload del file');
                        await new Promise(r => setTimeout(r, 1000));
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
                    };

                    if (forceItalian) {
                        payload.language_detection = false;
                        payload.language_code = ita;
                    } else {
                        payload.language_detection = true;
                    }

                    return await axios.post('https://api.assemblyai.com/v2/transcript',
                        payload,
                        {
                            headers: {
                                'authorization': assemblykey,
                                'content-type': 'application/json'
                            },
                            timeout: 10000
                        }
                    );
                };

                const pollTranscript = async (id) => {
                    let transcriptResult;
                    const startTime = Date.now();
                    while (Date.now() - startTime < opto) {
                        
                        try {
                            transcriptResult = await axios.get(
                                `https://api.assemblyai.com/v2/transcript/${id}`,
                                {
                                    headers: { 'authorization': assemblykey },
                                    timeout: 5000
                                }
                            );
                        } catch (e) {
                            await new Promise(r => setTimeout(r, erpollo));
                            continue;
                        }

                        if (transcriptResult.data.status === 'completed') return transcriptResult.data;

                        if (transcriptResult.data.status === 'error') {
                            throw new Error(transcriptResult.data.error || 'Errore durante la trascrizione');
                        }

                        await new Promise(r => setTimeout(r, erpollo));
                    }

                    throw new Error('Timeout: elaborazione troppo lunga');
                };
                const firstTranscript = await createTranscript(false);
                let data = await pollTranscript(firstTranscript.data.id);
                const detectedLang = String(data.language_code || '').trim().toLowerCase();
                const confidence = Number(data.confidence || 0);
                const isLangUnknown = !detectedLang || detectedLang === 'und' || detectedLang === 'unknown';
                const shouldFallbackToItalian = (isLangUnknown || confidence < lf) && detectedLang !== ita;

                if (shouldFallbackToItalian) {
                    const secondTranscript = await createTranscript(true);
                    data = await pollTranscript(secondTranscript.data.id);
                }

                const text = String(data.text || '').trim();
                if (!text) throw new Error('Nessun parlato rilevato nell\'audio/video.');

                const response = `『 📝 』 \`Trascrizione:\`\n\n${text}`;
                setCachedResult(cacheKey, response);
                return response;

            } else {
                const validImageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
                if (!validImageMimes.includes(mime)) {
                    throw new Error('Formato immagine non supportato.');
                }

                const performOCR = async (langCode) => {
                     const formData = new FormData();
                    formData.append('apikey', ocrkey);
                    formData.append('language', langCode);
                    formData.append('OCREngine', '3');
                    formData.append('scale', 'true');
                    formData.append('detectOrientation', 'true');
                    formData.append('isTable', 'true');
                    
                    const fileExtension = mime.split('/')[1] || 'jpg';
                    const blob = new Blob([media], { type: mime });
                    formData.append('file', blob, `image.${fileExtension}`);

                    return await axios.post('https://api.ocr.space/parse/image', formData, {
                        headers: { 'accept': 'application/json' },
                        timeout: Math.max(10000, opto - (Date.now() - operationStartTime))
                    });
                }

                let response;
                try {
                    response = await performOCR('ita');
                } catch (err) {
                    throw new Error('Errore connessione API OCR');
                }
                if (response.data?.ErrorMessage?.includes('language') || 
                   (!response.data?.ParsedResults?.[0]?.ParsedText && !response.data?.IsErroredOnProcessing)) {
                    try {
                        response = await performOCR('eng');
                    } catch (e) {}
                }

                if (!response.data || response.data.IsErroredOnProcessing) {
                    throw new Error(response.data?.ErrorMessage || 'Errore elaborazione immagine');
                }

                const result = response.data.ParsedResults?.[0];
                const text = result?.ParsedText || '';

                if (!text.trim()) {
                    throw new Error('Nessun testo leggibile trovato nell\'immagine.');
                }
                
                const responseText = `『 📝 』 \`Testo OCR:\`\n\n${text.trim()}`;
                setCachedResult(cacheKey, responseText);
                return responseText;
            }
        })();
        const result = await Promise.race([
            operationPromise,
            createTimeoutPromise(opto)
        ]);
        
        await conn.sendMessage(m.chat, { text: result }, { quoted: m });

    } catch (e) {
        console.error('Errore elaborazione:', e);
        const msg = e.message || 'Errore sconosciuto';
        if (!msg.includes('Timeout')) {
             await m.reply(`⚠️ ${msg}`);
        } else {
             await m.reply(`⚠️ ${msg}`);
        }
    } finally {
        if (tempPath) {
            try { unlinkSync(tempPath); } catch {}
        }
    }
};

handler.help = ['trascrivi', 'totext'];
handler.tags = ['strumenti'];
handler.command = ['trascrivi', 'totext'];
handler.register = true;

export default handler;