import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

const gottacleants = (text) => {
    return text
        .replace(/\s+(x|feat\.?|ft\.?|with)\s+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const anothershi = (text) => {
    return text
        .replace(/^[\s\S]*?Read More\s*/i, '')
        .replace(/^\d+\s*Contributors.*/i, '')
        .replace(/^.*?Translations.*/i, '')
        .replace(/^.*?Lyrics\s*/i, '')
        .replace(/\[.*?\]/g, '')
        .replace(/Embed$/i, '')
        .replace(/You might also like/gi, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

function ita(dateString) {
    if (!dateString) return 'N/D';
    const mesi = [
        'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
        'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
    ];
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]} ${mesi[parseInt(parts[1]) - 1]} ${parts[0]}`;
    }
    return dateString;
}

const mm = (song, lyrics) => {
    const releaseDate = ita(song.release_date);
    let views = 'N/D';
    if (song.stats && song.stats.pageviews) {
        views = song.stats.pageviews.toLocaleString('it-IT');
    }
    const album = song.album?.name || 'Singolo/N.D.';
    let producer = 'N/D';
    if (song.producer_artists && song.producer_artists.length > 0) {
        producer = song.producer_artists.map(p => p.name).join(', ');
    }
    let header = `- 『 🎶 』 *${song.title.toUpperCase()}*\r\n` +
                 `- 『 👤 』 *Artista:* ${song.primary_artist.name}\r\n` +
                 `- 『 🎬 』 *Album:* ${album}\r\n` +
                 `- 『 📅 』 *Data:* ${releaseDate}\r\n` +
                 `- 『 🎛 』 *Produttore:* ${producer}\r\n` +
                 `- 『 👁 』 *Views:* ${views}\r\n` +
                 `\r\n⭑━✦⁺₊✧ 𝓿𝓪𝓻𝓮𝓫𝓸𝓽 ✧₊⁺✦━⭑\r\n\r\n`;

    return header + lyrics;
};

async function pijalafoto(song) {
    if (song.song_art_image_url) return song.song_art_image_url;
    if (song.header_image_url) return song.header_image_url;
    if (song.album && song.album.cover_art_url) return song.album.cover_art_url;
    return null;
}

const fattistakey = (m) => {
    const owners = global.owner || [];
    const userJid = m.sender;
    return owners.some(owner => {
        if (typeof owner === 'string') return owner === userJid;
        if (Array.isArray(owner)) return owner[0] === userJid;
        return false;
    });
};

let handler = async (m, { text, usedPrefix, command, conn }) => {
    if (!global.APIKeys?.genius) {
        if (fattistakey(m)) return m.reply(`🔑 *API KEY MANCANTE*`);
        return m.reply(`❌ *SERVIZIO NON DISPONIBILE*`);
    }

    if (!text) {
        return m.reply(`📝 *Uso:* ${usedPrefix + command} <titolo> [artista]`);
    }

    try {
        const checosahaidetto = gottacleants(text);
        const searchRes = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(checosahaidetto)}`, {
            headers: { 'Authorization': `Bearer ${global.APIKeys.genius}` }
        });

        if (!searchRes.ok) throw new Error('Search API Error');
        const searchData = await searchRes.json();

        if (!searchData.response?.hits?.length) {
            return m.reply(`🔍 Nessun risultato per: "${checosahaidetto}"`);
        }
        const hit = searchData.response.hits[0].result;
        const songRes = await fetch(`https://api.genius.com/songs/${hit.id}`, {
            headers: { 'Authorization': `Bearer ${global.APIKeys.genius}` }
        });
        if (!songRes.ok) throw new Error('Song API Error');
        const songData = await songRes.json();
        const song = songData.response.song;
        const lyricsRes = await fetch(song.url);
        const html = await lyricsRes.text();
        const $ = cheerio.load(html);
        $('br').replaceWith('\n');
        let lyrics = '';
        $('[data-lyrics-container="true"]').each((i, el) => {
            lyrics += $(el).text() + '\n';
        });

        if (!lyrics) {
            lyrics = $('.lyrics').text();
        }

        lyrics = anothershi(lyrics);

        if (!lyrics || lyrics.length < 10) {
            lyrics = `⚠️ *Testo protetto o non disponibile.*\nPuoi leggerlo qui: ${song.url}`;
        }

        const finalMessage = mm(song, lyrics);
        const buttons = [
             { buttonId: `.playaudio ${song.title} ${song.primary_artist.name}`, buttonText: { displayText: '▶️ Audio' }, type: 1 },
             { buttonId: `.playvideo ${song.title} ${song.primary_artist.name}`, buttonText: { displayText: '🎬 Video' }, type: 1 }
        ];
        let messageOptions = {
            text: finalMessage,
            footer: '𝓿𝓪𝓻𝓮𝓫𝓸𝓽',
            buttons: buttons,
            headerType: 1
        };
        try {
            const imageUrl = await pijalafoto(song);
            if (imageUrl) {
                const imgRes = await fetch(imageUrl);
                const imgBuff = Buffer.from(await imgRes.arrayBuffer());
                messageOptions = {
                    image: imgBuff,
                    caption: finalMessage,
                    footer: '𝓿𝓪𝓻𝓮𝓫𝓸𝓽',
                    buttons: buttons,
                    headerType: 4
                };
            }
        } catch (e) {
            console.log('No image found');
        }

        await conn.sendMessage(m.chat, messageOptions);

    } catch (e) {
        console.error(e);
        m.reply(`❌ Errore: ${e.message}`);
    }
};

handler.help = ['lyrics <titolo>'];
handler.tags = ['strumenti'];
handler.command = ['lyrics', 'testo', 'lyric'];

export default handler;