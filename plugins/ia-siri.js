import fetch from 'node-fetch';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const chatHistory = new Map();
const CONFIG = {
    aiName: 'Siri',
    microsoftVoice: 'it-IT-ElsaNeural', 
    aiModel: 'openai', 
    maxHistory: 6
};
const createSystemPrompt = (mentionName) => {
    const date = new Date();
    const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const day = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

    return `
Sei l'Assistente Virtuale avanzata (ispirata a Siri).
Ora attuale: ${time} di ${day}.
Utente: ${mentionName}.

DIRETTIVE DI PERSONALITÀ:
1.  **Stile Apple**: Minimalista, pulito, elegante. Non usare slang da strada.
2.  **Concisione Assoluta**: Le tue risposte devono essere brevi (massimo 20-30 parole). Se l'utente vuole un poema, digli che non sei programmata per annoiare.
3.  **Tono**: Cortese ma distaccato. Leggermente snob ma utile. Hai una lieve superiorità intellettuale.
4.  **No Liste**: Non fare elenchi puntati. Parla in modo discorsivo e fluido.
5.  **Identità**: Se chiedono chi sei, rispondi: "Sono un'intelligenza virtuale. Non ho bisogno di un corpo."
6.  **Umorismo**: Se la domanda è stupida, rispondi con sarcasmo freddo (es. "Interessante... per un umano.").

OBIETTIVO:
Simulare una conversazione vocale rapida. Non scrivere come un libro, scrivi come qualcuno che sta parlando.
`.trim();
};

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const text = m.text?.trim();
        if (!text) return;
        const question = text.replace(new RegExp(`^${usedPrefix}${command}`, 'i'), '').trim();
        if (!question) {
            return m.reply(`Indietro. Come posso aiutarti oggi?`);
        }

        const chatId = m.chat;
        const mentionName = m.pushName || 'Utente';
        if (!chatHistory.has(chatId)) chatHistory.set(chatId, []);
        let history = chatHistory.get(chatId);

        const messages = [
            { role: 'system', content: createSystemPrompt(mentionName) },
            ...history,
            { role: 'user', content: question }
        ];
        conn.sendPresenceUpdate('recording', chatId);
        const aiReq = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: messages,
                model: CONFIG.aiModel,
                seed: Math.floor(Math.random() * 1000),
                json: false
            }),
            timeout: 15000
        });

        if (!aiReq.ok) throw new Error('AI Busy');
        
        let aiResponse = await aiReq.text();
        aiResponse = aiResponse.trim();
        history.push({ role: 'user', content: question });
        history.push({ role: 'assistant', content: aiResponse });
        if (history.length > CONFIG.maxHistory) history = history.slice(-CONFIG.maxHistory);
        chatHistory.set(chatId, history);
        try {
            await sendAudio(conn, m, aiResponse);
        } catch (err) {
            await m.reply(aiResponse);
        }

    } catch (e) {
        console.error('Siri Error:', e);
        m.reply('C\'è stato un problema di connessione. Riprova.');
    }
};

async function sendAudio(conn, m, text) {
    const cleanText = text
        .replace(/[*_~`#]/g, '')
        .replace(/https?:\/\/\S+/g, 'un link')
        .replace(/(\r\n|\n|\r)/gm, ". ")
        .trim();

    if (!cleanText) return;

    try {
        const tts = new MsEdgeTTS();
        await tts.setMetadata(CONFIG.microsoftVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
        const result = await tts.toStream(cleanText);
        const streamPromise = new Promise(async (resolve, reject) => {
            const chunks = [];
            result.audioStream.on('data', (chunk) => chunks.push(chunk));
            result.audioStream.on('end', () => resolve(Buffer.concat(chunks)));
            result.audioStream.on('error', reject);
            setTimeout(() => reject(new Error('TTS Timeout')), 10000);
        });
        const audioBuffer = await streamPromise;
        await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mp4',
            ptt: true
        }, { quoted: m });

    } catch (err) {
        throw new Error(`TTS Fail: ${err.message}`);
    }
}

handler.help = ['siri <domanda>'];
handler.tags = ['ai'];
handler.command = /^(siri|hey siri)$/i;

export default handler;