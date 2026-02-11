let handler = async (m, { conn, command, usedPrefix }) => {
    let staff = `
ㅤㅤ⋆｡˚『 ╭ \`STAFF VAREBOT\` ╯ 』˚｡⋆\n╭\n│
│ 『 🤖 』 \`Bot:\` *${global.nomebot}*
│ 『 🍥 』 \`Versione:\` *${global.versione}*
│
│⭒─ׄ─『 🌑 \`Creatore\` 』 ─ׄ─⭒
│
│ • \`Nome:\` *sam aka vare*
│ • \`Ruolo:\` *Creatore e dev*
│ • \`Contatto:\` @393514357738
│
│⭒─ׄ─『 🧑🏿‍💻 \`Sviluppatori\` 』 ─ׄ─⭒
│
│ • \`Nome:\` *zexin/giuse*
│ • \`Ruolo:\` *Developer*
│ • \`Contatto:\` @212614769337
│
│ • \`Nome:\` *youns/kinderino*
│ • \`Ruolo:\` *Developer*
│ • \`Contatto:\` @393715983481
│
│─ׄ─『 📌 \`Info Utili\` 』 ─ׄ─⭒
│
│ • \`GitHub:\` *github.com/realvare*
│ • \`Supporto:\` @393514357738
│ • \`Telegram:\` *t.me/realvare*
│ • *instagram.com/samakavare*
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`;
    await conn.reply(
        m.chat, 
        staff.trim(), 
        m, 
        { 
            ...global.fake,
            contextInfo: {
                ...global.fake,
                mentionedJid: ['393514357738@s.whatsapp.net', '212614769337@s.whatsapp.net', '393715983481@s.whatsapp.net'],
                externalAdReply: {
                    renderLargerThumbnail: true,
                    title: 'STAFF - UFFICIALE',
                    body: 'Supporto e Moderazione',
                    mediaType: 1,
                    sourceUrl: 'varebot',
                    thumbnailUrl: 'https://i.ibb.co/rfXDzMNQ/aizenginnigga.jpg'
                }
            }
        }
    );

    await conn.sendMessage(m.chat, {
        contacts: {
            contacts: [
                {
                    vcard: `BEGIN:VCARD
VERSION:3.0
FN:Sam aka Vare
ORG:VareBot - Creatore
TEL;type=CELL;type=VOICE;waid=393514357738:+393514357738
END:VCARD`
                },
                {
                    vcard: `BEGIN:VCARD
VERSION:3.0
FN:Felix
ORG:VareBot - Sviluppatore
TEL;type=CELL;type=VOICE;waid=212614769337:+212614769337
END:VCARD`
                },
                {
                    vcard: `BEGIN:VCARD
VERSION:3.0
FN:Gio
ORG:VareBot - Sviluppatore
TEL;type=CELL;type=VOICE;waid=393715983481:+393715983481
END:VCARD`
                }
            ]
        }
    }, { quoted: m });
};

handler.help = ['staff'];
handler.tags = ['main'];
handler.command = ['staff', 'moderatori', 'collaboratori', 'devs', 'developers', 'developer'];

export default handler;