import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databasePath = path.join(__dirname, '../media/database/lastfm_users.json');
const getDB = () => fs.existsSync(databasePath) ? JSON.parse(fs.readFileSync(databasePath, 'utf-8')) : {};
const saveDB = (data) => fs.writeFileSync(databasePath, JSON.stringify(data, null, 2));
const LASTFM_API_KEY = global.APIKeys?.lastfm;
const BROWSERLESS_KEY = global.APIKeys?.browserless;
const DEFAULT_COVER = './media/menu/menu.jpg';

if (!fs.existsSync(path.dirname(databasePath))) fs.mkdirSync(path.dirname(databasePath), { recursive: true });
async function apiCall(method, params) {
    try {
        const query = new URLSearchParams({ method, api_key: LASTFM_API_KEY, format: 'json', ...params });
        const res = await axios.get(`https://ws.audioscrobbler.com/2.0/?${query}`, { timeout: 10000 });
        return res.data;
    } catch (e) {
        console.error('LastFM API Error:', e.message);
        return { error: e.response?.status || 'Unknown', message: e.message };
    }
}

async function fetchCover(lastFmImages, query, isArtist = false) {
    const sizes = ['mega', 'extralarge', 'large', 'medium', 'small'];
    for (const size of sizes) {
        const cover = lastFmImages?.find(i => i.size === size)?.['#text'];
        if (cover && cover.trim() !== '' && !cover.includes('2a96cbd8b46e442fc41c2b86b821562f')) return cover;
    }
    if (!lastFmImages || lastFmImages.length === 0) {
        const method = isArtist ? 'artist.getinfo' : 'track.getinfo';
        const params = isArtist ? { artist: query } : { track: query.split(' ').slice(1).join(' '), artist: query.split(' ')[0] };
        const info = await apiCall(method, params);
        if (info.error) return DEFAULT_COVER;
        const images = isArtist ? info.artist?.image : info.track?.album?.image || info.track?.image;
        if (images) {
            for (const size of sizes) {
                const cover = images.find(i => i.size === size)?.['#text'];
                if (cover && cover.trim() !== '' && !cover.includes('2a96cbd8b46e442fc41c2b86b821562f')) return cover;
            }
        }
    }
    return DEFAULT_COVER;
}

async function retryScreenshot(html, retries = 5, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.post(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_KEY}`, {
                html,
                options: { type: 'jpeg', quality: 90 },
                viewport: { width: 1000, height: 600 }
            }, { responseType: 'arraybuffer', timeout: 15000 });
            return Buffer.from(response.data);
        } catch (e) {
            console.error('Screenshot Error:', e.message);
            if (e.response?.status === 429) {
                console.warn(`Rate limit hit, retrying after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else if (e.response?.status === 400) {
                console.error('Bad request to Browserless API. HTML may be invalid.');
                throw e;
            } else {
                throw e;
            }
        }
    }
    throw new Error('Max retries reached for screenshot');
}

const validPeriodsMap = {
    sempre: 'overall',
    settimana: '7day',
    mese: '1month',
    '3mesi': '3month',
    '6mesi': '6month',
    anno: '12month'
};

const handler = async (m, { conn, usedPrefix, command, text }) => {
    let db = getDB();
    if (['setuser', 'impostauser', 'lastfmset'].includes(command)) {
        const username = text.trim();
        if (!username) return m.reply(`❌ Uso: ${usedPrefix}${command} <username>`);
        db[m.sender] = username;
        saveDB(db);
        return m.reply(`✅ Username *${username}* collegato al tuo account!`);
    }

    let targetUser = m.sender;
    if (m.mentionedJid && m.mentionedJid.length > 0) {
        targetUser = m.mentionedJid[0];
    }

    const user = db[targetUser];
    if (!user && !['taste', 'compare', 'compatibilita', 'commonartists'].includes(command)) {
        return m.reply(`⚠️ ${targetUser === m.sender ? 'Registrati' : 'L\'utente taggato non ha registrato il suo username'} con: *${usedPrefix}setuser <username>*`);
    }

    if (!LASTFM_API_KEY) return m.reply('❌ Errore: API Key Last.fm mancante nel config.js');
    if (!BROWSERLESS_KEY) return m.reply('❌ Errore: API Key Browserless mancante nel config.js');

    const globalErrore = global.errore || '❌ Si è verificato un errore. Riprova più tardi.';

    if (['cur', 'attuale', 'nowplaying', 'np'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const res = await apiCall('user.getrecenttracks', { user, limit: 1 });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const track = res.recenttracks?.track?.[0];
            if (!track) return m.reply('❌ Nessun brano trovato.');
            const info = await apiCall('track.getInfo', { artist: track.artist['#text'], track: track.name, username: user });
            if (info.error) return m.reply(`❌ Errore Last.fm: ${info.message}`);
            const trackData = info.track || {};
            const queryName = `${track.artist['#text']} ${track.name}`;
            const cover = await fetchCover(track.image, queryName);
            const isNowPlaying = track['@attr']?.nowplaying === 'true';
            const html = `
            <html>
            <head>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
                    body { margin: 0; padding: 0; width: 1000px; height: 600px; display: flex; align-items: center; justify-content: center; font-family: 'Plus Jakarta Sans', sans-serif; background: #000; overflow: hidden; }
                    .background { position: absolute; width: 100%; height: 100%; background: url('${cover}') center/cover; filter: blur(30px) brightness(0.7); opacity: 0.7; }
                    .glass-card { position: relative; width: 880px; height: 480px; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 50px; display: flex; align-items: center; padding: 45px; box-sizing: border-box; box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
                    .album-art { width: 340px; height: 340px; border-radius: 35px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); object-fit: cover; }
                    .details { flex: 1; margin-left: 50px; color: white; }
                    .status { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: ${isNowPlaying ? '#32d74b' : '#ff3b30'}; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
                    .track-name { font-size: 44px; font-weight: 800; line-height: 1.1; margin-bottom: 10px; letter-spacing: -1.5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 400px; }
                    .artist-name { font-size: 26px; color: rgba(255,255,255,0.6); font-weight: 600; margin-bottom: 30px; }
                    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                    .stat-item { background: rgba(255, 255, 255, 0.04); padding: 15px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.05); }
                    .stat-label { font-size: 10px; color: rgba(255,255,255,0.3); text-transform: uppercase; font-weight: 800; margin-bottom: 4px; }
                    .stat-value { font-size: 20px; font-weight: 700; color: #fff; }
                </style>
            </head>
            <body>
                <div class="background"></div>
                <div class="glass-card">
                    <img src="${cover}" class="album-art" />
                    <div class="details">
                        <div class="status"><span style="width:10px; height:10px; background:currentColor; border-radius:50%; box-shadow: 0 0 1px currentColor;"></span>${isNowPlaying ? 'In Riproduzione' : 'Ultimo Ascoltato'}</div>
                        <div class="track-name">${track.name}</div>
                        <div class="artist-name">${track.artist['#text']}</div>
                        <div class="stats-grid">
                            <div class="stat-item"><div class="stat-label">I Tuoi Ascolti</div><div class="stat-value">${trackData.userplaycount || 0}</div></div>
                            <div class="stat-item"><div class="stat-label">Ascolti Globali</div><div class="stat-value">${parseInt(trackData.playcount || 0).toLocaleString()}</div></div>
                            <div class="stat-item"><div class="stat-label">Utente</div><div class="stat-value" style="color:#0a84ff;">@${user}</div></div>
                            <div class="stat-item"><div class="stat-label">Ascoltatori</div><div class="stat-value">${parseInt(trackData.listeners || 0).toLocaleString()}</div></div>
                        </div>
                    </div>
                </div>
            </body>
            </html>`;
            const buffer = await retryScreenshot(html);
            const interactiveButtons = [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🎵 Scarica Audio",
                        id: `${usedPrefix}playaudio ${track.name} ${track.artist['#text']}`
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📽️ Scarica Video",
                        id: `${usedPrefix}playvideo ${track.name} ${track.artist['#text']}`
                    })
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Vedi su Last.fm",
                        url: trackData.url || `https://www.last.fm/music/${encodeURIComponent(track.artist['#text'])}/_/${encodeURIComponent(track.name)}`
                    })
                }
            ];
            return conn.sendMessage(m.chat, {
                text: `🎧 *@${user} sta ascoltando:*`,
                footer: '',
                cards: [{
                    image: buffer,
                    title: `🎵 ${track.name}`,
                    body: `👤 ${track.artist['#text']}`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: interactiveButtons
                }]
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['lastfm', 'profilolastfm', 'lfmprofile'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const res = await apiCall('user.getinfo', { user });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const userInfo = res.user || {};
            const cover = await fetchCover(userInfo.image, user);
            const registered = new Date(parseInt(userInfo.registered.unixtime) * 1000).toLocaleDateString('it-IT');
            const age = userInfo.age > 0 ? userInfo.age : 'N/A';
            const gender = userInfo.gender === 'm' ? 'Maschio' : userInfo.gender === 'f' ? 'Femmina' : 'N/A';
            const subscriber = userInfo.subscriber === '1' ? 'Sì' : 'No';
            const realname = userInfo.realname || userInfo.name;
            const country = userInfo.country || 'N/A';
            const playcount = parseInt(userInfo.playcount || 0).toLocaleString();
            const playlists = userInfo.playlists || 0;
            const html = `
            <html>
            <head>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
                    body { margin: 0; padding: 0; width: 1000px; height: 600px; display: flex; align-items: center; justify-content: center; font-family: 'Plus Jakarta Sans', sans-serif; background: #000; overflow: hidden; }
                    .background { position: absolute; width: 100%; height: 100%; background: url('${cover}') center/cover; filter: blur(30px) brightness(0.7); opacity: 0.7; }
                    .glass-card { position: relative; width: 880px; height: 480px; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 50px; display: flex; align-items: center; padding: 45px; box-sizing: border-box; box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
                    .album-art { width: 340px; height: 340px; border-radius: 35px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); object-fit: cover; }
                    .details { flex: 1; margin-left: 50px; color: white; }
                    .status { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: #0a84ff; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
                    .track-name { font-size: 44px; font-weight: 800; line-height: 1.1; margin-bottom: 10px; letter-spacing: -1.5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 400px; }
                    .artist-name { font-size: 26px; color: rgba(255,255,255,0.6); font-weight: 600; margin-bottom: 30px; }
                    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                    .stat-item { background: rgba(255, 255, 255, 0.04); padding: 15px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.05); }
                    .stat-label { font-size: 10px; color: rgba(255,255,255,0.3); text-transform: uppercase; font-weight: 800; margin-bottom: 4px; }
                    .stat-value { font-size: 20px; font-weight: 700; color: #fff; }
                </style>
            </head>
            <body>
                <div class="background"></div>
                <div class="glass-card">
                    <img src="${cover}" class="album-art" />
                    <div class="details">
                        <div class="status"><span style="width:10px; height:10px; background:currentColor; border-radius:50%; box-shadow: 0 0 1px currentColor;"></span>Profilo Utente</div>
                        <div class="track-name">${userInfo.name}</div>
                        <div class="artist-name">${realname}</div>
                        <div class="stats-grid">
                            <div class="stat-item"><div class="stat-label">Paese</div><div class="stat-value">${country}</div></div>
                            <div class="stat-item"><div class="stat-label">Età</div><div class="stat-value">${age}</div></div>
                            <div class="stat-item"><div class="stat-label">Genere</div><div class="stat-value">${gender}</div></div>
                            <div class="stat-item"><div class="stat-label">Iscritto Dal</div><div class="stat-value">${registered}</div></div>
                            <div class="stat-item"><div class="stat-label">Ascolti Totali</div><div class="stat-value">${playcount}</div></div>
                            <div class="stat-item"><div class="stat-label">Subscriber</div><div class="stat-value">${subscriber}</div></div>
                            <div class="stat-item"><div class="stat-label">Playlists</div><div class="stat-value">${playlists}</div></div>
                        </div>
                    </div>
                </div>
            </body>
            </html>`;
            const buffer = await retryScreenshot(html);
            const interactiveButtons = [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Vedi su Last.fm",
                        url: userInfo.url
                    })
                }
            ];
            return conn.sendMessage(m.chat, {
                text: `👤 *Profilo di @${user}*`,
                footer: '',
                cards: [{
                    image: buffer,
                    title: `👤 ${userInfo.name}`,
                    body: `🌍 ${country}`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: interactiveButtons
                }]
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['recent', 'recenti', 'lasttracks'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const limit = 10;
            const res = await apiCall('user.getrecenttracks', { user, limit });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const tracks = res.recenttracks?.track || [];
            if (!tracks.length) return m.reply('❌ Nessuna traccia recente trovata.');
            const cards = await Promise.all(tracks.map(async (track, index) => {
                const queryName = `${track.artist['#text']} ${track.name}`;
                const cover = await fetchCover(track.image, queryName);
                const isNowPlaying = track['@attr']?.nowplaying === 'true' ? ' (In Riproduzione)' : '';
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${track.name.substring(0, 50)}${track.name.length > 50 ? '...' : ''}${isNowPlaying}`,
                    body: `👤 ${track.artist['#text']}`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url: track.url
                        })
                    }]
                };
            }));
            await conn.sendMessage(m.chat, {
                text: `🎵 *Tracce Recenti per @${user}*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['lovedtracks', 'preferiti', 'favorites'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const res = await apiCall('user.getlovedtracks', { user, limit: 10 });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const tracks = res.lovedtracks?.track || [];
            if (!tracks.length) return m.reply('❌ Nessuna traccia preferita trovata.');
            const cards = await Promise.all(tracks.map(async (track, index) => {
                const queryName = `${track.artist.name} ${track.name}`;
                const cover = await fetchCover(track.image, queryName);
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${track.name.substring(0, 50)}${track.name.length > 50 ? '...' : ''}`,
                    body: `👤 ${track.artist.name}`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url: track.url
                        })
                    }]
                };
            }));
            await conn.sendMessage(m.chat, {
                text: `❤️ *Tracce Preferite per @${user}*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['friends', 'amici', 'lfmfriends'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const res = await apiCall('user.getfriends', { user, limit: 10 });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const friends = res.friends?.user || [];
            if (!friends.length) return m.reply('❌ Nessun amico trovato.');
            const cards = await Promise.all(friends.map(async (friend, index) => {
                const cover = await fetchCover(friend.image, friend.name);
                const registered = new Date(parseInt(friend.registered.unixtime) * 1000).toLocaleDateString('it-IT');
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${friend.name.substring(0, 50)}`,
                    body: `Iscritto dal: ${registered}`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url: friend.url
                        })
                    }]
                };
            }));
            await conn.sendMessage(m.chat, {
                text: `👥 *Amici di @${user}*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['toptags', 'topgenres'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const res = await apiCall('user.gettoptags', { user, limit: 10 });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const tags = res.toptags?.tag || [];
            if (!tags.length) return m.reply('❌ Nessun tag trovato.');
            const cards = tags.map((tag, index) => {
                const cover = DEFAULT_COVER;
                const count = parseInt(tag.count || 0).toLocaleString();
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${tag.name.substring(0, 50)}`,
                    body: `Conteggio: ${count}`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url: tag.url
                        })
                    }]
                };
            });
            await conn.sendMessage(m.chat, {
                text: `🏷️ *Top Tag per @${user}*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['personaltags'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const [tag, type] = text.trim().toLowerCase().split(' ');
            if (!tag || !type) return m.reply(`❌ Uso: ${usedPrefix}${command} <tag> <artist|album|track>`);
            const taggingtype = type;
            if (!['artist', 'album', 'track'].includes(taggingtype)) return m.reply('❌ Tipo non valido: artist, album, track');
            const res = await apiCall('user.getpersonaltags', { user, tag, taggingtype, limit: 10 });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const items = res.taggings?.[`${taggingtype}s`]?.[taggingtype] || [];
            if (!items.length) return m.reply('❌ Nessun elemento trovato.');
            const cards = await Promise.all(items.map(async (item, index) => {
                const isArtist = taggingtype === 'artist';
                const queryName = isArtist ? item.name : `${item.artist.name} ${item.name}`;
                const cover = await fetchCover(item.image, queryName, isArtist);
                const body = isArtist ? '' : `👤 ${item.artist.name}`;
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${item.name.substring(0, 50)}${item.name.length > 50 ? '...' : ''}`,
                    body,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url: item.url
                        })
                    }]
                };
            }));
            await conn.sendMessage(m.chat, {
                text: `🏷️ *${tag.charAt(0).toUpperCase() + tag.slice(1)} ${taggingtype.charAt(0).toUpperCase() + taggingtype.slice(1)} per @${user}*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['weeklyartists', 'weeklyartisti'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const chartRes = await apiCall('user.getweeklychartlist', { user });
            if (chartRes.error) return m.reply(`❌ Errore Last.fm: ${chartRes.message}`);
            const charts = chartRes.weeklychartlist?.chart || [];
            if (!charts.length) return m.reply('❌ Nessuna chart settimanale trovata.');
            const latest = charts[charts.length - 1];
            const from = parseInt(latest.from);
            const to = parseInt(latest.to);
            const fromDate = new Date(from * 1000).toLocaleDateString('it-IT');
            const toDate = new Date(to * 1000).toLocaleDateString('it-IT');
            const res = await apiCall('user.getweeklyartistchart', { user, from, to });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const artists = res.weeklyartistchart?.artist || [];
            if (!artists.length) return m.reply('❌ Nessun artista trovato.');
            const cards = await Promise.all(artists.map(async (artist, index) => {
                const cover = await fetchCover(artist.image, artist.name, true);
                const playcount = parseInt(artist.playcount || 0).toLocaleString();
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${artist.name.substring(0, 50)}`,
                    body: `▶️ ${playcount} ascolti`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url: artist.url
                        })
                    }]
                };
            }));
            await conn.sendMessage(m.chat, {
                text: `🎤 *Top Artisti Settimanali per @${user} (${fromDate} - ${toDate})*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['weeklyalbums'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const chartRes = await apiCall('user.getweeklychartlist', { user });
            if (chartRes.error) return m.reply(`❌ Errore Last.fm: ${chartRes.message}`);
            const charts = chartRes.weeklychartlist?.chart || [];
            if (!charts.length) return m.reply('❌ Nessuna chart settimanale trovata.');
            const latest = charts[charts.length - 1];
            const from = parseInt(latest.from);
            const to = parseInt(latest.to);
            const fromDate = new Date(from * 1000).toLocaleDateString('it-IT');
            const toDate = new Date(to * 1000).toLocaleDateString('it-IT');
            const res = await apiCall('user.getweeklyalbumchart', { user, from, to });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const albums = res.weeklyalbumchart?.album || [];
            if (!albums.length) return m.reply('❌ Nessun album trovato.');
            const cards = await Promise.all(albums.map(async (album, index) => {
                const queryName = `${album.artist['#text']} ${album.name}`;
                const cover = await fetchCover(album.image, queryName);
                const playcount = parseInt(album.playcount || 0).toLocaleString();
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${album.name.substring(0, 50)}${album.name.length > 50 ? '...' : ''}`,
                    body: `👤 ${album.artist['#text']}\n▶️ ${playcount} ascolti`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url: album.url
                        })
                    }]
                };
            }));
            await conn.sendMessage(m.chat, {
                text: `📀 *Top Album Settimanali per @${user} (${fromDate} - ${toDate})*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['weeklytracks', 'weeklycanzoni'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const chartRes = await apiCall('user.getweeklychartlist', { user });
            if (chartRes.error) return m.reply(`❌ Errore Last.fm: ${chartRes.message}`);
            const charts = chartRes.weeklychartlist?.chart || [];
            if (!charts.length) return m.reply('❌ Nessuna chart settimanale trovata.');
            const latest = charts[charts.length - 1];
            const from = parseInt(latest.from);
            const to = parseInt(latest.to);
            const fromDate = new Date(from * 1000).toLocaleDateString('it-IT');
            const toDate = new Date(to * 1000).toLocaleDateString('it-IT');
            const res = await apiCall('user.getweeklytrackchart', { user, from, to });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const tracks = res.weeklytrackchart?.track || [];
            if (!tracks.length) return m.reply('❌ Nessuna canzone trovata.');
            const cards = await Promise.all(tracks.map(async (track, index) => {
                const queryName = `${track.artist['#text']} ${track.name}`;
                const cover = await fetchCover(track.image, queryName);
                const playcount = parseInt(track.playcount || 0).toLocaleString();
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${track.name.substring(0, 50)}${track.name.length > 50 ? '...' : ''}`,
                    body: `👤 ${track.artist['#text']}\n▶️ ${playcount} ascolti`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url: track.url
                        })
                    }]
                };
            }));
            await conn.sendMessage(m.chat, {
                text: `🎵 *Top Canzoni Settimanali per @${user} (${fromDate} - ${toDate})*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['topalbums', 'topalbum'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const periodInput = text.trim().toLowerCase() || 'mese';
            const period = validPeriodsMap[periodInput];
            if (!period) return m.reply(`❌ Periodo non valido. Usa: ${Object.keys(validPeriodsMap).join(', ')}`);
            const res = await apiCall('user.gettopalbums', { user, limit: 10, period });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const albums = res.topalbums?.album || [];
            if (!albums.length) return m.reply('❌ Nessun album trovato.');
            const cards = await Promise.all(albums.map(async (album, index) => {
                const queryName = `${album.artist.name} ${album.name}`;
                const cover = await fetchCover(album.image, queryName);
                const playcount = parseInt(album.playcount || 0).toLocaleString();
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${album.name.substring(0, 50)}${album.name.length > 50 ? '...' : ''}`,
                    body: `👤 ${album.artist.name}\n▶️ ${playcount} ascolti`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url: album.url
                        })
                    }]
                };
            }));
            await conn.sendMessage(m.chat, {
                text: `📀 *Top Album per @${user} (${periodInput})*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['topartists', 'topartisti'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const periodInput = text.trim().toLowerCase() || 'mese';
            const period = validPeriodsMap[periodInput];
            if (!period) return m.reply(`❌ Periodo non valido. Usa: ${Object.keys(validPeriodsMap).join(', ')}`);
            const res = await apiCall('user.gettopartists', { user, limit: 10, period });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const artists = res.topartists?.artist || [];
            if (!artists.length) return m.reply('❌ Nessun artista trovato.');
            const cards = await Promise.all(artists.map(async (artist, index) => {
                const cover = await fetchCover(artist.image, artist.name, true);
                const playcount = parseInt(artist.playcount || 0).toLocaleString();
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${artist.name.substring(0, 50)}`,
                    body: `▶️ ${playcount} ascolti`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url: artist.url
                        })
                    }]
                };
            }));
            await conn.sendMessage(m.chat, {
                text: `🎤 *Top Artisti per @${user} (${periodInput})*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['toptracks', 'topcanzoni'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            const periodInput = text.trim().toLowerCase() || 'mese';
            const period = validPeriodsMap[periodInput];
            if (!period) return m.reply(`❌ Periodo non valido. Usa: ${Object.keys(validPeriodsMap).join(', ')}`);
            const res = await apiCall('user.gettoptracks', { user, limit: 10, period });
            if (res.error) return m.reply(`❌ Errore Last.fm: ${res.message}`);
            const tracks = res.toptracks?.track || [];
            if (!tracks.length) return m.reply('❌ Nessuna canzone trovata.');
            const cards = await Promise.all(tracks.map(async (track, index) => {
                const queryName = `${track.artist.name} ${track.name}`;
                const cover = await fetchCover(track.image, queryName);
                const playcount = parseInt(track.playcount || 0).toLocaleString();
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${track.name.substring(0, 50)}${track.name.length > 50 ? '...' : ''}`,
                    body: `👤 ${track.artist.name}\n▶️ ${playcount} ascolti`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url: track.url
                        })
                    }]
                };
            }));
            await conn.sendMessage(m.chat, {
                text: `🎵 *Top Canzoni per @${user} (${periodInput})*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['taste', 'compare', 'compatibilita'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            let user1 = user || text.trim().split(' ')[0];
            let user2;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                const secondaryTarget = m.mentionedJid[0];
                user2 = db[secondaryTarget];
                if (!user2) return m.reply('⚠️ L\'utente taggato non ha registrato il suo username Last.fm.');
            } else if (text.trim().split(' ').length > 1) {
                user2 = text.trim().split(' ')[1];
            } else if (text.trim()) {
                user2 = text.trim();
            } else {
                return m.reply(`❌ Uso: ${usedPrefix}${command} <username2> o tagga un utente registrato. (Il tuo username è user1 per default)`);
            }

            const period = 'overall';
            const limit = 50;
            const res1 = await apiCall('user.gettopartists', { user: user1, limit, period });
            if (res1.error) return m.reply(`❌ Errore Last.fm per ${user1}: ${res1.message}`);
            const res2 = await apiCall('user.gettopartists', { user: user2, limit, period });
            if (res2.error) return m.reply(`❌ Errore Last.fm per ${user2}: ${res2.message}`);

            const artistMap1 = new Map(res1.topartists?.artist.map(a => [a.name.toLowerCase(), {name: a.name, playcount: parseInt(a.playcount) || 0}]));
            const artistMap2 = new Map(res2.topartists?.artist.map(a => [a.name.toLowerCase(), {name: a.name, playcount: parseInt(a.playcount) || 0}]));

            const allLowerArtists = new Set([...artistMap1.keys(), ...artistMap2.keys()]);
            const vec1 = [];
            const vec2 = [];
            for (let lowerName of allLowerArtists) {
                vec1.push(artistMap1.get(lowerName)?.playcount || 0);
                vec2.push(artistMap2.get(lowerName)?.playcount || 0);
            }

            const dot = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
            const norm1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
            const norm2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
            let score = (norm1 === 0 || norm2 === 0) ? 0 : (dot / (norm1 * norm2) * 100);

            const lowerCommon = [...artistMap1.keys()].filter(key => artistMap2.has(key));
            lowerCommon.sort((a, b) => {
                const minA = Math.min(artistMap1.get(a).playcount, artistMap2.get(a).playcount);
                const minB = Math.min(artistMap1.get(b).playcount, artistMap2.get(b).playcount);
                return minB - minA;
            });
            const artists = lowerCommon.slice(0, 10).map(lowerName => ({
                name: artistMap1.get(lowerName).name,
                play1: artistMap1.get(lowerName).playcount,
                play2: artistMap2.get(lowerName).playcount
            }));

            let compatibilityLevel, statusColor;
            if (score > 80) {
                compatibilityLevel = 'Alta';
                statusColor = '#32d74b';
            } else if (score > 50) {
                compatibilityLevel = 'Media';
                statusColor = '#ffcc00';
            } else {
                compatibilityLevel = 'Bassa';
                statusColor = '#ff3b30';
            }

            const cards = await Promise.all(artists.map(async (artist, index) => {
                const artistInfo = await apiCall('artist.getinfo', { artist: artist.name });
                let cover = DEFAULT_COVER;
                let url = `https://www.last.fm/music/${encodeURIComponent(artist.name)}`;
                if (!artistInfo.error) {
                    cover = await fetchCover(artistInfo.artist?.image, artist.name, true);
                    url = artistInfo.artist?.url || url;
                }
                const match = Math.min(artist.play1, artist.play2) / Math.max(artist.play1, artist.play2) * 100;
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${artist.name}`,
                    body: `Match: ${match.toFixed(2)}%`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url
                        })
                    }]
                };
            }));

            const html = `
            <html>
            <head>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
                    body { margin: 0; padding: 0; width: 1000px; height: 600px; display: flex; align-items: center; justify-content: center; font-family: 'Plus Jakarta Sans', sans-serif; background: #000; overflow: hidden; }
                    .background { position: absolute; width: 100%; height: 100%; background: linear-gradient(to right, #0a84ff, #ff3b30); filter: blur(30px) brightness(0.7); opacity: 0.7; }
                    .glass-card { position: relative; width: 880px; height: 480px; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 50px; display: flex; align-items: center; padding: 45px; box-sizing: border-box; box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
                    .details { flex: 1; color: white; text-align: center; }
                    .status { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: ${statusColor}; margin-bottom: 15px; }
                    .track-name { font-size: 44px; font-weight: 800; line-height: 1.1; margin-bottom: 10px; letter-spacing: -1.5px; }
                    .artist-name { font-size: 26px; color: rgba(255,255,255,0.6); font-weight: 600; margin-bottom: 30px; }
                    .stats-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
                    .stat-item { background: rgba(255, 255, 255, 0.04); padding: 15px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.05); }
                    .stat-label { font-size: 10px; color: rgba(255,255,255,0.3); text-transform: uppercase; font-weight: 800; margin-bottom: 4px; }
                    .stat-value { font-size: 20px; font-weight: 700; color: #fff; }
                </style>
            </head>
            <body>
                <div class="background"></div>
                <div class="glass-card">
                    <div class="details">
                        <div class="status">Compatibilità Musicale</div>
                        <div class="track-name">${score.toFixed(2)}%</div>
                        <div class="artist-name">Tra @${user1} e @${user2}</div>
                        <div class="stats-grid">
                            <div class="stat-item"><div class="stat-label">Livello</div><div class="stat-value">${compatibilityLevel}</div></div>
                            <div class="stat-item"><div class="stat-label">Artisti Condivisi</div><div class="stat-value">${artists.length}</div></div>
                        </div>
                    </div>
                </div>
            </body>
            </html>`;
            const buffer = await retryScreenshot(html);
            await conn.sendMessage(m.chat, {
                text: `🔍 *Compatibilità tra @${user1} e @${user2}: ${score.toFixed(2)}%*`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: [{
                    image: buffer,
                    title: `Compatibilità: ${score.toFixed(2)}%`,
                    body: `Livello: ${compatibilityLevel}`,
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: []
                }, ...cards]
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }

    if (['commonartists'].includes(command)) {
        try {
            await conn.sendPresenceUpdate('composing', m.chat);
            let user1 = user;
            let user2;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                const secondaryTarget = m.mentionedJid[0];
                user2 = db[secondaryTarget];
                if (!user2) return m.reply('⚠️ L\'utente taggato non ha registrato il suo username Last.fm.');
            } else if (text.trim()) {
                user2 = text.trim();
            } else {
                return m.reply(`❌ Uso: ${usedPrefix}${command} <username2> o tagga un utente registrato.`);
            }
            const period = 'overall';
            const res1 = await apiCall('user.gettopartists', { user: user1, limit: 50, period });
            if (res1.error) return m.reply(`❌ Errore Last.fm per ${user1}: ${res1.message}`);
            const res2 = await apiCall('user.gettopartists', { user: user2, limit: 50, period });
            if (res2.error) return m.reply(`❌ Errore Last.fm per ${user2}: ${res2.message}`);
            const artistMap1 = new Map(res1.topartists?.artist.map(a => [a.name.toLowerCase(), {name: a.name, playcount: parseInt(a.playcount) || 0}]));
            const artistMap2 = new Map(res2.topartists?.artist.map(a => [a.name.toLowerCase(), {name: a.name, playcount: parseInt(a.playcount) || 0}]));
            const lowerCommon = [...artistMap1.keys()].filter(key => artistMap2.has(key));
            if (!lowerCommon.length) return m.reply('❌ Nessun artista in comune trovato.');
            lowerCommon.sort((a, b) => {
                const sumA = artistMap1.get(a).playcount + artistMap2.get(a).playcount;
                const sumB = artistMap1.get(b).playcount + artistMap2.get(b).playcount;
                return sumB - sumA;
            });
            const commonArtists = lowerCommon.slice(0, 10).map(lowerName => artistMap1.get(lowerName).name);
            const cards = await Promise.all(commonArtists.map(async (artistName, index) => {
                const artistInfo = await apiCall('artist.getinfo', { artist: artistName });
                let cover = DEFAULT_COVER;
                let url = `https://www.last.fm/music/${encodeURIComponent(artistName)}`;
                if (!artistInfo.error) {
                    cover = await fetchCover(artistInfo.artist?.image, artistName, true);
                    url = artistInfo.artist?.url || url;
                }
                return {
                    image: { url: cover },
                    title: `${index + 1}. ${artistName}`,
                    body: '',
                    footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Vedi su Last.fm",
                            url
                        })
                    }]
                };
            }));
            await conn.sendMessage(m.chat, {
                text: `🎤 *Artisti in Comune tra @${user1} e @${user2}* (Top 10)`,
                footer: '𝐯𝐚𝐫𝐞 ✧ 𝐛𝐨𝐭',
                cards: cards
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            return m.reply(globalErrore);
        } finally {
            await conn.sendPresenceUpdate('paused', m.chat);
        }
    }
};

handler.help = [
    'setuser','cur',
    'lastfm', 'recenti', 'preferiti', 'lfmfriends',
    'toptags','weeklyartisti',
    'weeklyalbums',
    'weeklytracks',
    'topalbums',
    'topartists',
    'toptracks', 'compare',
    'commonartists'
]
handler.command = [
    'setuser', 'impostauser', 'lastfmset',
    'cur', 'attuale', 'nowplaying', 'np',
    'lastfm', 'profilolastfm', 'lfmprofile',
    'recent', 'recenti', 'lasttracks',
    'lovedtracks', 'preferiti', 'favorites',
    'friends', 'amici', 'lfmfriends',
    'toptags', 'topgenres',
    'personaltags',
    'weeklyartists', 'weeklyartisti',
    'weeklyalbums',
    'weeklytracks', 'weeklycanzoni',
    'topalbums', 'topalbum',
    'topartists', 'topartisti',
    'toptracks', 'topcanzoni',
    'taste', 'compare', 'compatibilita',
    'commonartists'
]
handler.group = true
handler.register = true

export default handler