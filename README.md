
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6349d8ff,50:7a7acd,100:7B68EE&height=120&section=header&text=&fontSize=0&animation=twinkling" width="100%"/>

<div align="center">

# ![Retro](https://readme-typing-svg.herokuapp.com?font=VT323&size=40&duration=2500&pause=1000&color=7a7acd&center=true&vCenter=true&width=700&height=70&lines=$+IL+MIGLIOR+BOT+DI+WHATSAPP+IN+ITALIA)

<img src="https://i.ibb.co/hJW7WwxV/varebot.jpg" alt="VareBot Preview" width="600" style="border-radius: 15px; margin: 50px 0;"/>

<p>
  <a href="https://github.com/realvare/varebot">
    <img src="https://img.shields.io/badge/VERSIONE-2.6.0-7a7acd?style=for-the-badge&logo=semantic-release&logoColor=white&labelColor=6349d8">
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Node.js-20.2.0-7a7acd?style=for-the-badge&logo=node.js&logoColor=white&labelColor=6349d8">
  </a>
  <a href="https://opensource.org/licenses/Apache-2.0">
    <img src="https://img.shields.io/badge/LICENZA-Apache%202.0-7a7acd?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=6349d8">
  </a>
</p>

</div>

---

## <div align="center">🔮 PANORAMICA PROGETTO</div>

<div align="center">

*🎭 Tutto ciò che cerchi racchiuso in un unico bot; potente, versatile e performante.*

<p align="center">
  <img src="https://github-readme-streak-stats.herokuapp.com/?user=realvare&theme=radical&hide_border=true&background=00000&stroke=7a7acd&ring=7a7acd&fire=7B68EE&currStreakLabel=ffffff&sideLabels=ffffff&dates=ffffff" height="150"/>
</p>

### ✨ *Funzionalità Principali*

<table align="center">
  <tr>
    <td align="center" width="50%">
      <div style="font-size: 30px;">🧠</div>
      <strong>Intelligenza Artificiale</strong><br/>
      <em>Gemini, GPT, claude, mistral e altri integrati</em>
    </td>
    <td align="center" width="50%">
      <div style="font-size: 30px;">🛡️</div>
      <strong>Sicurezza Gruppi</strong><br/>
      <em>Anti-Link, Anti-porno, Anti-gore, Auto-traduzione ecc..</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <div style="font-size: 30px;">📥</div>
      <strong>Media Download</strong><br/>
      <em>Scarica media da YouTube, TikTok, Insta e npm</em>
    </td>
    <td align="center">
      <div style="font-size: 30px;">🎮</div>
      <strong>Intrattenimento</strong><br/>
      <em>Passa il tuo tempo giocando a wordle, bandiere, quiz, tris e molto altro</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <div style="font-size: 30px;">🎨</div>
      <strong>Sticker Maker</strong><br/>
      <em>Immagin, Video e Gif to Sticker</em>
    </td>
    <td align="center">
      <div style="font-size: 30px;">⚡</div>
      <strong>Utilità e strumenti</strong><br/>
      <em>Audio e immagini to text, traduzione, crea mail, leggi Corano e Bibbia e moltissimo ancora</em>
    </td>
  </tr>
</table>

</div>

---

## <div align="center">🌐 COMMUNITY & SUPPORTO</div>

<div align="center">
Entra nella community per aggiornamenti, supporto e novità esclusive.

| **YouTube Channel** 🎬 | **Canale WhatsApp** 🟢 | **Supporta il Dev** 💖 |
|:---:|:---:|:---:|
| <a href="https://youtube.com/channel/UCEkY3BqEROZ-7BwVP6IuEmQ" target="_blank"><img src="https://img.shields.io/badge/ISCRIVITI-FF0000?style=for-the-badge&logo=youtube&logoColor=white" height="35"/></a> | <a href="https://whatsapp.com/channel/0029VbB41Sa1Hsq1JhsC1Z1z" target="_blank"><img src="https://img.shields.io/badge/ENTRA_ORA-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" height="35"/></a> | <a href="https://paypal.me/samakavare" target="_blank"><img src="https://img.shields.io/badge/DONA_ORA-0070BA?style=for-the-badge&logo=paypal&logoColor=white" height="35"/></a> |
| *Tutorial & Guide (soon)* | *News & Changelog* | *Finanzia il progetto* |

</div>

---

## <div align="center">📥 INSTALLAZIONE</div>

### 📱 *ANDROID (TERMUX)*

1.  Scarica **Termux** da F-Droid: [Clicca qui](https://f-droid.org/repo/com.termux_1022.apk)
2.  Apri Termux ed esegui questo **singolo comando**:

```bash
termux-setup-storage
apt update -y && yes | apt upgrade && pkg install -y bash wget mpv && wget -O - https://raw.githubusercontent.com/realvare/varebot/main/varebot.sh | bash

```

> 🪄 *Questo script installerà automaticamente tutte le dipendenze (Node, FFmpeg, ImageMagick), clonerà il bot e lo avvierà.*

<details>
<summary><b>🛠️ Clicca per vedere l'installazione manuale (Termux)</b></summary>




Se lo script automatico non funziona, usa questi comandi uno alla volta:

```bash
termux-setup-storage
pkg update && pkg upgrade -y
pkg install x11-repo tur-repo git nodejs ffmpeg imagemagick yarn -y
pkg install libcairo pango libjpeg-turbo giflib libpixman pkg-config freetype fontconfig -y
pkg install python libvips sqlite clang make chromium -y
pip install setuptools yt-dlp

cd ~
git clone https://github.com/realvare/varebot.git
cd varebot
yarn install
npm install canvas puppeteer-core --build-from-source
node .

```

</details>

### 💻 *WINDOWS / VPS / LINUX*

<details>
<summary><b>🪟 Istruzioni per Windows</b></summary>




1. Installa [Git](https://git-scm.com/downloads), [Node.js](https://nodejs.org/en/download) (LTS) e [FFmpeg](https://ffmpeg.org/download.html).
2. Apri il terminale (CMD o PowerShell):
```bash
git clone https://github.com/realvare/varebot.git
cd varebot
npm install
node .

```



</details>

<details>
<summary><b>🐧 Istruzioni per Linux (Ubuntu/Debian)</b></summary>




```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ffmpeg imagemagick build-essential
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
git clone https://github.com/realvare/varebot.git
cd varebot
npm install
node .

```

</details>

---

## <div align="center">⚙️ CONFIGURAZIONE APIs</div>

Per sbloccare il 100% del potenziale di **VareBot**, modifica il file `config.js` inserendo le tue chiavi API che puoi ottenere gratuitamente:

| API | Usata in | Dove Ottenerla |
|---------|----------|----------------|
| `spotifyclientid` & `spotifysecret` | gp-playlist, ricerca-spotify | [Spotify Developer](https://developer.spotify.com/dashboard) |
| `browserless` | bot-classifica, euro-banca, giochi-calcolatore, giochi-coppia, gp-benvenuto&addio, gp-cur, strumenti-meteo | [Browserless.io](https://browserless.io/) |
| `tmdb` | ricerca-film | [TMDB API](https://www.themoviedb.org/settings/api) |
| `ocrspace` | strumenti-trascrivi | [OCR.space](https://ocr.space/ocrapi) |
| `assemblyai` | bot-vocali, strumenti-trascrivi | [AssemblyAI](https://www.assemblyai.com/) |
| `google` | ia-gemini, ricerca-google, ricerca-immagine, strumenti-kcal, strumenti-meteo | [Google Cloud Console](https://console.cloud.google.com/) |
| `googleCX` | ricerca-google, ricerca-immagine, strumenti-kcal, strumenti-meteo | [Google CSE](https://cse.google.com/) |
| `genius` | strumenti-lyrics | [Genius API](https://genius.com/api-clients) |
| `removebg` | strumenti-removebg | [Remove.bg API](https://www.remove.bg/api) |
| `openrouter` | ia-claude, ia-mistral, ia-nova | [OpenRouter](https://openrouter.ai/) |
| `sightengine_user` & `sightengine_secret` | anti-gore, anti-porno, strumenti-isai | [Sightengine](https://sightengine.com/) |
| `lastfm` | gp-cur | [Last.fm API](https://www.last.fm/api) |

> ⚠️ *Se hai bisogno di aiuto con le chiavi o vuoi il bot "pronto all'uso", ↯ contatta il creatore su WhatsApp.*

---

## <div align="center">👨‍💻 CREATORE</div>

<div align="center">

<img src="https://github.com/realvare.png?size=200" alt="Sam Profile" style="width: 150px; height: 150px; border-radius: 50% margin-bottom: 15px;"/>

**SAM AKA VARE**

</div>

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6349d8ff,50:7a7acd,100:7B68EE&height=100&section=footer&text=&fontSize=0&animation=twinkling" width="100%"/>
</div>