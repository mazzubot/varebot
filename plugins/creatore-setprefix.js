const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!global.db?.data) await global.loadDatabase?.()
  if (!global.db.data.settings) global.db.data.settings = {}
  const botJid = conn.decodeJid(conn.user?.jid)
  if (!botJid) return
  const settings = global.db.data.settings[botJid] || (global.db.data.settings[botJid] = {})

  const updateGlobalPrefix = () => {
    const escapeRegex = (str) => String(str).replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&')
    const defaultPrefixChars = (global.opts?.prefix || '*/!#$%+£¢€¥^°=¶∆×÷π√✓©®&.\\-.@')
    const defaultSinglePrefix = (typeof global.prefisso === 'string' && global.prefisso.trim()) ? global.prefisso.trim() : '.'
    const raw = typeof settings.prefix === 'string' ? settings.prefix.trim() : ''

    if (settings.multiprefix === true) {
      const chars = (raw && raw.length > 1) ? raw : defaultPrefixChars
      global.prefix = new RegExp('^[' + escapeRegex(chars) + ']')
    } else {
      const c = String(raw || defaultSinglePrefix)[0] || '.'
      global.prefix = new RegExp('^' + escapeRegex(c))
    }
  }

  const input = (text || '').trim()
  if (!input) {
    const currentPrefix = typeof settings.prefix === 'string' && settings.prefix.trim() ? settings.prefix.trim() : '.'
    const multi = settings.multiprefix === true
    conn.fakeReply(m.chat, `『 ✅️ 』 *Prefix attuale:* ${currentPrefix}${multi ? `\n『 ✅️ 』 *Multiprefix:* attivo` : `\n『 ✅️ 』 *Multiprefix:* disattivo`}`, '0@s.whatsapp.net', '🌸 PREFIX 🌸')
    return
  }

  let p = input
  if (settings.multiprefix !== true) p = p[0]
  settings.prefix = p
  updateGlobalPrefix()
  conn.fakeReply(m.chat, `『 ✅️ 』 *Prefisso aggiornato. Prefisso attuale:* 『 ${p} 』`, '0@s.whatsapp.net', '🌸 NUOVO PREFISSO 🌸')
}

handler.help = ['setprefix', 'prefix'].map((v) => v + ' [prefisso]')
handler.tags = ['creatore'];
handler.command = /^(setprefix|prefix)$/i;
handler.owner = true;
export default handler;