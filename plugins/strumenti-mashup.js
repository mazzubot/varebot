import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import ytSearch from 'yt-search'
import ffmpeg from 'fluent-ffmpeg'

const execPromise = promisify(exec)
const tmpDir = path.join(process.cwd(), 'temp')

if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir)
}

const A = [ 'bestaudio[ext=m4a]/bestaudio', '251', '140', 'bestaudio', 'best[height<=480]' ]

const KEYWORDS = {
    vocals: ['vocals', 'acapella', 'a cappella', 'isolated vocals', 'voice only', 'singing only', 'vocal track', 'clean vocals', 'studio acapella', 'vocal stem', 'vocals only'],
    instrumental: ['instrumental', 'karaoke', 'backing track', 'minus one', 'no vocals', 'beat only', 'inst', 'official instrumental', 'beat', 'backing', 'prod by']
}

async function getAudioInfo(filePath) {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return resolve({ bpm: 120, duration: 180 });
            const duration = metadata.format.duration || 180;
            const args = [
                '-ss', '30', '-t', '60', 
                '-i', filePath, 
                '-af', 'bpm', 
                '-f', 'null', '-'
            ];
            const child = spawn('ffmpeg', args);
            let output = '';
            child.stderr.on('data', (d) => { output += d.toString(); });
            child.on('close', () => {
                const matches = output.match(/BPM:\s+(\d+\.\d+)/g);
                let bpm = 120;
                if (matches && matches.length > 0) {
                    const values = matches.map(m => parseFloat(m.split(':')[1].trim()));
                    bpm = values.reduce((a, b) => a + b, 0) / values.length;
                }
                resolve({ bpm, duration });
            });
        });
    });
}

async function runYtDlp(args) {
    const ytdlpCommands = [
        'yt-dlp', 'yt-dlp.exe', 'python -m yt_dlp',
        path.join(process.cwd(), 'yt-dlp.exe'),
        path.join(process.cwd(), 'node_modules', '.bin', 'yt-dlp')
    ];
    for (const cmd of ytdlpCommands) {
        try {
            await execPromise(`${cmd} ${args.join(' ')}`, { maxBuffer: 50 * 1024 * 1024, shell: true });
            return true;
        } catch (e) { continue; }
    }
    throw new Error('YT_DLP_NOT_FOUND');
}

async function downloadTrack(url, outputPath) {
    for (const format of A) {
        try {
            const args = [
                `"${url}"`, '-f', format, '-o', `"${outputPath}"`,
                '--no-warnings', '--no-playlist', '--prefer-free-formats',
                '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0',
                '--user-agent', '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"',
            ];
            await runYtDlp(args);
            
            const files = fs.readdirSync(tmpDir);
            const baseName = path.basename(outputPath, path.extname(outputPath));
            const found = files.find(f => f.startsWith(baseName) && f.endsWith('.mp3'));
            if (found) {
                const finalPath = path.join(tmpDir, found);
                if (finalPath !== outputPath) fs.renameSync(finalPath, outputPath);
                return true;
            }
        } catch (e) { continue; }
    }
    return false;
}

function getTempoFilter(targetBPM, sourceBPM) {
    let ratio = targetBPM / sourceBPM;
    if (Math.abs(ratio - 1) > 0.5) return 'anull'; 
    let filters = [];
    while (ratio > 2) {
        filters.push('atempo=2.0');
        ratio /= 2;
    }
    while (ratio < 0.5) {
        filters.push('atempo=0.5');
        ratio *= 2;
    }
    filters.push(`atempo=${ratio.toFixed(4)}`);
    return filters.join(',');
}

async function approximateVocals(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .complexFilter('highpass=f=200,volume=1.2')
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
    });
}

async function approximateInstrumental(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .complexFilter('pan=stereo|c0=c0-c1|c1=c1-c0,volume=2,lowpass=f=5000')
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
    });
}

async function createMashup(vocalsPath, instPath, outputPath, isApproxVocals = false, isApproxInst = false) {
    const vInfo = await getAudioInfo(vocalsPath);
    const iInfo = await getAudioInfo(instPath);
    
    const tempoFilter = getTempoFilter(iInfo.bpm, vInfo.bpm);
    const filterChain = tempoFilter !== 'anull' ? `${tempoFilter},` : '';

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(vocalsPath)
            .input(instPath)
            .complexFilter([
                `[0:a]${filterChain}aresample=44100,highpass=f=100,compand=attacks=0:points=-80/-80|-15/-15|0/-6:gain=2,aecho=0.8:0.88:60:0.4,volume=1.4[vocals]`,
                `[1:a]aresample=44100,equalizer=f=1000:width_type=o:width=2:g=-3,volume=0.85[base]`,
                `[vocals][base]amix=inputs=2:duration=first:dropout_transition=2,compand=attacks=0.1:decays=0.8:points=-80/-80|-20/-20|0/-3:gain=1,loudnorm=I=-14:TP=-1.0:LRA=11[out]`
            ])
            .map('[out]')
            .audioBitrate('192k')
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
    });
}

async function createTransition(song1Path, song2Path, outputPath) {
    const s1 = await getAudioInfo(song1Path);
    const s2 = await getAudioInfo(song2Path);
    
    const tempoFilter = getTempoFilter(s1.bpm, s2.bpm);
    const useTempo = tempoFilter !== 'anull';
    const tempoChain = useTempo ? `${tempoFilter}` : '';
    const adjBpm2 = useTempo ? s1.bpm : s2.bpm;
    const avgBpm = (s1.bpm + adjBpm2) / 2;
    const beatDuration = 60 / avgBpm;
    const overlapBeats = 32;
    let d = overlapBeats * beatDuration;
    d = Math.min(30, Math.max(5, d.toFixed(2)));

    console.log(`Transition Mix: Full Song1 to Full Song2 with ${d}s beat-aligned crossfade`);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(song1Path)
            .input(song2Path)
            .complexFilter([
                `[0:a]aresample=44100[s1]`,
                `[1:a]aresample=44100,${tempoChain}[s2]`,
                `[s1][s2]acrossfade=d=${d}:c1=qsin:c2=qsin,loudnorm=I=-14:TP=-1.0:LRA=11[out]`
            ])
            .map('[out]')
            .audioBitrate('192k')
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
    });
}

async function findVideo(originalQuery, type) {
    let query = originalQuery;
    if (type !== 'full') {
        const fullVideo = await findVideo(originalQuery, 'full');
        if (fullVideo) {
            query = fullVideo.title.replace(/\[.*?\]|\(.*?\)|official music video|lyrics|audio/i, '').trim();
        }
    }
    const suffix = type === 'vocals' ? 'acapella vocals studio isolated a cappella vocals only' : type === 'instrumental' ? 'instrumental official karaoke beat backing track' : 'official audio lyrics music video';
    const res = await ytSearch(`${query} ${suffix}`);
    if (!res || !res.videos.length) return null;
    const keywords = KEYWORDS[type] || [];
    let candidates = res.videos.filter(v => keywords.some(k => v.title.toLowerCase().includes(k.toLowerCase())));
    if (!candidates.length) candidates = res.videos;
    candidates.sort((a, b) => b.views - a.views);
    return candidates[0];
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(`『 ⚠️ 』- \`Uso:\`\n${usedPrefix}mashup *song1* + *song2*\n${usedPrefix}transition *song1* + *song2*`);

    const [q1, q2] = text.split('+').map(v => v.trim());
    if (!q1 || !q2) return m.reply('❌ Inserisci due titoli separati da `+`');

    await conn.sendMessage(m.chat, { react: { text: '🎛️', key: m.key } });
    
    const time = Date.now();
    const isTransition = command === 'transition';
    const files = [];

    try {
        if (isTransition) {
            m.reply(`『 🎚️ 』 *Mixing Transition...*\n> Analisi Struttura, BPM e Smart-Cut in corso...`);
            
            const p1 = path.join(tmpDir, `tr1_${time}.mp3`);
            const p2 = path.join(tmpDir, `tr2_${time}.mp3`);
            const out = path.join(tmpDir, `trans_${time}.mp3`);
            files.push(p1, p2, out);

            const v1 = await findVideo(q1, 'full');
            const v2 = await findVideo(q2, 'full');
            
            if (!v1 || !v2) throw new Error("Tracce complete non trovate");

            await Promise.all([
                downloadTrack(v1.url, p1),
                downloadTrack(v2.url, p2)
            ]);

            if (!fs.existsSync(p1) || !fs.existsSync(p2)) throw new Error("Download fallito");

            await createTransition(p1, p2, out);

            await conn.sendMessage(m.chat, {
                audio: fs.readFileSync(out),
                mimetype: 'audio/mpeg',
                fileName: `Mix_${q1}_to_${q2}.mp3`,
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: `Smart Mix: ${q1} ➟ ${q2}`,
                        body: 'vare ✧ bot dj mode',
                        thumbnailUrl: v1.thumbnail,
                        mediaType: 1, renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

        } else {
            m.reply(`『 🥁 』 *Studio Quality Mashup...*\n> Sync BPM, Reverb & Mastering in corso...`);

            const pFull1 = path.join(tmpDir, `full1_${time}.mp3`);
            const pFull2 = path.join(tmpDir, `full2_${time}.mp3`);
            const pV1 = path.join(tmpDir, `v1_${time}.mp3`);
            const pI1 = path.join(tmpDir, `i1_${time}.mp3`);
            const pV2 = path.join(tmpDir, `v2_${time}.mp3`);
            const pI2 = path.join(tmpDir, `i2_${time}.mp3`);
            const approxV1 = path.join(tmpDir, `approx_v1_${time}.mp3`);
            const approxI1 = path.join(tmpDir, `approx_i1_${time}.mp3`);
            const approxV2 = path.join(tmpDir, `approx_v2_${time}.mp3`);
            const approxI2 = path.join(tmpDir, `approx_i2_${time}.mp3`);
            const mix1 = path.join(tmpDir, `mix1_${time}.mp3`);
            const mix2 = path.join(tmpDir, `mix2_${time}.mp3`);
            files.push(pFull1, pFull2, pV1, pI1, pV2, pI2, approxV1, approxI1, approxV2, approxI2, mix1, mix2);

            const [full1, full2] = await Promise.all([
                findVideo(q1, 'full'),
                findVideo(q2, 'full')
            ]);

            let warnings = [];

            let rV1 = await findVideo(q1, 'vocals');
            let isApproxV1 = false;
            if (!rV1) {
                warnings.push(`Vocals non trovate per "${q1}", usando approssimazione dal track completo.`);
                if (!full1) throw new Error(`Track completo non trovato per "${q1}"`);
                await downloadTrack(full1.url, pFull1);
                await approximateVocals(pFull1, approxV1);
                rV1 = full1;
            }

            let rI1 = await findVideo(q1, 'instrumental');
            let isApproxI1 = false;
            if (!rI1) {
                warnings.push(`Instrumental non trovato per "${q1}", usando approssimazione dal track completo.`);
                if (!full1) throw new Error(`Track completo non trovato per "${q1}"`);
                if (!fs.existsSync(pFull1)) await downloadTrack(full1.url, pFull1);
                await approximateInstrumental(pFull1, approxI1);
                rI1 = full1;
            }

            let rV2 = await findVideo(q2, 'vocals');
            let isApproxV2 = false;
            if (!rV2) {
                warnings.push(`Vocals non trovate per "${q2}", usando approssimazione dal track completo.`);
                if (!full2) throw new Error(`Track completo non trovato per "${q2}"`);
                await downloadTrack(full2.url, pFull2);
                await approximateVocals(pFull2, approxV2);
                rV2 = full2;
            }

            let rI2 = await findVideo(q2, 'instrumental');
            let isApproxI2 = false;
            if (!rI2) {
                warnings.push(`Instrumental non trovato per "${q2}", usando approssimazione dal track completo.`);
                if (!full2) throw new Error(`Track completo non trovato per "${q2}"`);
                if (!fs.existsSync(pFull2)) await downloadTrack(full2.url, pFull2);
                await approximateInstrumental(pFull2, approxI2);
                rI2 = full2;
            }

            if (warnings.length > 0) {
                m.reply(`『 ⚠️ 』 Avvisi:\n${warnings.join('\n')}`);
            }
            const actualPV1 = isApproxV1 ? approxV1 : pV1;
            const actualPI1 = isApproxI1 ? approxI1 : pI1;
            const actualPV2 = isApproxV2 ? approxV2 : pV2;
            const actualPI2 = isApproxI2 ? approxI2 : pI2;

            await Promise.all([
                downloadTrack(rV1.url, actualPV1),
                downloadTrack(rI1.url, actualPI1),
                downloadTrack(rV2.url, actualPV2),
                downloadTrack(rI2.url, actualPI2)
            ]);

            await Promise.all([
                createMashup(actualPV2, actualPI1, mix1, isApproxV2, isApproxI1),
                createMashup(actualPV1, actualPI2, mix2, isApproxV1, isApproxI2)
            ]);

            if (fs.existsSync(mix1)) {
                await conn.sendMessage(m.chat, {
                    audio: fs.readFileSync(mix1),
                    mimetype: 'audio/mpeg',
                    fileName: `Mashup_${q2}_Vocals_+_${q1}_Base.mp3`,
                    contextInfo: {
                        externalAdReply: {
                            title: `${q2} (Vocals) + ${q1} (Base)${isApproxV2 || isApproxI1 ? ' (Approx)' : ''}`,
                            body: 'Vare Bot Studio Mix',
                            thumbnailUrl: rV2.thumbnail,
                            mediaType: 1, renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m });
            }

            if (fs.existsSync(mix2)) {
                await conn.sendMessage(m.chat, {
                    audio: fs.readFileSync(mix2),
                    mimetype: 'audio/mpeg',
                    fileName: `Mashup_${q1}_Vocals_+_${q2}_Base.mp3`,
                    contextInfo: {
                        externalAdReply: {
                            title: `${q1} (Vocals) + ${q2} (Base)${isApproxV1 || isApproxI2 ? ' (Approx)' : ''}`,
                            body: 'Vare Bot Studio Mix',
                            thumbnailUrl: rV1.thumbnail,
                            mediaType: 1, renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m });
            }

            if (!fs.existsSync(mix1) && !fs.existsSync(mix2)) {
                throw new Error("Nessun mashup creato a causa di tracce mancanti");
            }
        }
        
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error(e);
        m.reply(`❌ Errore: ${e.message}`);
    } finally {
        files.forEach(f => { if(fs.existsSync(f)) fs.unlinkSync(f); });
    }
}

handler.help = ['mashup', 'transition']
handler.tags = ['audio']
handler.command = /^(songmix|mashup|mixsong|transition)$/i

export default handler