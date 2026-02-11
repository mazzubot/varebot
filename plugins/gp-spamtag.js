const handler = async (m, { conn, args }) => {
  try {
    const mentionedJid = m.mentionedJid[0];

    if (!mentionedJid) {
      return m.reply('❌ *Devi taggare un utente per usare questo comando*\nEsempio: .spamtag @utente');
    }
    let cittaragazzo = conn.decodeJid(mentionedJid);
    if (cittaragazzo.includes('@lid')) {
      const contact = Object.values(conn.store.contacts).find(c => c.lid === cittaragazzo);
      if (contact) {
        cittaragazzo = contact.id;
      }
    }
    const formatText = (inputText) => {
      if (!inputText) return '';
      const cleanNumber = cittaragazzo.split('@')[0].replace(/[^0-9]/g, '');
      return inputText.replace(/@⁨[^⁩]*⁩|@(\d+)/g, `@${cleanNumber}`);
    };

    const tagz = async (index) => {
      if (index >= 6) return;
      
      const text = args.join(' ');
      
      if (m.quoted) {
        const quoted = m.quoted;
        if (quoted.mtype === 'imageMessage') {
          const media = await quoted.download();
          await conn.sendMessage(m.chat, {
            image: media,
            caption: formatText(text || quoted.text || ''),
            mentions: [cittaragazzo]
          }, { quoted: m });
        }
        else if (quoted.mtype === 'videoMessage') {
          const media = await quoted.download();
          await conn.sendMessage(m.chat, {
            video: media,
            caption: formatText(text || quoted.text || ''),
            mentions: [cittaragazzo]
          }, { quoted: m });
        }
        else if (quoted.mtype === 'audioMessage') {
          const media = await quoted.download();
          await conn.sendMessage(m.chat, {
            audio: media,
            mimetype: 'audio/mp4',
            mentions: [cittaragazzo]
          }, { quoted: m });
        }
        else if (quoted.mtype === 'documentMessage') {
          const media = await quoted.download();
          await conn.sendMessage(m.chat, {
            document: media,
            mimetype: quoted.mimetype,
            fileName: quoted.fileName,
            caption: formatText(text || quoted.text || ''),
            mentions: [cittaragazzo]
          }, { quoted: m });
        }
        else if (quoted.mtype === 'stickerMessage') {
          const media = await quoted.download();
          await conn.sendMessage(m.chat, {
            sticker: media,
            mentions: [cittaragazzo]
          }, { quoted: m });
        }
        else {
          await conn.sendMessage(m.chat, {
            text: formatText(quoted.text || text || ''),
            mentions: [cittaragazzo]
          }, { quoted: m });
        }
      }
      else if (text) {
        await conn.sendMessage(m.chat, {
          text: formatText(text),
          mentions: [cittaragazzo]
        }, { quoted: m });
      }
      else {
        return m.reply('❌ *Inserisci un testo o rispondi a un messaggio/media*');
      }
      if (index < 5) {
        setTimeout(() => tagz(index + 1), 1500);
      }
    };
    await tagz(0);
  } catch (e) {
    console.error('Errore spamtag:', e);
    m.reply(`${global.errore}`);
  }
};

handler.help = ['spamtag'];
handler.tags = ['gruppo'];
handler.command = /^spamtag$/i;
handler.admin = true;
handler.group = true;

export default handler;