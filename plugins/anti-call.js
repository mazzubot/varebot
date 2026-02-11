let handler = m => m

handler.onCall = async function (call, opts = {}) {
  const conn = opts.conn || this
  if (!call || call.status !== 'offer') return

  const callId = opts.callId || call.id
  const callFrom = opts.callFrom || call.from
  if (!conn || !callId || !callFrom) return

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  const withTimeout = async (promise, ms) => {
    try {
      return await Promise.race([promise, delay(ms).then(() => null)])
    } catch {
      return null
    }
  }

  conn.rejectCall(callId, callFrom).catch(() => {})

  if (!global.db?.data && typeof global.loadDatabase === 'function') {
    await withTimeout(global.loadDatabase(), 2000)
  }
  if (global.db?.data) {
    global.db.data.users = global.db.data.users || {}
    global.db.data.settings = global.db.data.settings || {}
  }

  const settings = opts.settings || global.db?.data?.settings?.[conn.user?.jid] || {}
  if (settings && settings.anticall === false) return

  let callerJid = opts.callerJid || (typeof conn.decodeJid === 'function' ? conn.decodeJid(callFrom) : callFrom)
  if (!callerJid) return

  if (String(callerJid).endsWith('@g.us')) return

  if (String(callerJid).endsWith('@lid') && typeof conn.onWhatsApp === 'function') {
    const number = String(callerJid).split('@')[0]?.replace(/:\d+$/, '')
    const wa = await withTimeout(conn.onWhatsApp(number), 1500)
    const resolved = wa?.[0]?.jid && typeof conn.decodeJid === 'function' ? conn.decodeJid(wa[0].jid) : wa?.[0]?.jid
    callerJid = resolved || callerJid
  }

  const callerNumber = String(callerJid).split('@')[0]
  const isSam = Array.isArray(global.owner) && global.owner.some(([num]) => String(num) === callerNumber)
  const isMods = Array.isArray(global.mods) && global.mods.map(v => String(v).replace(/[^0-9]/g, '')).includes(callerNumber)
  if (isSam || isMods) return

  let user = opts.user
  if (global.db?.data?.users) {
    if (!user || typeof user !== 'object') user = global.db.data.users[callerJid]
    if (!user || typeof user !== 'object') user = global.db.data.users[callerJid] = {}
  } else {
    global.__callWarnFallback = global.__callWarnFallback || {}
    user = global.__callWarnFallback[callerJid] || (global.__callWarnFallback[callerJid] = {})
  }

  user.callWarn = Number.isFinite(user.callWarn) ? user.callWarn : 0
  user.callWarn += 1

  if (user.callWarn >= 3) {
    conn.sendMessage(callerJid, { text: `🚫 Hai chiamato il bot *3 volte*. Ora vieni bloccato.` }).catch(() => {})
    conn.updateBlockStatus(callerJid, 'block').catch(() => {})
  } else {
    conn.sendMessage(callerJid, { text: `🚫 Chiamata rifiutata automaticamente. Warning *${user.callWarn}/3*` }).catch(() => {})
  }
}

export default handler