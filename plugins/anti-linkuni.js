let handler = m => m

function unwrapMessageContent(message) {
  let content = message?.message || message
  for (let i = 0; i < 10; i++) {
    if (content?.ephemeralMessage?.message) {
      content = content.ephemeralMessage.message
      continue
    }
    if (content?.viewOnceMessage?.message) {
      content = content.viewOnceMessage.message
      continue
    }
    if (content?.viewOnceMessageV2?.message) {
      content = content.viewOnceMessageV2.message
      continue
    }
    if (content?.viewOnceMessageV2Extension?.message) {
      content = content.viewOnceMessageV2Extension.message
      continue
    }
    if (content?.documentWithCaptionMessage?.message) {
      content = content.documentWithCaptionMessage.message
      continue
    }
    if (content?.editedMessage?.message) {
      content = content.editedMessage.message
      continue
    }
    break
  }
  return content
}

function extractTextFromMessage(m, excludeQuoted = false) {
  const texts = []
  const seen = new Set()
  const IGNORED_KEYS = [
    'fileSha256',
    'mediaKey',
    'fileEncSha256',
    'jpegThumbnail',
    'participant',
    'stanzaId',
    'remoteJid',
    'id'
  ]

  function recursiveExtract(obj) {
    if (!obj || typeof obj !== 'object') return
    if (seen.has(obj)) return
    seen.add(obj)
    if (Buffer.isBuffer(obj)) return

    for (const key in obj) {
      if (excludeQuoted && key === 'quotedMessage') continue
      if (IGNORED_KEYS.includes(key)) continue
      const value = obj[key]
      if (typeof value === 'string' && value.length > 0) {
        texts.push(value)
      } else if (typeof value === 'object') {
        recursiveExtract(value)
      }
    }
  }

  if (m?.text) texts.push(m.text)
  if (m?.caption) texts.push(m.caption)
  recursiveExtract(unwrapMessageContent(m))
  return texts
    .filter(Boolean)
    .join(' ')
    .replace(/[\s\u200b\u200c\u200d\uFEFF\u2060\u00A0]+/g, ' ')
    .trim()
}

function containsLink(text) {
  const t = String(text || '').trim()
  if (!t) return false

  const quick = /(https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/|discord\.gg\/|bit\.ly\/|tinyurl\.com\/|instagram\.com\/|facebook\.com\/|tiktok\.com\/|youtube\.com\/|youtu\.be\/)/i
  if (quick.test(t)) return true
  const genericDomain = /\b([a-z0-9-]+\.)+[a-z]{2,}(\/[\w\-._~%!$&'()*+,;=:@/?#\[\]]*)?/i
  return genericDomain.test(t)
}

async function addWarn(conn, m, target, reason, isBotAdmin) {
  if (!global.db.data.users[target]) global.db.data.users[target] = {}
  const user = global.db.data.users[target]
  if (!user.warns) user.warns = {}
  if (typeof user.warns[m.chat] !== 'number') user.warns[m.chat] = 0

  user.warns[m.chat] += 1
  const warns = user.warns[m.chat]
  const tag = target.split('@')[0]

  if (warns >= 3) {
    user.warns[m.chat] = 0
    await conn.sendMessage(m.chat, {
      text: `*@${tag}* 🚫 Link vietati ripetuti. Hai raggiunto *3 warn*.` ,
      mentions: [target]
    }).catch(() => {})

    if (isBotAdmin) {
      await conn.groupParticipantsUpdate(m.chat, [target], 'remove').catch(() => {})
    }
    return
  }

  await conn.sendMessage(m.chat, {
    text: `*@${tag}* 🚫 ${reason}\n\n⚠️ Avvertimento *${warns}/3*`,
    mentions: [target]
  }).catch(() => {})
}

handler.before = async function (m, { conn, isAdmin, isBotAdmin, isOwner, isSam }) {
  if (m.isBaileys && m.fromMe) return true
  if (!m.isGroup) return false
  if (!m.message) return true

  const chat = global.db.data.chats[m.chat]
  if (!chat?.antiLinkUni) return true

  if (isAdmin || isOwner || isSam) return true

  const text = extractTextFromMessage(m, true)
  if (!containsLink(text)) return true

  await conn.sendMessage(m.chat, { delete: m.key }).catch(() => {})
  await addWarn(conn, m, m.sender, 'Link non consentiti in questo gruppo.', !!isBotAdmin)

  return false
}

export default handler