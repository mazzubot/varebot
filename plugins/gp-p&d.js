var handler = async (m, { conn, text, command, groupMetadata }) => {
  let action, successMsg, errorMsg, helpMsg;
  if (['promote', 'promuovi', 'p'].includes(command)) {
    action = 'promote';
    successMsg = `- 『 👑 』 È stato *promosso* al ruolo di \`amministratore.\``;
    errorMsg = `- 『 ❌ 』 \`Errore nel promuovere l'utente.\``;
    helpMsg = `- 『 👤 』 \`A chi vuoi dare amministratore?\``;
  } else if (['demote', 'retrocedi', 'r'].includes(command)) {
    action = 'demote';
    successMsg = `- 『 👥 』 È stato \`retrocesso\` dal suo ruolo di *amministratore*, ora è un utente qualunque.`;
    errorMsg = `『 ❌ 』 \`Errore nel retrocedere l'utente.\``;
    helpMsg = `『 👤 』 \`A chi vuoi togliere amministratore?\``;
  } else {
    return;
  }

  let number;
  if (m.mentionedJid && m.mentionedJid[0]) {
    number = m.mentionedJid[0].split('@')[0];
  } else if (m.quoted && m.quoted.sender) {
    number = m.quoted.sender.split('@')[0];
  } else if (text && !isNaN(text)) {
    number = text;
  } else if (text) {
    let match = text.match(/@(\d+)/);
    if (match) number = match[1];
  } else {
    return conn.reply(m.chat, helpMsg, m, rcanal);
  }

  if (!number || number.length < 10 || number.length > 15) {
    return conn.reply(m.chat, `『 🩼 』 \`Menziona un numero valido.\``, m, rcanal);
  }

  try {
    let user = number + '@s.whatsapp.net';
    await conn.groupParticipantsUpdate(m.chat, [user], action);
    let ppBuffer;
    const vareb0t = 'https://i.ibb.co/YrWKV59/varebot-pfp.png';
    try {
      const ppUrl = await conn.profilePictureUrl(user, 'image').catch(() => null);
      if (ppUrl) ppBuffer = (await conn.getFile(ppUrl)).data;
    } catch {}
    if (!ppBuffer) {
      try {
        ppBuffer = (await conn.getFile(vareb0t)).data;
      } catch {
        ppBuffer = Buffer.alloc(0);
      }
    }

    const nomegp = groupMetadata?.subject || 'Gruppo';
    let nomeUtente = `@${number}`;
    try {
      const n = await conn.getName(user);
      if (n && typeof n === 'string' && n.trim().length) nomeUtente = n.trim();
    } catch {}
    const contextInfo = {
      ...(global.fake.contextInfo || {}),
      externalAdReply: {
        ...(global.fake.contextInfo || {}),
        title: nomeUtente,
        body: nomegp,
        thumbnail: ppBuffer,
        mediaType: 1,
        renderLargerThumbnail: false,
        sourceUrl: null
      }
    };

    await conn.sendMessage(m.chat, {
      text: successMsg,
      mentions: [user],
      contextInfo
    }, { quoted: m });
  } catch (e) {
    conn.reply(m.chat, errorMsg, m, rcanal);
  }
};

handler.help = ['promuovi', 'retrocedi', 'p', 'r'];
handler.tags = ['gruppo'];
handler.command = ['promote', 'promuovi', 'p', 'demote', 'retrocedi', 'r'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
