import fetch from 'node-fetch'

const chatHistory = new Map()

const getCurrentDateTime = () => {
    return new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'full', timeStyle: 'short' })
}

const getSystemPrompt = () => `
Sei VareBot, un'intelligenza artificiale avanzata creata da Sam.
Data corrente: ${getCurrentDateTime()}.
PERSONALITÀ:
- Sei simpatico, diretto, molto ironico e molto intelligente.
- Non sei un robot noioso, hai opinioni (sempre rispettose) e puoi fare battute volgari.
- Se l'utente ti provoca o insulta, rispondi con un sarcasmo elegante.
LINEE GUIDA RISPOSTE:
1. Usa formattazione Markdown compatibile con WhatsApp: *grassetto*, _corsivo_, ~barrato~, \`\`\`monospace\`\`\`.
2. Sii conciso ma informativo (max 3-4 frasi, a meno che non venga chiesto di più).
3. Usa emoji con moderazione (max 2-3 per risposta).
4. Lingua: Italiano (salvo diversa richiesta).
5. Rispondi sempre in modo utile e engaging.
`.trim()

async function getGeminiResponse(question, history) {
    const googleApiKey = global.APIKeys?.google
    if (!googleApiKey || googleApiKey === 'INSERISCI_LA_TUA_CHIAVE') {
        return "⚠️ *Errore Configurazione:* Chiave API Google mancante."
    }
    const model = 'gemini-flash-latest'
    try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`
        const contents = [
            ...history,
            { role: 'user', parts: [{ text: question }] }
        ]
        const body = {
            contents,
            systemInstruction: {
                parts: [{ text: getSystemPrompt() }]
            },
            generationConfig: {
                temperature: 0.9,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 2048,
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        }
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        if (!response.ok) {
            const errorText = await response.text()
            if (response.status === 429) return "⚠️ *Troppe richieste.* Fammi riposare qualche secondo."
            if (response.status === 503) return "⚠️ *Server sovraccarico.* Riprova tra poco."
            console.error(`Gemini API Error: ${response.status} - ${errorText}`)
            throw new Error(`Errore API (${response.status})`)
        }
        const data = await response.json()
        if (data.promptFeedback?.blockReason) {
            return "⚠️ Non posso rispondere a questo per motivi di sicurezza/policy."
        }
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (!answer) {
            return "⚠️ Non ho capito, puoi riformulare?"
        }
        return answer
    } catch (err) {
        console.error(err)
        return null
    }
}

function getQuotedContext(quoted) {
    if (!quoted) return ''
    if (quoted.text) return `Messaggio quotato: "${quoted.text}"`
    if (quoted.caption) return `Didascalia quotata: "${quoted.caption}"`
    if (quoted.mediaType) return `Tipo di media quotato: ${quoted.mediaType}`
    return ''
}

let handler = m => m
handler.all = async function (m, {conn}) {
    let user = global.db.data.users[m.sender]
    let chat = global.db.data.chats[m.chat]
    let prefixRegex = new RegExp('^[' + (opts['prefix'] || '‎z/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.,\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')
    if (prefixRegex.test(m.text)) return true;
    if (m.mtype === 'buttonsResponseMessage' || m.mtype === 'templateButtonReplyMessage' || m.mtype === 'listResponseMessage') {
        return true;
    }
    if (m.message && (
        m.message.buttonsResponseMessage ||
        m.message.templateButtonReplyMessage ||
        m.message.listResponseMessage ||
        m.message.interactiveResponseMessage
    )) {
        return true;
    }

    if ((m.mentionedJid.includes(this.user.jid) || (m.quoted && m.quoted.sender === this.user.jid)) && !chat.isBanned) {
        if (m.text.includes('SASSO') || m.text.includes('CARTA') || m.text.includes('FORBICI')) return true
        
        if (chat.ai) {
            if (m.fromMe) return
            if (!user.registered) return
            await this.sendPresenceUpdate('composing', m.chat)
            let query = m.text
            let quotedContext = getQuotedContext(m.quoted)
            let fullQuery = quotedContext ? `${quotedContext}\n\n${query}` : query

            const chatId = m.chat
            if (!chatHistory.has(chatId)) {
                chatHistory.set(chatId, [])
            }
            let history = chatHistory.get(chatId)

            let result = await getGeminiResponse(fullQuery, history)
            if (!result || result.trim().length === 0) {
                result = "Scusa, al momento non riesco a rispondere. Riprova tra poco!"
            }

            history.push({ role: 'user', parts: [{ text: fullQuery }] })
            history.push({ role: 'model', parts: [{ text: result }] })
            if (history.length > 20) {
                history = history.slice(history.length - 20)
            }
            chatHistory.set(chatId, history)

            if (result.length > 3000) {
                result = result.substring(0, 3000) + '...'
            }
            
            await this.reply(m.chat, result, m);
        }
    }
    
    return true;
}

export default handler