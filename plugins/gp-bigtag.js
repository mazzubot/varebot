const handler = async (m, { conn, text, participants }) => {
  try {
    const cittaragazzi = participants.map((u) => conn.decodeJid(u.id));
    const tagz = async (index) => {
      if (index >= 6) return;
      
      if (m.quoted) {
        const quoted = m.quoted;
        if (quoted.mtype === 'imageMessage') {
          const media = await quoted.download();
          await conn.sendMessage(m.chat, {
            image: media,
            caption: text || quoted.text || '',
            mentions: cittaragazzi
          }, { quoted: m });
        }
        else if (quoted.mtype === 'videoMessage') {
          const media = await quoted.download();
          await conn.sendMessage(m.chat, {
            video: media,
            caption: text || quoted.text || '',
            mentions: cittaragazzi
          }, { quoted: m });
        }
        else if (quoted.mtype === 'audioMessage') {
          const media = await quoted.download();
          await conn.sendMessage(m.chat, {
            audio: media,
            mimetype: 'audio/mp4',
            mentions: cittaragazzi
          }, { quoted: m });
        }
        else if (quoted.mtype === 'documentMessage') {
          const media = await quoted.download();
          await conn.sendMessage(m.chat, {
            document: media,
            mimetype: quoted.mimetype,
            fileName: quoted.fileName,
            caption: text || quoted.text || '',
            mentions: cittaragazzi
          }, { quoted: m });
        }
        else if (quoted.mtype === 'stickerMessage') {
          const media = await quoted.download();
          await conn.sendMessage(m.chat, {
            sticker: media,
            mentions: cittaragazzi
          }, { quoted: m });
        }
        else {
          await conn.sendMessage(m.chat, {
            text: quoted.text || text || '',
            mentions: cittaragazzi
          }, { quoted: m });
        }
      }
      else if (text) {
        await conn.sendMessage(m.chat, {
          text: text,
          mentions: cittaragazzi
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
    console.error('Errore bigtag:', e);
    m.reply(`${global.errore || '❌ Si è verificato un errore'}`);
  }
};

handler.help = ['bigtag'];
handler.tags = ['gruppo'];
handler.command = /^bigtag$/i;
handler.admin = true;
handler.group = true;

export default handler;