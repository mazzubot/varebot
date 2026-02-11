export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isSam }) {
  if (!m.isGroup) return false

  const chat = global.db.data.chats[m.chat]
  if (!chat?.antimedia) return false

  if (m.fromMe || isAdmin || isOwner || isSam) return false
  if (!isBotAdmin) return false
  if (
    m.message?.viewOnceMessage ||
    m.message?.viewOnceMessageV2 ||
    m.message?.viewOnceMessageV2Extension
  ) {
    return false
  }
  const hasNormalMedia =
    !!m.message?.imageMessage ||
    !!m.message?.videoMessage
  if (!hasNormalMedia) return false

  await conn
    .sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        fromMe: false,
        id: m.key.id,
        participant: m.key.participant,
      },
    })
    .catch(() => {})

  await conn
    .sendMessage(m.chat, {
      text:
        `> 『 ❌ 』 Media rimossi.\n` +
        `> Questo gruppo accetta solo media *visualizzabili una volta*.`,
      mentions: [m.sender],
    })
    .catch(() => {})

  return true
}

export { before as handler }