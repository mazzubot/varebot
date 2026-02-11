import axios from 'axios';
import React from 'react';
import { renderToString } from 'react-dom/server';

const getRank = (euro) => {
    if (euro >= 1000000) return { name: 'Magnate', emoji: '🏛️' };
    if (euro >= 100000) return { name: 'CEO', emoji: '💼' };
    if (euro >= 50000) return { name: 'Investitore', emoji: '📈' };
    if (euro >= 25000) return { name: 'Avvocato', emoji: '⚖️' };
    if (euro >= 10000) return { name: 'Ingegnere', emoji: '🛠️' };
    if (euro >= 5000) return { name: 'Commesso', emoji: '🛍️' };
    return { name: 'Tirocinante', emoji: '🧑‍💼' };
};

const BankCard = ({ user, name, pfpUrl }) => {
    const userRank = getRank(user.euro);
    const currentExp = user.exp || 0;
    const expNeeded = (user.level || 1) * 1000; 
    const percent = Math.min(100, Math.floor((currentExp / expNeeded) * 100)) || 45;

    const formatCurrency = (num) => {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
    };

    const generateUniqueCardNumber = (username) => {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = ((hash << 5) - hash) + username.charCodeAt(i);
            hash = hash & hash;
        }
        const positiveHash = Math.abs(hash);
        const cardNum = String(positiveHash).padStart(16, '0').slice(0, 16);
        return cardNum.match(/.{1,4}/g).join(' ');
    };

    const css = `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Poppins:wght@300;400;600;700&display=swap');
        
        body { margin: 0; padding: 0; font-family: 'Poppins', sans-serif; }
        
        .container {
            width: 800px;
            height: 1000px;
            /* SFONDO RIPRISTINATO: Gradiente radiale viola/blu */
            background: radial-gradient(circle at 50% 0%, #2a2a72 0%, #0f0c29 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 60px 50px;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            color: white;
            justify-content: flex-start;
            gap: 40px;
        }

        /* SFONDO PATTERN: Puntini sottili e bagliore */
        .bg-pattern {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: 
                radial-gradient(circle at 20% 30%, rgba(99, 73, 216, 0.2) 0%, transparent 50%),
                radial-gradient(rgba(255,255,255,0.03) 2px, transparent 2px);
            background-size: 100% 100%, 40px 40px;
            z-index: 0;
        }

        .header {
            z-index: 2;
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            position: relative;
        }

        .user-profile-section {
            display: flex;
            align-items: center;
            gap: 25px;
        }

        .avatar {
            width: 110px;
            height: 110px;
            border-radius: 25px;
            border: 3px solid rgba(163, 148, 240, 0.5);
            box-shadow: 0 0 30px rgba(99, 73, 216, 0.4);
            object-fit: cover;
        }

        .user-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .user-name {
            font-size: 32px;
            font-weight: 700;
            color: white;
            line-height: 1.2;
            text-transform: capitalize;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .user-rank-badge {
            font-size: 18px;
            color: #a394f0;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 5px;
            background: rgba(255,255,255,0.05);
            padding: 4px 12px;
            border-radius: 8px;
            width: fit-content;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255,255,255,0.1);
        }

        .varebot-logo-top {
            font-family: 'Orbitron', sans-serif;
            font-size: 48px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 2px;
            background: linear-gradient(180deg, #d0c4ff 0%, #7b5aff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 10px 20px rgba(99, 73, 216, 0.3);
            position: absolute;
            right: 0;
            top: 10px;
        }

        /* CARTA DI CREDITO PREMIUM */
        .credit-card {
            width: 100%;
            height: 280px;
            /* Gradiente più profondo e ricco */
            background: linear-gradient(135deg, rgba(42, 42, 114, 0.9) 0%, rgba(15, 12, 41, 0.95) 100%);
            backdrop-filter: blur(30px) saturate(150%);
            /* Bordi stile "vetro tagliato" */
            border-top: 1.5px solid rgba(255, 255, 255, 0.35);
            border-left: 1.5px solid rgba(255, 255, 255, 0.35);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 25px;
            position: relative;
            padding: 35px;
            box-sizing: border-box;
            /* Ombra profonda e bagliore interno */
            box-shadow: 
                0 30px 60px -15px rgba(0,0,0,0.6),
                inset 0 0 30px rgba(99, 73, 216, 0.25);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            z-index: 5;
            margin-bottom: 20px;
            overflow: hidden;
        }

        /* Effetto riflesso sulla carta */
        .credit-card::before {
            content: '';
            position: absolute;
            top:0; left:0; right:0; bottom:0;
            background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.15) 45%, transparent 60%);
            pointer-events: none;
            mix-blend-mode: overlay;
        }

        .chip {
            width: 55px;
            height: 40px;
            background: linear-gradient(135deg, #e0ba6c 0%, #bf953f 100%);
            border-radius: 8px;
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.2);
            box-shadow: inset 0 2px 5px rgba(0,0,0,0.2);
        }
        
        .chip::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: repeating-linear-gradient(90deg, transparent 0, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 11px);
        }

        .card-number {
            font-family: 'Orbitron', sans-serif;
            font-size: 32px;
            letter-spacing: 6px;
            color: white;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            margin-top: 10px;
            z-index: 2;
        }

        .card-details {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            z-index: 2;
        }

        .card-label {
            font-size: 10px;
            text-transform: uppercase;
            color: rgba(255,255,255,0.6);
            margin-bottom: 4px;
            letter-spacing: 1px;
        }
        
        .card-holder {
            font-size: 18px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .mastercard-circles {
            display: flex;
        }
        .mc-circle {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            opacity: 0.8;
            mix-blend-mode: hard-light;
        }
        .mc-red { background: #eb001b; }
        .mc-orange { background: #ff5f00; margin-left: -15px; }

        .stats-grid {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            z-index: 2;
        }

        /* GLASSMISM CARDS MIGLIORATO */
        .stat-card {
            /* Molto più trasparente */
            background: rgba(255, 255, 255, 0.05);
            /* Sfocatura elevata per vero effetto vetro */
            backdrop-filter: blur(25px) saturate(120%);
            -webkit-backdrop-filter: blur(25px) saturate(120%);
            /* Bordi sottili e nitidi */
            border-top: 1px solid rgba(255, 255, 255, 0.3);
            border-left: 1px solid rgba(255, 255, 255, 0.3);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 22px;
            padding: 25px;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: hidden;
            /* Ombra morbida e bagliore interno */
            box-shadow: 
                0 15px 35px rgba(0,0,0,0.2),
                inset 0 0 20px rgba(255,255,255,0.02);
        }

        .card-wide {
            grid-column: span 2;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            /* Leggera tinta viola per la card livello */
            background: linear-gradient(90deg, rgba(99, 73, 216, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
        }

        .level-info {
            z-index: 2;
        }

        .level-title {
            color: #a394f0;
            font-size: 14px;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 1px;
        }

        .level-number {
            font-size: 42px;
            font-weight: 800;
            font-family: 'Orbitron', sans-serif;
            color: white;
            line-height: 1;
            margin: 5px 0;
            text-shadow: 0 0 15px rgba(99, 73, 216, 0.5);
        }

        .progress-container {
            width: 60%;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 2;
        }

        .progress-bar-bg {
            width: 100%;
            height: 12px;
            background: rgba(0,0,0,0.2);
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #6349d8, #a394f0);
            border-radius: 10px;
            box-shadow: 0 0 15px #6349d8;
        }

        .progress-text {
            text-align: right;
            font-size: 14px;
            font-weight: 600;
            color: rgba(255,255,255,0.9);
        }

        .money-card-content {
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 2;
        }

        .icon-box {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            background: rgba(255,255,255,0.07);
            border: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            box-shadow: inset 0 0 10px rgba(99, 73, 216, 0.2);
        }

        .money-val {
            font-size: 24px;
            font-weight: 700;
            font-family: 'Orbitron', sans-serif;
            text-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        
        .money-label {
            font-size: 12px;
            color: rgba(255,255,255,0.5);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 2px;
        }

    `;

    return React.createElement('html', null,
        React.createElement('head', null,
            React.createElement('meta', { charSet: 'UTF-8' }),
            React.createElement('style', { dangerouslySetInnerHTML: { __html: css } })
        ),
        React.createElement('body', null,
            React.createElement('div', { className: 'container' },
                React.createElement('div', { className: 'bg-pattern' }),
                
                React.createElement('div', { className: 'header' },
                    React.createElement('div', { className: 'user-profile-section' },
                        React.createElement('img', { src: pfpUrl, className: 'avatar' }),
                        React.createElement('div', { className: 'user-info' },
                            React.createElement('div', { className: 'user-name' }, name),
                            React.createElement('div', { className: 'user-rank-badge' }, 
                                React.createElement('span', null, userRank.emoji),
                                React.createElement('span', null, userRank.name)
                            )
                        )
                    ),
                    React.createElement('div', { className: 'varebot-logo-top' }, 'VAREBOT')
                ),

                React.createElement('div', { className: 'credit-card' },
                    React.createElement('div', null,
                        React.createElement('div', { className: 'chip' }),
                        React.createElement('div', { className: 'card-number' }, generateUniqueCardNumber(name))
                    ),
                    React.createElement('div', { className: 'card-details' },
                        React.createElement('div', null,
                            React.createElement('div', { className: 'card-label' }, 'TITOLARE'),
                            React.createElement('div', { className: 'card-holder' }, name)
                        ),
                        React.createElement('div', { className: 'mastercard-circles' },
                            React.createElement('div', { className: 'mc-circle mc-red' }),
                            React.createElement('div', { className: 'mc-circle mc-orange' })
                        )
                    )
                ),

                React.createElement('div', { className: 'stats-grid' },
                    React.createElement('div', { className: 'stat-card card-wide' },
                        React.createElement('div', { className: 'level-info' },
                            React.createElement('div', { className: 'level-title' }, 'Livello Attuale'),
                            React.createElement('div', { className: 'level-number' }, user.level)
                        ),
                        React.createElement('div', { className: 'progress-container' },
                            React.createElement('div', { className: 'progress-text' }, `${percent}% EXP`),
                            React.createElement('div', { className: 'progress-bar-bg' },
                                React.createElement('div', { 
                                    className: 'progress-fill', 
                                    style: { width: `${percent}%` } 
                                })
                            )
                        )
                    ),

                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'money-card-content' },
                            React.createElement('div', { className: 'icon-box' }, '🏛️'),
                            React.createElement('div', null,
                                React.createElement('div', { className: 'money-label' }, 'Saldo Bancario'),
                                React.createElement('div', { className: 'money-val' }, formatCurrency(user.bank))
                            )
                        )
                    ),

                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'money-card-content' },
                            React.createElement('div', { className: 'icon-box' }, '💶'),
                            React.createElement('div', null,
                                React.createElement('div', { className: 'money-label' }, 'Contanti'),
                                React.createElement('div', { className: 'money-val' }, formatCurrency(user.euro))
                            )
                        )
                    )
                )
            )
        )
    );
};
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const generateBankImage = async (userData, retryCount = 0) => {
    const browserlessKey = global.APIKeys.browserless || global.APIKeys.browserless_default;
    const maxRetries = 3;
    
    try {
        const reactElement = React.createElement(BankCard, userData);
        const htmlContent = `<!DOCTYPE html>${renderToString(reactElement)}`;

        const response = await axios.post(`https://production-sfo.browserless.io/screenshot?token=${browserlessKey}`, {
            html: htmlContent,
            options: {
                type: 'jpeg',
                quality: 92
            },
            viewport: {
                width: 800,
                height: 1000,
                deviceScaleFactor: 2
            }
        }, {
            responseType: 'arraybuffer',
            timeout: 35000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return Buffer.from(response.data);

    } catch (error) {
        if (error.response?.status === 429 && retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 1000;
            console.log(`Rate limit raggiunto. Retry ${retryCount + 1}/${maxRetries} dopo ${waitTime}ms...`);
            await delay(waitTime);
            return generateBankImage(userData, retryCount + 1);
        }
        
        console.error('Errore generazione immagine banca:', error.message);
        if (error.response?.status === 429) {
            throw new Error('Rate limit raggiunto. Riprova tra qualche secondo.');
        }
        throw new Error('Fallback testo');
    }
};

let handler = async (m, { conn, usedPrefix }) => {
    let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : m.sender;
    if (who === conn.user.jid) return m.react('✖️');
    
    const user = global.db.data.users[who];
    if (!user) return m.reply(`*L'utente non è registrato nel database.*`);

    const name = await conn.getName(who);
    const isOwner = who === m.sender; 
    let pfpUrl = 'https://i.ibb.co/YrWKV59/varebot-pfp.png';
    try {
        pfpUrl = await conn.profilePictureUrl(who, 'image');
    } catch (e) {}

    try {
        await m.react('🏦');
        
        const imageBuffer = await generateBankImage({
            user,
            name,
            isOwner,
            pfpUrl
        });
        
        const caption = `
 ⋆｡˚『 ╭ \`BANCA VAREBOT\` ╯ 』˚｡⋆\n╭\n│
│ 『 👤 』 \`Nome:\` ${name}
│ 『 🍥 』 \`Utente:\` @${who.split('@')[0]}
│
│『 💰 』 _*Patrimonio:*_
│ 『 🪙 』 \`Banca:\` *${user.bank.toLocaleString()}*
┃ 💶 *Contanti:* ${user.euro.toLocaleString()} €
│
│『 📊 』 _*Statistiche:*_
│ 『 🆙 』 \`Livello:\` *${user.level}*
│ 『 ⚜️ 』 \`Ruolo:\` *${user.role}*
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`.trim();

        const buttons = [
            { buttonId: `${usedPrefix}lavoro`, buttonText: { displayText: '💼 Lavora' }, type: 1 },
            { buttonId: `${usedPrefix}deposita all`, buttonText: { displayText: '📥 Deposita Tutto' }, type: 1 },
            { buttonId: `${usedPrefix}ritira all`, buttonText: { displayText: '📤 Ritira Tutto' }, type: 1 }
        ];

        await conn.sendMessage(m.chat, {
            image: imageBuffer,
            caption: caption,
            buttons: buttons,
            footer: '',
            mentions: [who]
        }, { quoted: m });
        
    } catch (error) {
        const isRateLimit = error.message.includes('Rate limit');
        let txt = ` ⋆｡˚『 ╭ \`BANCA VAREBOT\` ╯ 』˚｡⋆\n╭\n│
│ 『 👤 』 \`Nome:\` ${name}
│ 『 🍥 』 \`Utente:\` @${who.split('@')[0]}
│
│『 💰 』 _*Patrimonio:*_
│ 『 🪙 』 \`Banca:\` *${user.bank.toLocaleString()}*
┃ 『 💶 』 *Contanti:* ${user.euro.toLocaleString()} €
│
│『 📊 』 _*Statistiche:*_
│ 『 🆙 』 \`Livello:\` *${user.level}*
│ 『 ⚜️ 』 \`Ruolo:\` *${user.role}*
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`;
        await m.reply(txt, null, { mentions: [who] });
    }
};

handler.help = ['banca', 'portafoglio'];
handler.tags = ['euro'];
handler.command = /^(bank|banca|saldo|wallet|portafoglio|bilancio)$/i;
handler.group = true;
handler.register = true;

export default handler;