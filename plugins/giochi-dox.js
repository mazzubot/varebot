const handler = async (m, { conn }) => {
  let target = m.mentionedJid?.[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : m.sender;
  const botJid = conn.user.jid.split('@')[0];
  const targetId = target.split('@')[0];
  const normalizedTarget = conn.decodeJid?.(target) || target;
  let targetName = null;
  try {
    const dbName = global.db?.data?.users?.[normalizedTarget]?.name;
    const chatName = conn.chats?.[normalizedTarget]?.name || conn.chats?.[normalizedTarget]?.notify || conn.chats?.[normalizedTarget]?.verifiedName;
    targetName = (dbName && dbName !== '?' ? dbName : null) || chatName || (await conn.getName(normalizedTarget));
  } catch (e) {
    targetName = null;
  }
  let isBusiness = false;
  try {
    const biz = await conn.getBusinessProfile?.(target);
    isBusiness = !!(biz && (biz.wid || biz.description || biz.email || biz.website || biz.businessHours || biz.categories));
  } catch (e) {
    isBusiness = false;
  }
  if (target.includes(botJid)) {
    return m.reply('🖕🏻 *Senti coglione,*\nNon puoi doxare chi ti dà da mangiare. Torna nella fogna.');
  }
  const isSelf = target === m.sender;
  if (isSelf) {
    m.reply('🧠 *Autolesionismo digitale?*\nTi stai doxando da solo... il quoziente intellettivo di un sasso.');
  } else {
    m.reply(`⚰️ *Non sono bastati gli epstein files mo anche quelli di ${targetName || targetId}*`);
  }
  let ppUrl = null;
  try {
    ppUrl = await conn.profilePictureUrl(target, 'image');
  } catch (e) {
    ppUrl = null;
  }

  const carrier = getItalianCarrier(targetId);
  const deviceType = getDeviceType(m, target, isSelf);
  const fake = getExtendedFakeData(carrier, deviceType);
  const header = isSelf ? 'AUTO-DOXXATO 🤦🏿‍♂️' : 'VITTIMA SACRIFICALE';
  const caption = `
ㅤㅤ⋆｡˚『 ╭ \`${header}\` ╯ 』˚｡⋆\n
- 『 👤 』 \`Vittima:\` *@${targetId}*
- 『 🧾 』 \`Account:\` *${isBusiness ? 'WhatsApp Business' : 'WhatsApp'}*
- 『 🏷️ 』 \`Status:\` *${fake.status}*
- 『 📡 』 \`Sim:\` *${carrier}*
- 『 📱 』 \`Telefono:\` *${fake.deviceModel}*
- 『 🌐 』 \`IP Esposto:\` *${fake.ip}*
- 『 🔌 』 \`Provider:\` *${fake.isp}*
- 『 📶 』 \`Segnale:\` *-${randomInt(85, 125)} dBm (Pessimo)*
- 『 🏙️ 』 \`Ghetto:\` *${fake.city}*
- 『 🗺️ 』 \`Coordinate:\` *${fake.coords}*
- 『 🏠 』 \`Indirizzo:\` *${fake.address}*
- 『 ⚙️ 』 \`OS:\` *${fake.os}*
- 『 🧠 』 \`CPU:\` *${fake.cpu}*
- 『 🔋 』 \`Batteria:\` *${fake.battery}*
- 『 🍆 』 \`Cronologia:\` *"${fake.history}"*
- 『 🦠 』 \`Virus:\` *${fake.virus}*
`.trim();

  if (ppUrl) {
    await conn.sendMessage(
      m.chat,
      {
        image: { url: ppUrl },
        caption: caption,
        mentions: [target],
        contextInfo: { ...(global.fake?.contextInfo || {}), mentionedJid: [target] }
      },
      { quoted: m }
    );
  } else {
    await conn.sendMessage(
      m.chat,
      {
        text: caption,
        mentions: [target],
        contextInfo: { ...(global.fake?.contextInfo || {}), mentionedJid: [target] }
      },
      { quoted: m }
    );
  }
};

handler.help = ['dox'];
handler.tags = ['giochi'];
handler.command = /^dox/i;

export default handler;

function getItalianCarrier(num) {
  if (!num.startsWith('39')) return 'Sim Estera (Spacciatore/Latitante)';
  const p = num.replace('39', '').substring(0, 3);
  
  const m = {
    'TIM (Ladro di Stato)': ['330','331','333','334','335','336','337','338','339','360','368'],
    'Vodafone (Ti rubano pure l\'anima)': ['340','341','342','343','344','345','346','347','348','349','383'],
    'WindTre (Non prende manco in centro)': ['320','322','323','324','327','328','329','380','388','389','391','392','393'],
    'Iliad (Poveraccio Edition)': ['351','352'],
    'PosteMobile (Pensionato INPS)': ['350','370','371','377','379','375'],
    'Kena/Ho (Vorrei ma non posso)': ['350','379','375','346'],
    'Fastweb (Fake 5G)': ['373', '3756'],
    'CoopVoce (Punti spesa)': ['331', '373']
  };

  for (let [k, v] of Object.entries(m)) {
    if (v.includes(p)) return k;
  }
  return 'Operatore Sconosciuto (Forse rubata)';
}

function getDeviceType(m, isSelf) {
  const qId = m.quoted ? m.quoted.id : (isSelf ? m.key.id : null);
  
  if (qId) {
    if (qId.startsWith('3A') && qId.length < 30) return 'ios';
    if (qId.startsWith('3EB0')) return 'web';
    if (qId.length > 18) return 'android';
  }
  return 'unknown';
}

function getExtendedFakeData(carrier, type) {
  const iosModels = [
    'iPhone 15 Pro Max (Pagato a rate)', 'iPhone 14 (Schermo rotto)', 'iPhone 11 (Batteria al 70%)',
    'iPhone X (Ricondizionato Swappie)', 'iPhone 6s (Rubato)', 'iPad del fratellino'
  ];
  const androidModels = [
    'Samsung A12 (Lagga solo a guardarlo)', 'Xiaomi Redmi (Cinese spia)', 'Huawei P30 (Senza Google)',
    'Wiko del cestone', 'Oppo Find X (Trovato per terra)', 'Nokia 3310 (Arma impropria)', 'Motorola dei poveri'
  ];
  const webModels = [
    'PC Windows 7 (Craccato)', 'HP del Liceo', 'MacBook del Papi', 'Chromebook (Inutile)', 'PC Gaming (Con la GT 710)'
  ];
  const locations = [
    { c: 'Scampia (NA)', a: 'Vele Celesti, scala C' },
    { c: 'Rozzano (MI)', a: 'Via delle Mimose (Zona spaccio)' },
    { c: 'Tor Bella Monaca (RM)', a: 'Via dell\'Archeologia' },
    { c: 'Quarto Oggiaro (MI)', a: 'Via Pascarella' },
    { c: 'Zen 2 (PA)', a: 'Padiglione 3' },
    { c: 'Librino (CT)', a: 'Viale Moncada' },
    { c: 'Barriera di Milano (TO)', a: 'Corso Palermo' },
    { c: 'Foggia (FG)', a: 'Quartiere Ferrovia' },
    { c: 'Cerignola (FG)', a: 'Via dei ricettatori' },
    { c: 'San Basilio (RM)', a: 'Piazza della Balena' },
    { c: 'Caivano (NA)', a: 'Parco Verde' }
  ];
  const history = [
    'hentai nani pelosi', 'come allungare il pisello', 'piedi di chiara ferragni', 
    'come dire alla mamma che sono gay', 'trucchi clash royale gemme gratis', 
    'onlyfans prezzi bassi', 'perché nessuno mi vuole bene', 'come diventare narcos',
    'fidanzata virtuale gratis', 'tutorial come baciare il cuscino'
  ];
  const status = [
    'Cornuto cronico', 'Vergine a vita', 'Disoccupato', 'Segnalato alla Polizia', 
    'Bannato da Tinder', 'Cerca Milf a 2km', 'Main Yasuo', 'Finto Ricco', 
    'Evasore Totale', 'Senza Futuro', 'Sottone'
  ];
  const virus = [
    'Trojan.Win32.Generic', 'Spyware Russo', 'Keylogger Attivo', 
    'Ransomware (Paga o perdi tutto)', 'Bonzi Buddy', 'Nessuno (Per miracolo)'
  ];
  const loc = pick(locations);
  let model, os, cpu;
  if (type === 'ios') {
    model = pick(iosModels);
    os = 'iOS 17.4 (Buggato)';
    cpu = 'Apple A16 (Surriscaldato)';
  } else if (type === 'web') {
    model = pick(webModels);
    os = 'Windows 10 (Senza licenza)';
    cpu = 'Intel Pentium 4 (Stufa)';
  } else {
    model = pick(androidModels);
    os = 'Android 14 (Custom ROM indiana)';
    cpu = 'MediaTek (Laggoso)';
  }

  const ispPrefix = carrier.split(' ')[0] || 'Telecom';
  const ip = `${pick(['151','93','79','37','2','5'])}.${randomInt(10,254)}.${randomInt(10,254)}.${randomInt(1,254)}`;

  return {
    status: pick(status),
    deviceModel: model,
    ip: ip,
    isp: `${ispPrefix} Italia SpA`,
    city: loc.c,
    address: loc.a,
    coords: `${(36 + Math.random() * 10).toFixed(6)}, ${(12 + Math.random() * 6).toFixed(6)}`,
    os: os,
    cpu: cpu,
    battery: `${randomInt(1, 15)}% (Caricalo barbone)`,
    history: pick(history),
    virus: pick(virus)
  };
}
function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }