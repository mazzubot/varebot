let handler = async (m, { conn, text }) => {
    if (!text) return m.reply('『 ⚠️ 』 *Inserisci l\'errore che desideri segnalare._*\n- \`Esempio:\` .report il comando .play non funziona')
    if (text.length < 5) return m.reply('『 ⚠️ 』 *Specifica bene l\'errore, minimo 5 caratteri._*')
    if (text.length > 850) return m.reply('『 ⚠️ 』 *Massimo 850 caratteri per inviare l\'errore._*')

    try {
        let groupInfo = ''
        if (m.isGroup) {
            const groupMetadata = await conn.groupMetadata(m.chat)
            const groupLink = await conn.groupInviteCode(m.chat)
            const fullLink = `https://chat.whatsapp.com/${groupLink}`
            groupInfo = `\│ \`Gruppo:\` ${groupMetadata.subject}\n│ \`Link:\` ${fullLink}`
        } else {
            groupInfo = `\│ \`Chat:\` Privata`
        }

        let smh = `
╭─ׄ⋆✧ \`Segnalazione\` ✧⋆─ׅ⭒
│
│ \`Da:\` wa.me/${m.sender.split('@')[0]}
${groupInfo}
│ \`Messaggio:\` 
│ ${text}
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`
        const ownerNumber = '393476686131@s.whatsapp.net'
        await conn.sendMessage(ownerNumber, {
            text: smh,
            mentions: [m.sender]
        }, { quoted: m })

        return conn.sendMessage(m.chat, {
            text: '『 ✅ 』 *_Report inviato al mio creatore_*\n⚠️ _I report falsi potrebbero causare ban_',
            quoted: m
        })
    } catch (e) {
        console.error(e)
        return m.reply('『 ⚠️ 』 *Errore nell\'invio del report_*')
    }
}

handler.help = ['report']
handler.tags = ['info']
handler.command = /^(report|bug|errore|segnala)$/i

export default handler