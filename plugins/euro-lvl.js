import axios from 'axios';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { canLevelUp, xpRange } from '../lib/levelling.js';
import { roles, getRole } from './bot-ruoli.js';

const LevelCard = ({ user, name, pfpUrl, currentRole, nextRole, stats }) => {
    const primaryPurple = '#6349d8';
    
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

        .level-section {
            text-align: center;
            z-index: 2;
            margin-bottom: 30px;
        }

        .level-label {
            font-size: 15px;
            color: #a394f0; 
            text-transform: uppercase;
            letter-spacing: 3px;
            font-weight: 500;
            margin-bottom: 8px;
        }

        .level-number {
            font-family: 'Orbitron', sans-serif;
            font-size: 72px;
            font-weight: 700;
            color: white;
            text-shadow: 0 0 35px rgba(99, 73, 216, 0.7);
        }

        .role-card {
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

        .role-content {
            z-index: 2;
            position: relative;
            text-align: center;
        }

        .role-title {
            font-size: 14px;
            color: rgba(255,255,255,0.6);
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0 0 10px 0;
        }

        .role-name {
            font-size: 32px;
            font-weight: 700;
            color: white;
            margin: 0;
            letter-spacing: 1px;
            text-shadow: 0 0 20px rgba(99, 73, 216, 0.5);
        }

        .user-name {
            font-size: 24px;
            font-weight: 600;
            color: #a394f0;
            margin: 15px 0 0 0;
            letter-spacing: 0.5px;
        }

        .progress-section {
            width: 100%;
            z-index: 2;
            margin-bottom: 20px;
        }

        .progress-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .progress-label {
            font-size: 12px;
            color: rgba(255,255,255,0.6);
            text-transform: uppercase;
            letter-spacing: 1.5px;
        }

        .progress-value {
            font-size: 12px;
            color: white;
            font-weight: 600;
        }

        .progress-bar-container {
            width: 100%;
            height: 30px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 15px;
            overflow: hidden;
            position: relative;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #6349d8 0%, #9f7aea 50%, #d6bcfa 100%);
            border-radius: 15px;
            box-shadow: 0 0 20px rgba(99, 73, 216, 0.6);
            transition: width 0.3s ease;
        }

        .progress-percentage {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 14px;
            font-weight: 700;
            color: white;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
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
                    React.createElement('div', { className: 'brand-pill' }, 'VareBot Statistiche'),
                    React.createElement('img', { src: pfpUrl, className: 'avatar' })
                ),
                React.createElement('div', { className: 'level-section' },
                    React.createElement('div', { className: 'level-label' }, 'Livello'),
                    React.createElement('div', { className: 'level-number' }, user.level)
                ),
                React.createElement('div', { className: 'role-card' },
                    React.createElement('div', { className: 'card-shine' }),
                    React.createElement('div', { className: 'role-content' },
                        React.createElement('p', { className: 'role-title' }, 'Ruolo Attuale'),
                        React.createElement('h2', { className: 'role-name' }, currentRole),
                        React.createElement('p', { className: 'user-name' }, name)
                    )
                ),
                React.createElement('div', { className: 'progress-section' },
                    React.createElement('div', { className: 'progress-header' },
                        React.createElement('span', { className: 'progress-label' }, 'Esperienza'),
                        React.createElement('span', { className: 'progress-value' }, 
                            `${formatNumber(stats.currentXP)} / ${formatNumber(stats.totalXPforLevel)}`
                        )
                    ),
                    React.createElement('div', { className: 'progress-bar-container' },
                        React.createElement('div', { 
                            className: 'progress-bar',
                            style: { width: `${stats.percentage}%` }
                        }),
                        React.createElement('div', { className: 'progress-percentage' }, 
                            `${stats.percentage.toFixed(1)}%`
                        )
                    )
                ),
                React.createElement('div', { className: 'stats-grid' },
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, '✨'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'EXP Totale'),
                            React.createElement('p', null, formatNumber(user.exp))
                        )
                    ),
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, '🎯'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'Prossimo Ruolo'),
                            React.createElement('p', { style: { fontSize: '16px' } }, nextRole)
                        )
                    ),
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, '🔼'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'XP Mancante'),
                            React.createElement('p', null, formatNumber(stats.neededXP))
                        )
                    ),
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, '📊'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'Progresso'),
                            React.createElement('p', null, `${stats.percentage.toFixed(0)}%`)
                        )
                    )
                ),
                React.createElement('div', { className: 'footer' }, '📈 VareBot Level System')
            )
        )
    );
};

export const generateLevelImage = async (userData) => {
    const browserlessKey = global.APIKeys.browserless || global.APIKeys.browserless_default;
    try {
        const reactElement = React.createElement(LevelCard, userData);
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
        console.error('Errore generazione immagine livello:', error.message);
        throw new Error('Fallback testo');
    }
};

let handler = async (m, { conn }) => {
    try {
        let profilePic;
        try {
            profilePic = await conn.profilePictureUrl(m.sender, 'image');
        } catch {
            profilePic = 'https://i.ibb.co/YrWKV59/varebot-pfp.png';
        }

        let name = await conn.getName(m.sender);
        let user = global.db.data.users[m.sender];
        if (!user) return;
        
        user.level = Number(user.level);
        if (!Number.isFinite(user.level) || user.level < 0) user.level = 0;
        user.exp = Number(user.exp);
        if (!Number.isFinite(user.exp) || user.exp < 0) user.exp = 0;
        
        let { min, xp, max } = xpRange(user.level, global.multiplier);
        let currentRole = getRole(user.level);
        let nextRole = Object.entries(roles)
            .sort((a, b) => a[1] - b[1])
            .find(([, minLevel]) => user.level < minLevel)?.[0] || currentRole;

        let totalXPforLevel = Math.max(1, max - min);
        let currentXP = Math.max(0, user.exp - min);
        let neededXP = Math.max(0, max - user.exp);
        let percentage = Math.min((currentXP / totalXPforLevel) * 100, 100);

        const stats = {
            totalXPforLevel,
            currentXP,
            neededXP,
            percentage
        };

        try {
            await m.react('📈');
            
            const imageBuffer = await generateLevelImage({
                user,
                name,
                pfpUrl: profilePic,
                currentRole,
                nextRole,
                stats
            });

            if (!canLevelUp(user.level, user.exp, global.multiplier)) {
                const caption = `
ㅤㅤ⋆｡˚『 ╭ \`STATISTICHE\` ╯ 』˚｡⋆\n╭
│ 『 👤 』 \`Nome:\` *${name}*
│ 『 🎯 』 \`Ruolo:\` *${currentRole}*
│ 『 📈 』 \`Livello:\` *${user.level}*
│
│ 『 ✨ 』 _*Esperienza:*_
│ • \`EXP:\` *${formatNumber(currentXP)}/${formatNumber(totalXPforLevel)}*
│ • \`Progresso:\` *${percentage.toFixed(1)}%*
│
│ 『 🔼 』 _*Prossimo livello:*_
│ • \`Ruolo:\` *${nextRole}*
│ • \`Mancano:\` *${formatNumber(neededXP)} XP*
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`;

                await conn.sendMessage(m.chat, {
                    image: imageBuffer,
                    caption: caption
                }, { quoted: m });

                return;
            }

            let before = user.level;
            while (canLevelUp(user.level, user.exp, global.multiplier)) {
                user.level++;
            }

            if (before !== user.level) {
                let levelGain = user.level - before;
                
                currentRole = Object.entries(roles)
                    .sort((a, b) => b[1] - a[1])
                    .find(([, minLevel]) => user.level >= minLevel)?.[0] || Object.keys(roles)[0];
                const newImageBuffer = await generateLevelImage({
                    user,
                    name,
                    pfpUrl: profilePic,
                    currentRole,
                    nextRole,
                    stats
                });

                const caption = `
ㅤㅤ⋆｡˚『 ╭ \`LIVELLO\` ╯ 』˚｡⋆\n╭
│
│ 『 📈 』 _*Progresso:*_
│ • \`Da:\` Lvl *${before}*
│ • \`A:\` Lvl *${user.level}*
│ • \`Livelli saliti:\` *+${levelGain}*
│
│ 『 🎯 』 _*Nuovo Ruolo:*_
│ ${currentRole}
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`;

                await conn.sendMessage(m.chat, {
                    image: newImageBuffer,
                    caption: caption
                }, { quoted: m });
            }

        } catch (error) {
            if (!canLevelUp(user.level, user.exp, global.multiplier)) {
                const caption = `
ㅤㅤ⋆｡˚『 ╭ \`STATISTICHE\` ╯ 』˚｡⋆\n╭
│ 『 👤 』 \`Nome:\` *${name}*
│ 『 🎯 』 \`Ruolo:\` *${currentRole}*
│ 『 📈 』 \`Livello:\` *${user.level}*
│
│ 『 ✨ 』 _*Esperienza:*_
│ • \`EXP:\` *${formatNumber(currentXP)}/${formatNumber(totalXPforLevel)}*
│ • \`Progresso:\` *${percentage.toFixed(1)}%*
│
│ 『 🔼 』 _*Prossimo livello:*_
│ • \`Ruolo:\` *${nextRole}*
│ • \`Mancano:\` *${formatNumber(neededXP)} XP*
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`;

                await conn.sendFile(m.chat, profilePic, 'profile.jpg', caption, m);
                return;
            }

            let before = user.level;
            while (canLevelUp(user.level, user.exp, global.multiplier)) {
                user.level++;
            }

            if (before !== user.level) {
                let levelGain = user.level - before;
                
                currentRole = Object.entries(roles)
                    .sort((a, b) => b[1] - a[1])
                    .find(([, minLevel]) => user.level >= minLevel)?.[0] || Object.keys(roles)[0];

                const caption = `
ㅤㅤ⋆｡˚『 ╭ \`LIVELLO\` ╯ 』˚｡⋆\n╭
│
│ 『 📈 』 _*Progresso:*_
│ • \`Da:\` Lvl *${before}*
│ • \`A:\` Lvl *${user.level}*
│ • \`Livelli saliti:\` *+${levelGain}*
│
│ 『 🎯 』 _*Nuovo Ruolo:*_
│ ${currentRole}
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`;

                await conn.sendFile(m.chat, profilePic, 'profile.jpg', caption, m);
            }
        }

    } catch (e) {
        console.error('Errore comando lvl:', e);
        await conn.reply(m.chat, '⚠️ Errore durante il caricamento delle statistiche', m);
    }
};

function formatNumber(num) {
    num = Number(num);
    if (!Number.isFinite(num)) num = 0;
    return num.toLocaleString('it-IT');
}

handler.help = ['livello'];
handler.tags = ['euro'];
handler.command = ['livello', 'lvl', 'levelup'];
handler.register = true;

export default handler;