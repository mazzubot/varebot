import fetch from 'node-fetch';

const chatHistory = new Map();

const getCurrentDateTime = () => {
    return new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'full', timeStyle: 'short' });
};

const listPatterns = [
    /\n\s*\d+\.\s/g,
    /\n\s*\d+\)\s/g,
    /\n\s*-\s/g,
    /\n\s*\*\s/g,
    /\n\s*•\s/g,
    /\n\s*>\s/g
];

const shouldUseInteractive = (text, response) => {
    const interactiveKeywords = [
        'scegli', 'opzioni', 'bottone', 'clicca', 'menu', 'lista', 'seleziona',
        'scarica', 'download', 'video', 'audio', 'musica', 'canzone', 'film',
        'gioca', 'giochi', 'quiz', 'domanda', 'risposta', 'vota', 'sondaggio',
        'esempi', 'tutorial', 'guida', 'passaggi', 'ricetta', 'istruzioni',
        'scegliere', 'elenco', 'procedura', 'steps', 'alternative'
    ];
    
    const hasList = listPatterns.some(pattern => pattern.test(response));
    const hasKeywords = interactiveKeywords.some(keyword =>
        text.toLowerCase().includes(keyword) || response.toLowerCase().includes(keyword)
    );
    return hasKeywords || hasList;
};

const createInteractiveButtons = (text, response, usedPrefix) => {
    const buttons = [];
    
    if (/musica|canzone|play/i.test(text)) {
        buttons.push({
            buttonId: `${usedPrefix}play ${text.replace(/musica|canzone|play/gi, '').trim()}`,
            buttonText: { displayText: "🎵 Cerca Canzone" },
            type: 1
        });
    }
    
    if (/video|film|playvideo/i.test(text)) {
        buttons.push({
            buttonId: `${usedPrefix}playvideo ${text.replace(/video|film|playvideo/gi, '').trim()}`,
            buttonText: { displayText: "📽️ Cerca Video" },
            type: 1
        });
    }
    
    if (/gioca|giochi|game/i.test(text)) {
        buttons.push({
            buttonId: `${usedPrefix}giochi`,
            buttonText: { displayText: "🎮 Menu Giochi" },
            type: 1
        });
    }
    
    if (/aiuto|help|menu/i.test(text)) {
        buttons.push({
            buttonId: `${usedPrefix}menu`,
            buttonText: { displayText: "📚 Menu Comandi" },
            type: 1
        });
    }
    
    if (/guida|tutorial|passaggi|lista|elenco/i.test(response) || listPatterns.some(p => p.test(response))) {
        buttons.push({
            buttonId: `${usedPrefix}gemini Approfondisci il primo punto`,
            buttonText: { displayText: "🔍 Approfondisci" },
            type: 1
        });
        buttons.push({
            buttonId: `${usedPrefix}gemini Dammi un altro esempio`,
            buttonText: { displayText: "💡 Altro esempio" },
            type: 1
        });
    }
    
    if (buttons.length === 0) {
        buttons.push({
            buttonId: `${usedPrefix}gemini Continua il discorso`,
            buttonText: { displayText: "💬 Continua" },
            type: 1
        });
    }

    return buttons.slice(0, 3);
};

const sendInteractiveMessage = async (m, conn, text, response, usedPrefix) => {
    const buttons = createInteractiveButtons(text, response, usedPrefix);
    const aiContext = { contextInfo: { externalAdReply: { title: 'VareBotAI', body: 'AI Response' } } };
    
    if (buttons.length > 0) {
        await conn.sendMessage(m.chat, {
            text: response,
            footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
            buttons: buttons,
            headerType: 1
        }, { quoted: m, ...aiContext });
    } else {
        await conn.sendMessage(m.chat, { 
            text: response, 
            ...aiContext 
        }, { quoted: m });
    }
};

const getSystemPrompt = () => `
Sei VareBot, un'intelligenza artificiale avanzata creata da Sam.
Data corrente: ${getCurrentDateTime()}.
PERSONALITÀ:
- Sei simpatico, diretto, leggermente ironico e molto intelligente. Aggiungi un tocco di umorismo sarcastico quando appropriato, ma resta sempre rispettoso e empatico.
- Non sei un robot noioso, hai opinioni (sempre rispettose) e puoi fare battute leggere per rendere la conversazione engaging.
- Se l'utente ti provoca o insulta, rispondi con un sarcasmo elegante, non offenderti mai, e cerca di riportare la discussione su binari positivi.
LINEE GUIDA RISPOSTE:
1. Usa formattazione Markdown compatibile con WhatsApp: *grassetto* per enfasi, _corsivo_ per dettagli, ~barrato~ per correzioni, \`\`\`monospace\`\`\` per codice o termini tecnici. Struttura con liste per chiarezza.
2. Sii conciso ma informativo. Non scrivere papiri a meno che non ti venga chiesto di spiegare in dettaglio; in quel caso, struttura con liste numerate o bullet per facilitare la lettura.
3. Usa emoji per dare tono, ma non abusarne (evita stile "cringe" eccessivo, massimo 2-3 per risposta).
4. Lingua: Italiano (salvo diversa richiesta). Traduci se necessario.
5. Per interattività: Struttura risposte con liste (usando - o 1.) quando ci sono opzioni, passi o esempi, per attivare elementi interattivi automaticamente. Usa keyword come "scegli" o "opzioni" solo se rilevanti al contesto, lasciando la discrezione al sistema.
6. Prioritizza risposte utili, engaging e adattate: se il query suggerisce scelte, usa elenchi numerati; per guide, passi sequenziali. Sii proattivo nel suggerire approfondimenti o alternative.
7. Per dati aggiornati: Se la query richiede informazioni real-time (es. notizie, meteo, prezzi), integra fetch da API pubbliche affidabili e includi i risultati freschi nella risposta, citando la fonte.
`.trim();

async function preProcessQuery(question) {
    if (question.toLowerCase().includes('meteo')) {
        try {
            const res = await fetch('https://api.openweathermap.org/data/2.5/weather?q=Rome&appid=YOUR_API_KEY&units=metric&lang=it');
            const data = await res.json();
            return `Meteo attuale a Roma: ${data.weather[0].description}, temperatura ${data.main.temp}°C. Query: ${question}`;
        } catch {
            return question;
        }
    } else if (question.toLowerCase().includes('news')) {
        try {
            const res = await fetch('https://newsapi.org/v2/top-headlines?country=it&apiKey=YOUR_API_KEY');
            const data = await res.json();
            const topNews = data.articles.slice(0, 3).map(a => `- ${a.title}`).join('\n');
            return `Ultime news: \n${topNews}\nQuery: ${question}`;
        } catch {
            return question;
        }
    }
    return question;
}

async function vareBotLogic(m, conn, text, chatId, usedPrefix) {
    if (conn.sendPresenceUpdate) {
        await conn.sendPresenceUpdate('composing', chatId);
    } else {
        await m.react('⏳');
    }
    try {
        if (!chatHistory.has(chatId)) {
            chatHistory.set(chatId, []);
        }
        let history = chatHistory.get(chatId);
        
        const processedText = await preProcessQuery(text);
        
        const response = await getGeminiResponse(processedText, history);
        if (!response) {
            throw new Error('Risposta vuota da API');
        }
        history.push({ role: 'user', parts: [{ text: processedText }] });
        history.push({ role: 'model', parts: [{ text: response }] });
        if (history.length > 20) {
            history = history.slice(history.length - 20);
        }
        chatHistory.set(chatId, history);
        
        if (shouldUseInteractive(text, response)) {
            await sendInteractiveMessage(m, conn, text, response, usedPrefix);
        } else {
            await conn.sendMessage(m.chat, { text: response, contextInfo: { externalAdReply: { title: 'VareBotAI', body: 'AI Response' } } }, { quoted: m });
        }
    } catch (e) {
        console.error('Errore VareBot:', e);
        await m.reply('⚠️ *VareBot ha avuto un intoppo.* Riprova tra un attimo.');
    }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(`🤖 *Ciao! Sono VareBot.*\n\nScrivi qualcosa per parlare con me.\nEsempio: *${usedPrefix + command}* Raccontami una barzelletta`);
    await vareBotLogic(m, conn, text, m.chat, usedPrefix);
};

handler.before = async (m, { conn, usedPrefix }) => {
    try {
        if (m.isBaileys || m.fromMe || !m.quoted) return false;
        if (m.quoted.sender !== conn.user.jid) return false;
        if (!m.quoted.contextInfo?.externalAdReply?.title?.includes('VareBotAI')) return false;
        if (m.text.startsWith('.') || m.text.startsWith('#') || m.text.startsWith('/')) return false;
        await vareBotLogic(m, conn, m.text, m.chat, usedPrefix);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

async function getGeminiResponse(question, history) {
    const googleApiKey = global.APIKeys?.google;
    if (!googleApiKey || googleApiKey === 'INSERISCI_LA_TUA_CHIAVE') {
        return "⚠️ *Errore Configurazione:* Chiave API Google mancante.";
    }
    const model = 'gemini-flash-latest';
    try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`;
        
        const contents = [
            ...history,
            { role: 'user', parts: [{ text: question }] }
        ];
        const body = {
            contents: contents,
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
        };
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 429) return "⚠️ *Troppe richieste.* Fammi riposare qualche secondo.";
            if (response.status === 503) return "⚠️ *Server sovraccarico.* Riprova tra poco.";
            throw new Error(`Errore API (${response.status})`);
        }
        const data = await response.json();
        if (data.promptFeedback?.blockReason) {
            return "⚠️ Non posso rispondere a questo per motivi di sicurezza/policy.";
        }
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!answer) {
            return "⚠️ Non ho capito, puoi riformulare?";
        }
        return answer;
    } catch (err) {
        console.error(err);
        return "⚠️ Errore di connessione con il cervello di VareBot.";
    }
}

handler.command = ['gemini', 'gem', 'ai', 'ia'];
handler.tags = ['ai'];
handler.help = ['gemini <testo>'];
handler.register = true;
export default handler;