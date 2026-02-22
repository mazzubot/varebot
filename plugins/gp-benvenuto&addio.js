import { WAMessageStubType } from '@realvare/based';
import axios from 'axios';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_TTL = 1000 * 60 * 60;
const groupBackgroundCache = new Map();
const profilePicCache = new Map();

const replaceAllText = (str, search, replacement) => str.split(search).join(replacement);

setInterval(() => {
    groupBackgroundCache.clear();
    profilePicCache.clear();
}, CACHE_TTL);

const DEFAULT_AVATAR_URL = 'https://i.ibb.co/BKHtdBNp/default-avatar-profile-icon-1280x1280.jpg';
let defaultAvatarBuffer = null;
let puppeteer = null;
let browser = null;
let isPuppeteerAvailable = false;

const initPuppeteer = async () => {
    try {
        puppeteer = await import('puppeteer');
        isPuppeteerAvailable = true;
        await initBrowser();
        return true;
    } catch (error) {
        console.warn('⚠️ Puppeteer non trovato/installato. Userò Browserless/Fallback.', error.message);
        isPuppeteerAvailable = false;
        return false;
    }
};

const initBrowser = async () => {
    if (!puppeteer || !isPuppeteerAvailable) return false;
    if (browser && browser.isConnected()) return true;

    try {
        if (browser) await browser.close().catch(() => {});
        
        browser = await puppeteer.launch({
            headless: 'shell',
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu', 
                '--no-first-run', 
                '--no-zygote', 
                '--single-process',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        return true;
    } catch (error) {
        console.error('❌ Errore avvio browser Puppeteer:', error.message);
        isPuppeteerAvailable = false;
        return false;
    }
};

const createFallbackAvatar = async () => {
    const svgAvatar = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><circle cx="200" cy="200" r="200" fill="#6B7280"/><circle cx="200" cy="160" r="60" fill="#F3F4F6"/><ellipse cx="200" cy="300" rx="100" ry="80" fill="#F3F4F6"/></svg>`;
    return Buffer.from(svgAvatar);
};

const preloadDefaultAvatar = async () => {
    if (defaultAvatarBuffer) return;
    try {
        const res = await axios.get(DEFAULT_AVATAR_URL, {
            responseType: 'arraybuffer',
            timeout: 5000,
            headers: { 'User-Agent': 'varebot/2.5' }
        });
        defaultAvatarBuffer = res.status === 200 ? Buffer.from(res.data) : await createFallbackAvatar();
    } catch (error) {
        defaultAvatarBuffer = await createFallbackAvatar();
    }
};

async function getUserName(conn, jid, pushNameFromStub = '') {
    const isValid = str => str && typeof str === 'string' && str.trim().length > 0 && str.length < 30 && !str.includes('@') && !/^\d+$/.test(str);
    
    if (pushNameFromStub && ['created', 'null', 'undefined'].includes(pushNameFromStub.toLowerCase())) {
        pushNameFromStub = '';
    }
    
    if (isValid(pushNameFromStub)) return pushNameFromStub;

    const contact = conn.contacts?.[jid] || {};
    if (isValid(contact.notify)) return contact.notify;
    if (isValid(contact.name)) return contact.name;
    if (isValid(contact.verifiedName)) return contact.verifiedName;

    try {
        const nameFromApi = await Promise.race([
            conn.getName(jid),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
        ]);
        if (isValid(nameFromApi)) return nameFromApi;
    } catch (e) {}

    return `Utente`;
}

async function getUserProfilePic(conn, jid) {
    if (profilePicCache.has(jid)) {
        const cached = profilePicCache.get(jid);
        if (!Buffer.isBuffer(cached)) return cached;
    }
    
    let buffer = null;
    let url = DEFAULT_AVATAR_URL;
    try {
        const fetchedUrl = await conn.profilePictureUrl(jid, 'image').catch(() => null);
        if (fetchedUrl) {
            url = fetchedUrl;
            const res = await axios.get(fetchedUrl, { 
                responseType: 'arraybuffer', 
                timeout: 4000 
            });
            if (res.status === 200) buffer = Buffer.from(res.data);
        }
    } catch (e) {}

    if (!buffer) {
        if (!defaultAvatarBuffer) await preloadDefaultAvatar();
        buffer = defaultAvatarBuffer;
    }

    const result = { buffer, url };
    if (buffer) profilePicCache.set(jid, result);
    return result;
}

const createDefaultBackground = async () => {
    const generateDots = () => Array.from({ length: 80 }).map(() => {
        const x = Math.floor(Math.random() * 1600);
        const y = Math.floor(Math.random() * 900);
        const r = (Math.random() * 1.5 + 0.5).toFixed(1);
        const o = (Math.random() * 0.5 + 0.3).toFixed(2);
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${o}"/>`;
    }).join('');

    const svgBackground = `<svg width="1600" height="900" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#667eea;stop-opacity:1" /><stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" /><stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" /></linearGradient></defs><rect width="100%" height="100%" fill="url(#grad1)" /><g>${generateDots()}</g></svg>`;
    return Buffer.from(svgBackground);
};

async function getGroupBackgroundImage(groupJid, conn) {
    if (groupBackgroundCache.has(groupJid)) return groupBackgroundCache.get(groupJid);
    
    let buffer = null;
    try {
        const url = await conn.profilePictureUrl(groupJid, 'image').catch(() => null);
        if (url) {
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 4000 });
            if (res.status === 200) buffer = Buffer.from(res.data);
        }
    } catch (e) {}

    if (!buffer) {
        try {
            const fallback = path.join(__dirname, '..', 'media', 'benvenuto-addio.jpg');
            await fs.access(fallback);
            buffer = await fs.readFile(fallback);
        } catch (e) {
            buffer = await createDefaultBackground();
        }
    }

    if (buffer) groupBackgroundCache.set(groupJid, buffer);
    return buffer;
}

const WelcomeCard = ({ backgroundUrl, pfpUrl, isGoodbye, username, groupName }) => {
    const safeUsername = username ? username.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'Utente';
    const safeGroupName = groupName ? groupName.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'Gruppo';

    const sparkles = Array.from({ length: 260 }).map(() => {
        const x = Math.floor(Math.random() * 1600);
        const y = Math.floor(Math.random() * 900);
        const r = (Math.random() * 4.4 + 0.6).toFixed(2);
        const o = (Math.random() * 0.45 + 0.15).toFixed(2);
        return `<circle cx='${x}' cy='${y}' r='${r}' fill='white' fill-opacity='${o}'/>`;
    }).join('');

    const sparklesSvg = encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900' viewBox='0 0 1600 900'>` +
        `<defs>` +
        `<filter id='glow' x='-20%' y='-20%' width='140%' height='140%'>` +
        `<feGaussianBlur stdDeviation='1.2' result='blur'/>` +
        `<feColorMatrix in='blur' type='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0' result='colored'/>` +
        `<feMerge>` +
        `<feMergeNode in='colored'/>` +
        `<feMergeNode in='SourceGraphic'/>` +
        `</feMerge>` +
        `</filter>` +
        `</defs>` +
        `<g filter='url(%23glow)'>${sparkles}</g>` +
        `</svg>`
    );

    const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { width: 1600px; height: 900px; font-family: 'Poppins', sans-serif; background: #1a1a1a; overflow: hidden; }
        .container { width: 100%; height: 100%; position: relative; display: flex; justify-content: center; align-items: center; }
        .background { position: absolute; width: 100%; height: 100%; background: url('${backgroundUrl}') center/cover; filter: blur(30px) brightness(0.7); opacity: 0.7; }
        .overlay { position: absolute; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); }
        .sparkles { position: absolute; inset: 0; background-image: url("data:image/svg+xml,${sparklesSvg}"); background-repeat: no-repeat; background-size: 1600px 900px; opacity: 0.55; mix-blend-mode: screen; z-index: 1; }
        .card { position: relative; width: 90%; height: 85%; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 50px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; padding: 45px; box-shadow: 0 20px 50px rgba(0,0,0,0.4); z-index: 2; }
        .pfp-container { margin-bottom: 30px; position: relative; }
        .pfp { width: 280px; height: 280px; border-radius: 50%; border: 8px solid #FFF; box-shadow: 0 0 30px rgba(255, 255, 255, 0.7); object-fit: cover; z-index: 1; position: relative; }
        .title { font-size: 100px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.5); line-height: 1; color: #FFF; margin-bottom: 10px; }
        .username { font-size: 72px; font-weight: 700; text-shadow: 0 2px 3px rgba(0,0,0,0.4); line-height: 1.1; margin-bottom: 10px; text-align: center; max-width: 90%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .group-name { font-size: 56px; font-weight: 700; color: #ccc; text-shadow: 0 1px 2px rgba(0,0,0,0.5); line-height: 1.2; text-align: center; }
        .footer { position: absolute; bottom: 35px; font-size: 42px; text-shadow: 0 1px 3px rgba(0,0,0,0.5); color: #fff; }
    `;

    return React.createElement('html', { lang: 'it' },
        React.createElement('head', null,
            React.createElement('meta', { charSet: 'utf-8' }),
            React.createElement('meta', { name: 'viewport', content: 'width=1600,height=900' }),
            React.createElement('style', { dangerouslySetInnerHTML: { __html: styles } })
        ),
        React.createElement('body', null,
            React.createElement('div', { className: 'container' },
                React.createElement('div', { className: 'background' }),
                React.createElement('div', { className: 'overlay' }),
                React.createElement('div', { className: 'sparkles' }),
                React.createElement('div', { className: 'card' },
                    React.createElement('div', { className: 'pfp-container' },
                        React.createElement('img', { src: pfpUrl, className: 'pfp', alt: 'Profile' })
                    ),
                    React.createElement('h1', { className: 'title' }, isGoodbye ? 'ADDIO!' : 'BENVENUTO!'),
                    React.createElement('div', { className: 'username' }, safeUsername),
                    React.createElement('p', { className: 'group-name' }, safeGroupName),
                    React.createElement('div', { className: 'footer' }, '✦ ⋆ ✧ ⭒ 𝓿𝓪𝓻𝓮𝓫𝓸𝓽 ⭒ ✧ ⋆ ✦')
                )
            )
        )
    );
};

async function createImageWithPuppeteer(htmlContent) {
    if (!browser || !browser.isConnected()) {
        const reinitialized = await initBrowser();
        if (!reinitialized) throw new Error('Puppeteer non disponibile dopo ri-inizializzazione');
    }

    let page = null;
    try {
        page = await browser.newPage();
        await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 10000 });
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 85, optimizeForSpeed: true });
        return Buffer.from(screenshot);
    } catch (error) {
        throw error;
    } finally {
        if (page) await page.close().catch(() => {});
    }
}

async function createImageWithBrowserless(htmlContent) {
    const browserlessApiKey = global.APIKeys?.browserless;
    if (!browserlessApiKey) throw new Error("API key Browserless non trovata o non configurata");

    const res = await axios.post(`https://production-sfo.browserless.io/screenshot?token=${browserlessApiKey}`, {
        html: htmlContent,
        options: { type: 'jpeg', quality: 85 },
        viewport: { width: 1600, height: 900 }
    }, {
        responseType: 'arraybuffer',
        timeout: 45000
    });

    if (res.status === 200) return Buffer.from(res.data);
    throw new Error('Risposta Browserless non valida');
}

async function createImage(username, groupName, profilePicBuffer, isGoodbye, groupJid, conn) {
    const [backgroundBuffer] = await Promise.all([
        getGroupBackgroundImage(groupJid, conn),
        defaultAvatarBuffer || preloadDefaultAvatar()
    ]);

    const toBase64 = (buffer, type) => `data:image/${type};base64,${buffer.toString('base64')}`;
    const backgroundUrl = backgroundBuffer ? toBase64(backgroundBuffer, backgroundBuffer.toString().startsWith('<svg') ? 'svg+xml' : 'jpeg') : '';
    const pfpUrl = profilePicBuffer ? toBase64(profilePicBuffer, 'jpeg') : (defaultAvatarBuffer ? toBase64(defaultAvatarBuffer, 'svg+xml') : '');

    const element = React.createElement(WelcomeCard, { backgroundUrl, pfpUrl, isGoodbye, username, groupName });
    const htmlContent = `<!DOCTYPE html>${ReactDOMServer.renderToStaticMarkup(element)}`;

    if (isPuppeteerAvailable) {
        try {
            return await createImageWithPuppeteer(htmlContent);
        } catch (e) {
            console.error('⚠️ Puppeteer fallito, tento fallback su Browserless:', e.message);
        }
    }

    try {
        return await createImageWithBrowserless(htmlContent);
    } catch (e) {
        throw new Error(`Generazione immagine fallita: ${e.message}`);
    }
}

const requestCounter = { count: 0, lastReset: Date.now(), isBlocked: false, blockUntil: 0 };
function checkAntiSpam() {
    const now = Date.now();
    if (requestCounter.isBlocked) {
        if (now < requestCounter.blockUntil) return false;
        requestCounter.isBlocked = false;
        requestCounter.count = 0;
        requestCounter.lastReset = now;
    }
    
    if (now - requestCounter.lastReset > 30000) {
        requestCounter.count = 0;
        requestCounter.lastReset = now;
    }

    requestCounter.count++;
    if (requestCounter.count > 5) {
        requestCounter.isBlocked = true;
        requestCounter.blockUntil = now + 60000;
        console.warn('⚠️ Anti-spam: Troppe richieste welcome/goodbye. Bloccato per 60s.');
        return false;
    }
    return true;
}

initPuppeteer().then(preloadDefaultAvatar).catch(console.error);

let handler = async (m, { usedPrefix, command, text, isAdmin, isOwner, isSam }) => {
    if (!m.isGroup) return m.reply('Questo comando funziona solo nei gruppi.');
    if (!(isAdmin || isOwner || isSam)) return m.reply('Solo gli admin possono usare questo comando.');

    const chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {});
    const isWelcome = /welcome|benvenuto|wlc/i.test(command);
    const key = isWelcome ? 'welcomeText' : 'goodbyeText';
    const label = isWelcome ? 'welcome' : 'addio';

    if (!text || !text.trim()) {
        const current = chat[key];
        const usage = `『 ⁉️ 』 \`Uso corretto:\` *${usedPrefix}${command} <testo>*\nper ripristinare *${usedPrefix}${command} reset*\n\n『 🎐 』 \`Placeholder:\`\n- @user (nome utente)\n- @gruppo (nome gruppo)\n- @membri (numero membri)`;
        if (current && typeof current === 'string' && current.trim().length) {
            return m.reply(`『 🌑 』 Testo ${label} attuale:\n\n${current}\n\n${usage}`);
        }
        return m.reply(`『 ❌ 』 *Nessun testo ${label} personalizzato impostato.*\n\n${usage}`);
    }

    const value = text.trim();
    if (/^(reset|default|remove)$/i.test(value)) {
        delete chat[key];
        return m.reply(`『 ✅ 』 Testo ${label} ripristinato al default.`);
    }

    if (value.length > 2000) return m.reply('Testo troppo lungo (max 2000 caratteri).');
    chat[key] = value;
    return m.reply(`『 ✅ 』 \`Testo ${label} aggiornato.\``);
};

handler.help = ['setwelcome <testo|reset>', 'setaddio <testo|reset>'];
handler.tags = ['gruppo'];
handler.command = /^(setwelcome|setbenvenuto|setwlc|setaddio|setgoodbye|setbye)$/i;
handler.before = async (m, { conn, groupMetadata, match }) => {
    try {
        const usedPrefix = match?.[0]?.[0] || '';
        if (usedPrefix && typeof m.text === 'string') {
            const noPrefix = m.text.replace(usedPrefix, '').trim();
            const cmd = noPrefix.split(/\s+/)[0]?.toLowerCase();
            if (cmd && /^(setwelcome|setbenvenuto|setwlc|setaddio|setgoodbye|setbye)$/i.test(cmd)) return false;
        }
    } catch {}

    if (!m.isGroup || !m.messageStubType) return true;
    if (m.messageStubType === 172) return true;
    const chat = global.db?.data?.chats?.[m.chat];
    if (!chat || (!chat.welcome && !chat.goodbye)) return true;

    const who = m.messageStubParameters?.[0] || m.sender;
    if (!who || !who.includes('@')) return true;

    const jid = conn.decodeJid(who);
    const cleanUserId = jid.split('@')[0].replace(/:\d+$/, '');
    const STUB_TYPES = {
        ADD: WAMessageStubType.GROUP_PARTICIPANT_ADD,
        LEAVE: WAMessageStubType.GROUP_PARTICIPANT_LEAVE,
        REMOVE: WAMessageStubType.GROUP_PARTICIPANT_REMOVE,
    };
    const isAdd = m.messageStubType === STUB_TYPES.ADD;
    const isRemove = m.messageStubType === STUB_TYPES.LEAVE || m.messageStubType === STUB_TYPES.REMOVE;
    if (!isAdd && !isRemove) return true;
    if ((isAdd && !chat.welcome) || (isRemove && !chat.goodbye)) return true;

    if (!checkAntiSpam()) return true;
    const [username, profilePicData] = await Promise.all([
        getUserName(conn, jid, m.messageStubParameters?.[1]),
        getUserProfilePic(conn, jid)
    ]);
    
    const profilePic = profilePicData?.buffer || profilePicData;
    const profilePicUrl = profilePicData?.url || DEFAULT_AVATAR_URL;

    const groupName = groupMetadata?.subject || 'Gruppo';
    const memberCount = groupMetadata?.participants?.length || 0;
    const isGoodbye = isRemove;
    const displayName = (username.length > 20 || username.includes('Utente')) ? `@${cleanUserId}` : username;

    const expectedCount = isGoodbye ? (memberCount) : (memberCount + 1);
    const defaultCaption = isGoodbye ?
        `*\`Addio\`* @${cleanUserId} 👋\n┊ _Ha abbandonato il gruppo_\n╰► *\`Membri\`* ${expectedCount}` :
        `*\`Benvenuto/a\`* @${cleanUserId} *✧*\n┊ *\`In\`* *${groupName}*\n*╰►* *\`Membri:\`* ${expectedCount}`;

    const template = isGoodbye ? chat.goodbyeText : chat.welcomeText;
    const renderTemplate = (tpl) => {
        let out = String(tpl);
        out = replaceAllText(out, '@user', `@${cleanUserId}`);
        out = replaceAllText(out, '@gruppo', groupName);
        out = replaceAllText(out, '@membri', String(expectedCount));
        return out;
    };

    const caption = (template && typeof template === 'string' && template.trim().length > 0) ? renderTemplate(template) : defaultCaption;

    try {
        const image = await createImage(displayName === `@${cleanUserId}` ? cleanUserId : displayName, groupName, profilePic, isGoodbye, m.chat, conn);
        
        await conn.sendMessage(m.chat, {
            image,
            caption,
            mentions: [jid],
            contextInfo: { ...(global.fake?.contextInfo || {}) }
        });
    } catch (error) {
        console.error('❌ Errore Welcome/Goodbye:', error.message);
        const title = isGoodbye ? 'Addio' : 'Benvenuto';
        const body = username || displayName || `@${cleanUserId}`;
        await conn.sendMessage(m.chat, {
            text: caption,
            mentions: [jid],
            contextInfo: {
                externalAdReply: {
                    title,
                    body,
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    thumbnailUrl: profilePicUrl,
                    sourceUrl: ''
                }
            }
        });
    }

    return true;
};

export default handler;