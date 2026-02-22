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
    const totalWealth = user.euro + user.bank;
    const userRank = getRank(user.euro);
    const primaryPurple = '#6349d8';
    
    const formatCurrency = (num) => {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
    };

    const formatCardNumber = (num) => {
        const numStr = String(num).padStart(16, '0');
        return `**** **** **** ${numStr.slice(-4)}`;
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
                /* Sfumatura viola specifica */
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

        .balance-section {
            text-align: center;
            z-index: 2;
            margin-bottom: 40px;
        }

        .balance-label {
            font-size: 15px;
            /* Una tonalità più chiara del viola target per il testo */
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
            /* Ombra utilizzando il viola target */
            text-shadow: 0 0 35px rgba(99, 73, 216, 0.7);
        }

        .credit-card {
            width: 100%;
            height: 280px;
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
                inset 0 0 30px rgba(99, 73, 216, 0.1); /* Bagliore interno viola */
                
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            z-index: 5;
            overflow: hidden;
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

        .card-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 2;
        }

        /* MODIFICATO: Chip monocromatico scuro con bordo viola */
        .chip {
            width: 55px;
            height: 40px;
            background: linear-gradient(135deg, #4a4a4a 0%, #2c2c2c 50%, #5e5e5e 100%);
            border-radius: 8px;
            position: relative;
            border: 1px solid ${primaryPurple};
            box-shadow: inset 0 1px 3px rgba(255,255,255,0.2);
        }
        
        .card-bank-name {
            font-weight: 800;
            font-size: 22px;
            letter-spacing: 1px;
            color: white;
            opacity: 0.95;
            text-shadow: 0 2px 5px rgba(0,0,0,0.5);
        }

        .card-number {
            font-family: 'Orbitron', sans-serif;
            font-size: 32px;
            letter-spacing: 4px;
            color: #fff;
            text-shadow: 0 2px 10px rgba(0,0,0,0.8);
            z-index: 2;
            margin-top: 15px;
            text-align: center;
            width: 100%;
        }

        .card-bottom {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            z-index: 2;
        }

        .info-group h3 {
            font-size: 10px;
            color: rgba(255,255,255,0.6);
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 1.5px;
        }

        .info-group p {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: white;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            width: 100%;
            z-index: 2;
            margin-top: 30px;
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

        .avatar {
            width: 65px;
            height: 65px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.2);
            /* Ombra con il viola specifico */
            box-shadow: 0 0 20px rgba(99, 73, 216, 0.6);
            object-fit: cover;
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
                    React.createElement('div', { className: 'brand-pill' }, 'VareBot Obsidian'),
                    React.createElement('img', { src: pfpUrl, className: 'avatar' })
                ),
                React.createElement('div', { className: 'balance-section' },
                    React.createElement('div', { className: 'balance-label' }, 'Patrimonio Totale'),
                    React.createElement('div', { className: 'balance-amount' }, formatCurrency(totalWealth))
                ),
                React.createElement('div', { className: 'credit-card' },
                    React.createElement('div', { className: 'card-shine' }),
                    
                    React.createElement('div', { className: 'card-top' },
                        React.createElement('div', { className: 'chip' }),
                        React.createElement('div', { className: 'card-bank-name' }, 'VAREBOT')
                    ),

                    React.createElement('div', { className: 'card-number' }, 
                        formatCardNumber(user.bank)
                    ),

                    React.createElement('div', { className: 'card-bottom' },
                        React.createElement('div', { className: 'info-group' },
                            React.createElement('h3', null, 'Titolare'),
                            React.createElement('p', null, name)
                        ),
                        React.createElement('div', { className: 'info-group', style: { textAlign: 'right' } },
                            React.createElement('h3', null, 'Scadenza'),
                            React.createElement('p', null, '09/28')
                        )
                    )
                ),
                React.createElement('div', { className: 'stats-grid' },
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, userRank.emoji),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'Grado'),
                            React.createElement('p', null, userRank.name)
                        )
                    ),
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, '⭐'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'Livello'),
                            React.createElement('p', null, user.level)
                        )
                    ),

                    // Soldi in Banca
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, '🏛️'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'Saldo Banca'),
                            React.createElement('p', null, formatCurrency(user.bank))
                        )
                    ),

                    // Contanti
                    React.createElement('div', { className: 'stat-card' },
                        React.createElement('div', { className: 'stat-icon-box', style: iconStyle }, '💶'),
                        React.createElement('div', { className: 'stat-content' },
                            React.createElement('h4', null, 'Contanti'),
                            React.createElement('p', null, formatCurrency(user.euro))
                        )
                    )
                ),
                React.createElement('div', { className: 'footer' }, '🔒 VareBot Banking System')
            )
        )
    );
};

export const generateBankImage = async (userData) => {
    const browserlessKey = global.APIKeys.browserless || global.APIKeys.browserless_default;
    try {
        const reactElement = React.createElement(BankCard, userData);
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
        console.error('Errore generazione immagine banca:', error.message);
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
    let pfpUrl = './media/varebot-pfp.png';
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
│ 『 🪙 』 \`euro:\` *${user.bank.toLocaleString()}*
┃ 💶 *Contanti:* ${user.euro.toLocaleString()} €
│
│『 📊 』 _*Statistiche:*_
│ 『 🆙 』 \`Livello:\` *${user.level}*
│ 『 ⚜️ 』 \`Ruolo:\` *${user.role}*
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

『 💡 』 *Comandi Disponibili:*
> • ${usedPrefix}deposita all
> • ${usedPrefix}ritira all`.trim();

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
        let txt = ` ⋆｡˚『 ╭ \`BANCA VAREBOT\` ╯ 』˚｡⋆\n╭\n│
│ 『 👤 』 \`Nome:\` ${name}
│ 『 🍥 』 \`Utente:\` @${who.split('@')[0]}
│
│『 💰 』 _*Patrimonio:*_
│ 『 🪙 』 \`euro:\` *${user.bank.toLocaleString()}*
┃ 『 💶 』 *Contanti:* ${user.euro.toLocaleString()} €
│
│『 📊 』 _*Statistiche:*_
│ 『 🆙 』 \`Livello:\` *${user.level}*
│ 『 ⚜️ 』 \`Ruolo:\` *${user.role}*
│
*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

『 💡 』 *Comandi Disponibili:*
> • ${usedPrefix}deposita all
> • ${usedPrefix}ritira all`;
        await m.reply(txt, null, { mentions: [who] });
    }
};

handler.help = ['banca'];
handler.tags = ['euro'];
handler.command = /^(bank|banca|saldo)$/i;
handler.group = true;
handler.register = true;

export default handler;