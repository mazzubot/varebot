const handler = async (m, { conn }) => {
  if (!global.db?.data) await global.loadDatabase?.()
  if (!global.db.data.settings) global.db.data.settings = {}
  const botJid = conn.user?.jid
  if (!botJid) return
  const settings = global.db.data.settings[botJid] || (global.db.data.settings[botJid] = {})

  settings.prefix = null

  const escapeRegex = (str) => String(str).replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&')
  const defaultPrefixChars = (global.opts?.prefix || '*/!#$%+£¢€¥^°=¶∆×÷π√✓©®&.\\-.@')
  const defaultSinglePrefix = (typeof global.prefisso === 'string' && global.prefisso.trim()) ? global.prefisso.trim() : '.'

  if (settings.multiprefix === true) {
    global.prefix = new RegExp('^[' + escapeRegex(defaultPrefixChars) + ']')
  } else {
    const c = String(defaultSinglePrefix)[0] || '.'
    global.prefix = new RegExp('^' + escapeRegex(c))
  }

  conn.fakeReply(m.chat, '『 ✅️ 』 *Prefisso ripristinato!*', '0@s.whatsapp.net', '💫 PREFISSO RIPRISTINATO 💫')
}
handler.help = ['resetprefix'];
handler.tags = ['creatore'];
handler.command = /^(resetprefix)$/i;
handler.owner = true;

export default handler;
