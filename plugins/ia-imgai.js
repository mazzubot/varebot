import fetch from 'node-fetch'

async function generateImage(prompt) {
    try {
        const imageQuery = encodeURIComponent(prompt + " professional photography, 8k uhd, highly detailed, photorealistic, sharp focus, masterpiece")
        const imageUrl = `https://image.pollinations.ai/prompt/${imageQuery}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000)}`
        
        const response = await fetch(imageUrl)
        if (!response.ok) throw new Error('Failed to fetch image')
        
        const buffer = await response.buffer()
        return buffer.toString('base64')
    } catch (error) {
        console.error('Errore generazione:', error)
        throw new Error('Errore nella generazione dell\'immagine')
    }
}

let handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
    if (!text) {
        return m.reply(`ㅤㅤㅤㅤ⋆｡˚『 🎨 \`IMGAI\` 』˚｡⋆
╭
✦ 『💡』 \`Uso:\` *${usedPrefix + command} <descrizione>*
✧ 『📝』 \`Esempio:\` *${usedPrefix + command} gatto persiano*
✦ 『⚡』 \`Limiti:\`
✧ •  Free: 5 generazioni
✦ •  Premium: ∞ generazioni
╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒`.trim());
    }
    if (!global.db.data.users[m.sender].imgaiUses) {
        global.db.data.users[m.sender].imgaiUses = 0;
    }
    const isPremium = global.db.data.users[m.sender].premium;
    if (!isOwner && !isPremium && global.db.data.users[m.sender].imgaiUses >= 5) {
        return m.reply(`ㅤㅤㅤㅤ⋆｡˚『❌ \`LIMITE\`』˚｡⋆
╭
✦ 『⚠️』 \`Hai usato tutti i tentativi gratuiti!\`
✧
✦ 『✨』 \`Passa a Premium per avere:\`
✧ • Generazioni illimitate
✦ • Risultati prioritari
✧ • Qualità migliore
╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒`.trim());
    }

    try {
        await conn.sendPresenceUpdate('composing', m.chat);
        const startTime = Date.now();
        const enhancedPrompt = `${text}`;
        const imageBase64 = await Promise.race([
            generateImage(enhancedPrompt),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('⌛ Timeout: la generazione ha impiegato troppo tempo')), 45000)
            )
        ]);
        const endTime = Date.now();
        const timeElapsed = ((endTime - startTime) / 1000).toFixed(1);
        if (!isOwner && !isPremium) {
            global.db.data.users[m.sender].imgaiUses++;
        }
        const usesLeft = isPremium ? '∞' : (5 - global.db.data.users[m.sender].imgaiUses);
        await conn.sendMessage(
            m.chat,
            {
                image: Buffer.from(imageBase64, 'base64'),
                caption: `ㅤㅤㅤㅤ⋆｡˚『🎨 \`GENERATA\`』˚｡⋆
╭
✦ 『💭』 \`Prompt:\` *${text}*
✧ 『⏱️』 \`Tempo:\` *${timeElapsed}s*
✦ 『💫』 \`Rimanenti:\` *${usesLeft}*
✧ 『👑』 \`Status:\` *${isPremium ? 'Premium' : 'Free'}*
╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒`.trim(),
                fileName: 'generated_image.png'
            },
            { quoted: m }
        );
        await conn.sendPresenceUpdate('paused', m.chat);
    } catch (error) {
        console.error('Errore:', error);
        m.reply(`ㅤㅤㅤㅤ⋆｡˚『❌ \`ERRORE\`』˚｡⋆
╭
✦ 『⚠️』 \`${error.message}\`
✧ 『🔄』 \`Riprova tra qualche minuto\`
✦ ['💡'] \`Usa un prompt diverso\`
╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒`.trim());
    }
};
handler.help = ['imgai (testo)'];
handler.tags = ['strumenti', 'premium', 'ia', 'iaimmagini'];
handler.command = ['imgai', 'immagina'];
handler.register = true

export default handler;