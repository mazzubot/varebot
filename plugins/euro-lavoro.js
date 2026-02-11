let cooldowns = {}
const ECONOMY = {
    legal: { xpMin: 300, xpMax: 1500, euroMin: 10, euroMax: 50 },
    illegal: { xpMin: 3000, xpMax: 8000, euroMin: 100, euroMax: 500, arrestoProb: 0.35 },
    penalita: { xp: 2000, euro: 150 }
}
const lavori = [
    { testo: "Hai lavorato come tagliatore di biscotti", emoji: "🍪", keyword: "baker cookie factory" },
    { testo: "Hai servito in un'azienda militare privata", emoji: "🪖", keyword: "mercenary soldier" },
    { testo: "Hai organizzato una degustazione di vini", emoji: "🍷", keyword: "wine tasting sommelier" },
    { testo: "Hai pulito i camini della città", emoji: "🧹", keyword: "chimney sweeper" },
    { testo: "Hai sviluppato un videogioco indie", emoji: "🎮", keyword: "game developer coding" },
    { testo: "Hai fatto straordinari in ufficio", emoji: "💼", keyword: "boring office worker" },
    { testo: "Hai lavorato al mercato rionale", emoji: "🛒", keyword: "market seller fruit" },
    { testo: "Hai cucinato nel ristorante della nonna", emoji: "👩‍🍳", keyword: "chef cooking pasta" },
    { testo: "Hai consegnato pizze in motorino", emoji: "🍕", keyword: "pizza delivery boy" },
    { testo: "Hai potato i cespugli del parco", emoji: "🌳", keyword: "gardener cutting bushes" },
    { testo: "Hai doppiato un cartone animato", emoji: "🎤", keyword: "voice actor studio" },
    { testo: "Hai coltivato il tuo orto", emoji: "🌾", keyword: "farmer tractor" },
    { testo: "Hai costruito castelli di sabbia per turisti", emoji: "🏖️", keyword: "sandcastle builder beach" },
    { testo: "Hai fatto l'artista di strada in centro", emoji: "🎭", keyword: "street mime artist" },
    { testo: "Hai lavorato come ecologista marino", emoji: "🦭", keyword: "marine biologist ocean" },
    { testo: "Hai fatto la mascotte a Disneyland", emoji: "🐼", keyword: "mascot costume park" },
    { testo: "Hai riparato vecchi cabinati arcade", emoji: "🕹️", keyword: "arcade machine repair" },
    { testo: "Hai bonificato una zona tossica", emoji: "🧽", keyword: "hazmat suit cleaning" },
    { testo: "Hai studiato il comportamento dei leoni", emoji: "🦁", keyword: "zoologist lion" },
    { testo: "Hai fatto il barista nel locale chic", emoji: "☕", keyword: "barista coffee art" },
    { testo: "Hai suonato come DJ in discoteca", emoji: "🎧", keyword: "dj club party" },
    { testo: "Hai portato a spasso i cani del quartiere", emoji: "🐶", keyword: "dog walker park" },
    { testo: "Hai fatto foto a un matrimonio", emoji: "📸", keyword: "wedding photographer" },
    { testo: "Hai fatto la guida turistica", emoji: "🗺️", keyword: "tour guide city" },
    { testo: "Hai insegnato yoga al tramonto", emoji: "🧘", keyword: "yoga sunset instructor" },
    { testo: "Hai fatto il bagnino in piscina", emoji: "🏊", keyword: "lifeguard swimming pool" },
    { testo: "Hai riparato un PC pieno di virus", emoji: "🖥️", keyword: "hacker repair computer" },
    { testo: "Hai fatto il pescatore in alto mare", emoji: "🎣", keyword: "fisherman boat storm" },
    { testo: "Hai pilotato droni per riprese aeree", emoji: "🛸", keyword: "drone pilot camera" },
    { testo: "Hai venduto miele artigianale", emoji: "🐝", keyword: "beekeeper honey" }
]
const lavoriIllegali = [
    { testo: "Hai rapinato una banca centrale", emoji: "🏦", keyword: "bank robbery mask money", illegale: true },
    { testo: "Hai contrabbandato diamanti", emoji: "💎", keyword: "diamond thief", illegale: true },
    { testo: "Hai hackerato un conto governativo", emoji: "💻", keyword: "hacker matrix code", illegale: true },
    { testo: "Hai truffato degli anziani online", emoji: "🕵️‍♂️", keyword: "scammer computer", illegale: true },
    { testo: "Hai rubato un'auto sportiva", emoji: "🚗", keyword: "grand theft auto car", illegale: true },
    { testo: "Hai venduto merci contraffatte", emoji: "👜", keyword: "fake bag street seller", illegale: true },
    { testo: "Hai gestito un giro di scommesse clandestine", emoji: "🎲", keyword: "illegal gambling poker", illegale: true }
]

let tuttiLavori = lavori.concat(lavoriIllegali);

let handler = async (m, { conn, isPrems }) => {
    let user = global.db.data.users[m.sender]
    user.exp = Number(user.exp)
    if (!Number.isFinite(user.exp) || user.exp < 0) user.exp = 0
    user.euro = Number(user.euro)
    if (!Number.isFinite(user.euro)) user.euro = 0
    let tempo = 5 * 60
    if (cooldowns[m.sender] && Date.now() - cooldowns[m.sender] < tempo * 1000) {
        const tempoRimanente = secondiAHMS(Math.ceil((cooldowns[m.sender] + tempo * 1000 - Date.now()) / 1000))
        conn.reply(m.chat, ` ⋆｡˚『 ╭ \`LAVORO VAREBOT\` ╯ 』˚｡⋆\n╭\n│\n│ 『 ⏳ 』 *Sei stanco!*\n│ Aspetta ancora *${tempoRimanente}* prima di tornare a lavorare.\n│\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`, m)
        return
    }
    let lavoroObj = scegliCasuale(tuttiLavori)
    let guadagnoXP = 0
    let guadagnoEuro = 0
    let arrestato = false
    if (lavoroObj.illegale) {
        if (Math.random() < ECONOMY.illegal.arrestoProb) {
            arrestato = true
            guadagnoXP = -ECONOMY.penalita.xp
            guadagnoEuro = -ECONOMY.penalita.euro
        } else {
            guadagnoXP = randomInt(ECONOMY.illegal.xpMin, ECONOMY.illegal.xpMax)
            guadagnoEuro = randomInt(ECONOMY.illegal.euroMin, ECONOMY.illegal.euroMax)
        }
    } else {
        guadagnoXP = randomInt(ECONOMY.legal.xpMin, ECONOMY.legal.xpMax)
        guadagnoEuro = randomInt(ECONOMY.legal.euroMin, ECONOMY.legal.euroMax)
    }
    cooldowns[m.sender] = Date.now()
    if (arrestato) {
        user.exp = Math.max(0, user.exp + guadagnoXP)
        user.euro = Math.max(0, user.euro + guadagnoEuro)
    } else {
        user.exp += guadagnoXP
        user.euro += guadagnoEuro
    }
    const imageQuery = encodeURIComponent(lavoroObj.keyword + " realistic style detailed high quality")
    const imageUrl = `https://image.pollinations.ai/prompt/${imageQuery}?width=800&height=450&nologo=true&seed=${randomInt(1, 1000)}`
    let caption = `
 ⋆｡˚『 ╭ \`LAVORO VAREBOT\` ╯ 』˚｡⋆
╭
│
│ 『 ${lavoroObj.emoji} 』 _*Attività Svolta:*_
│ ${lavoroObj.testo}
│
│${arrestato 
    ? `『 🚨 』 *SEI STATO ARRESTATO!*\n│ 『 👮 』 La polizia ti ha preso.\n│ 『 📉 』 *Perdite:* ${guadagnoEuro} Euro | ${guadagnoXP} XP`
    : `『 💰 』 _*Paga Ricevuta*_\n│ 『 ⭐ 』 *XP Guadagnati:* ${toNum(guadagnoXP)}\n│ 『 💵 』 *Euro Guadagnati:* ${guadagnoEuro}`
}
│
│ 『 💼 』 _*Saldo Attuale:*_ ${toNum(user.euro)} Euro_
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*
`
    try {
        await conn.sendMessage(m.chat, { 
            image: { url: imageUrl }, 
            caption: caption.trim() 
        }, { quoted: m })
    } catch (e) {
        console.error("Errore caricamento immagine lavoro:", e)
        conn.reply(m.chat, caption.trim(), m)
    }
}

handler.help = ['lavorare']
handler.tags = ['economy']
handler.command = ['work', 'lavorare', 'lavoro', 'w']
handler.register = true 

export default handler

function toNum(number) {
    if (number >= 1000 && number < 1000000) {
        return (number / 1000).toFixed(1) + 'k'
    } else if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M'
    } else {
        return number.toString()
    }
}

function secondiAHMS(secondi) {
    let minuti = Math.floor((secondi % 3600) / 60)
    let secondiRimanenti = secondi % 60
    return `${minuti}m ${secondiRimanenti}s`
}

function scegliCasuale(lista) {
    return lista[Math.floor(lista.length * Math.random())];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}