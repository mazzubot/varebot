import axios from 'axios';
import React from 'react';
import { renderToString } from 'react-dom/server';

const InventoryCard = ({ user, name, pfpUrl }) => {
    const totalWealth = (user.euro || 0) + (user.bank || 0);
    const primaryPurple = '#6349d8';
    
    const formatCurrency = (num) => {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('it-IT').format(num);
    };

    const css = `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Poppins:wght@300;400;600;700&display=swap');
        
        body { margin: 0; padding: 0; font-family: 'Poppins', sans-serif; }
        
        .container {
            width: 800px;
            height: 1000px;
            background: radial-gradient(circle at 50% 0%, #2a2a72 0%, #0f0c29 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            padding: 60px 40px;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            color: white;
        }

        .bg-pattern {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: 
                radial-gradient(circle at 20% 30%, rgba(99, 73, 216, 0.25) 0%, transparent 60%),
                radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px);
            background-size: 100% 100%, 30px 30px;
            z-index: 0;
        }

        .header {
            z-index: 2;
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }

        .brand-pill {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.15);
            padding: 8px 20px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: rgba(255,255,255,0.9);
        }

        .avatar {
            width: 65px;
            height: 65px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 0 20px rgba(99, 73, 216, 0.6);
            object-fit: cover;
        }

        .balance-section {
            text-align: center;
            z-index: 2;
            margin-bottom: 40px;
        }

        .balance-label {
            font-size: 15px;
            color: #a394f0; 
            text-transform: uppercase;
            letter-spacing: 3px;
            font-weight: 500;
            margin-bottom: 8px;
        }

        .balance-amount {
            font-family: 'Orbitron', sans-serif;
            font-size: 72px;
            font-weight: 700;
            color: white;
            text-shadow: 0 0 35px rgba(99, 73, 216, 0.7);
        }

        .info-card {
            width: 100%;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(35px) saturate(100%);
            -webkit-backdrop-filter: blur(35px) saturate(100%);
            
            border-top: 1.5px solid rgba(255, 255, 255, 0.3);
            border-left: 1.5px solid rgba(255, 255, 255, 0.3);
            border-right: 1px solid rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            
            border-radius: 24px;
            position: relative;
            padding: 30px;
            
            box-shadow: 
                0 35px 70px -20px rgba(0, 0, 0, 0.8),
                inset 0 0 30px rgba(99, 73, 216, 0.1);
                
            z-index: 5;
            overflow: hidden;
            margin-bottom: 20px;
        }

        .card-shine {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(
                115deg,
                transparent 30%,
                rgba(255, 255, 255, 0.15) 45%,
                rgba(255, 255, 255, 0.05) 50%,
                transparent 60%
            );
            z-index: 1;
            pointer-events: none;
            mix-blend-mode: overlay;
        }

        .user-info {
            z-index: 2;
            position: relative;
        }

        .user-name {
            font-size: 28px;
            font-weight: 700;
            color: white;
            margin: 0 0 5px 0;
            letter-spacing: 0.5px;
        }

        .user-handle {
            font-size: 16px;
            color: rgba(255,255,255,0.6);
            margin: 0;
            letter-spacing: 1px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            width: 100%;
            z-index: 2;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            padding: 18px;
            display: flex;
            align-items: center;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        }

        .stat-icon-box {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            margin-right: 15px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.08);
        }

        .stat-content h4 {
            margin: 0;
            font-size: 11px;
            color: rgba(255,255,255,0.5);
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }
        
        .stat-content p {
            margin: 3px 0 0 0;
            font-size: 20px;
            font-weight: 700;
            color: white;
        }

        .footer {
            margin-top: 25px;
            font-size: 12px;
            color: rgba(255,255,255,0.3);
            letter-spacing: 1px;
            text-transform: uppercase;
            z-index: 2;
        }
    `;

    const iconStyle = { color: primaryPurple, textShadow: `0 0 15px ${primaryPurple}60` };

    return React.createElement('html', null,
        React.createElement('head', null,
            React.createElement('meta', { charSet: 'UTF-8' }),
            React.createElement('style', { dangerouslySetInnerHTML: { __html: css } })
        ),
        React.createElement('body', null,
            React.createElement('div', { className: 'container' },
                React.createElement('div', { className: 'bg-pattern' }),
                React.createElement('div', { className: 'header' },
                    React.createElement('div', { className: 'brand-pill' }, 'VareBot Inventario'),
                    React.createElement('img', { src: pfpUrl, className: 'avatar' })
                ),
                React.createElement('div', { className: 'balance-section' },
                    React.createElement('div', { className: 'balance-label' }, 'Patrimonio Totale'),
                    React.createElement('div', { className: 'balance-amount' }, formatCurrency(totalWealth))
                ),
                React.createElement('div', { className: 'info-card' },
                    React.createElement('div', { className: 'card-shine' }),
                    React.createElement('div', { className: 'user-info' },
                        React.createElement('h2', { className: 'user-name' }, name),
                        React.createElement('p', { className: 'user-handle' }, `@${name.toLowerCase().replace(/\s/g, '_')}`)
                    )
                ),
                React.createElement('div', { className: 'stats-grid' },
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, '🌟'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'Euro'),
                            React.createElement('p', null, formatCurrency(user.euro || 0))
                        )
                    ),
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, '🏦'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'In Banca'),
                            React.createElement('p', null, formatCurrency(user.bank || 0))
                        )
                    ),
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, '✨'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'Esperienza'),
                            React.createElement('p', null, formatNumber(user.exp || 0))
                        )
                    ),
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, '❤️'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'Salute'),
                            React.createElement('p', null, `${user.health || 100}/100`)
                        )
                    ),
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, user.premium ? '⭐' : '📦'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'Premium'),
                            React.createElement('p', null, user.premium ? 'Attivo' : 'Non Attivo')
                        )
                    ),
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, '🆙'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'Livello'),
                            React.createElement('p', null, user.level || 1)
                        )
                    )
                ),
                React.createElement('div', { className: 'footer' }, '📦 VareBot Inventory System')
            )
        )
    );
};

export const generateInventoryImage = async (userData) => {
    const browserlessKey = global.APIKeys.browserless || global.APIKeys.browserless_default;
    try {
        const reactElement = React.createElement(InventoryCard, userData);
        const htmlContent = `<!DOCTYPE html>${renderToString(reactElement)}`;

        const response = await axios.post(`https://production-sfo.browserless.io/screenshot?token=${browserlessKey}`, {
            html: htmlContent,
            options: {
                type: 'jpeg',
                quality: 90
            },
            viewport: {
                width: 800,
                height: 1000,
                deviceScaleFactor: 2
            }
        }, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        return Buffer.from(response.data);

    } catch (error) {
        console.error('Errore generazione immagine inventario:', error.message);
        throw new Error('Fallback testo');
    }
};

let handler = async (m, { conn, usedPrefix }) => {
    let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.sender;
    
    if (!(who in global.db.data.users)) {
        return conn.reply(m.chat, `㌌ L'utente non si trova nel mio database.`, m);
    }

    let user = global.db.data.users[who];
    let name = await conn.getName(who);
    let pfpUrl = 'https://i.ibb.co/YrWKV59/varebot-pfp.png'
    
    try {
        pfpUrl = await conn.profilePictureUrl(who, 'image');
    } catch (e) {}

    try {
        await m.react('📦');
        
        const imageBuffer = await generateInventoryImage({
            user,
            name,
            pfpUrl
        });

        const formatNumber = (num) => {
            return num.toLocaleString('it-IT');
        };
        let totalStars = (user.euro || 0) + (user.bank || 0);

        const caption = `
 ⋆｡˚『 ╭ \`INVENTARIO\` ╯ 』˚｡⋆\n╭\n│
│ 『 👤 』 \`Nome:\` *${name}*
│ 『 🍥 』 \`Utente:\` *@${who.split('@')[0]}*
│
│ 『 💰 』 _*Risorse Principali:*_
│ • 『 🌟 』 \`euro:\` *${formatNumber(user.euro || 0)}*
│ • 『 🏦 』 \`In Banca:\` *${formatNumber(user.bank || 0)}*
│ • 『 💎 』 \`Totale:\` *${formatNumber(totalStars)}*
│
│ 『 📊 』 _*Statistiche:*_
│ • 『 ✨ 』 \`XP:\` *${formatNumber(user.exp || 0)}*
│ • 『 ❤️ 』 \`Salute:\` *${user.health || 100}/100*
│ • 『 ⚜️ 』 *\`Premium:\`* *${user.premium ? '✅' : '❌'}*
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`.trim();

        await conn.sendMessage(m.chat, {
            image: imageBuffer,
            caption: caption,
            mentions: [who]
        }, { quoted: m });
        
    } catch (error) {
        const formatNumber = (num) => {
            return num.toLocaleString('it-IT');
        };
        let totalStars = (user.euro || 0) + (user.bank || 0);

        let text = `
ㅤㅤ⋆｡˚『 ╭ \`INVENTARIO\` ╯ 』˚｡⋆\n╭\n│
│ 『 👤 』 \`Nome:\` *${name}*
│ 『 🍥 』 \`Utente:\` *@${who.split('@')[0]}*
│
│ 『 💰 』 _*Risorse Principali:*_
│ • 『 🌟 』 \`euro:\` *${formatNumber(user.euro || 0)}*
│ • 『 🏦 』 \`In Banca:\` *${formatNumber(user.bank || 0)}*
│ • 『 💎 』 \`Totale:\` *${formatNumber(totalStars)}*
│
│ 『 📊 』 _*Statistiche:*_
│ • 『 ✨ 』 \`XP:\` *${formatNumber(user.exp || 0)}*
│ • 『 ❤️ 』 \`Salute:\` *${user.health || 100}/100*
│ • 『 ⚜️ 』 *\`Premium:\`* *${user.premium ? '✅' : '❌'}*
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`;

        await conn.sendFile(m.chat, pfpUrl, 'profile.jpg', text, m, false, { mentions: [who] });
    }
};

handler.help = ['inventario [@user]'];
handler.tags = ['euro'];
handler.command = ['inventario', 'inv'];
handler.register = true;

export default handler;