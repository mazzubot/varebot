let handler = m => m

handler.before = async function (m, { conn, isAdmin, isOwner, isSam }) {
  if (m.isBaileys && m.fromMe) return true
  if (!m.isGroup) return false
  if (!m.message) return true

  const chat = global.db.data.chats[m.chat]
  if (!chat?.antioneview) return true
  if (isAdmin || isOwner || isSam) return true
  const hasViewOnce = !!(
    m.message?.viewOnceMessage ||
    m.message?.viewOnceMessageV2 ||
    m.message?.viewOnceMessageV2Extension ||
    m.message?.viewOnceMessageV2ExtensionMessage
  )
  if (!hasViewOnce) return true
  try {
    await conn.sendMessage(m.chat, { delete: m.key }).catch(() => {})
  } catch {}

  const senderTag = (m.sender || '').split('@')[0]
  await conn.sendMessage(
    m.chat,
    {
      text: `*@${senderTag}* 🚫 I messaggi *view-once* non sono consentiti in questo gruppo.`,
      mentions: [m.sender]
    },
    { quoted: m }
  ).catch(() => {})

  return false
}

export default handler