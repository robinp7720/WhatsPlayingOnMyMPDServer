import {CanvasRenderingContext2D, createCanvas, loadImage} from 'canvas';
import restify from 'restify';
import jsmediatags from 'jsmediatags'

import {promises as fs} from 'fs';

// @ts-ignore
import mpd from 'mpd';

const mpdServerHost = process.env.MPD_HOST || 'localhost';
const mpdServerPort = process.env.MPD_PORT || 6600;
const mediaPath = process.env.MPD_PATH || '/mnt/robin/Music'

const imageWidth = 900;
const imageHeight = 200

const cmd = mpd.cmd

const client = mpd.connect({
    port: mpdServerPort,
    host: mpdServerHost,
});

interface song {
    file: string;
    Album: string;
    AlbumArtist: string;
    AlbumArtistSort: string;
    Artist: string;
    Date: string;
    Disc: string;
    Genre: string;
    Label: string;
    MUSICBRAINZ_ALBUMARTISTID: string;
    MUSICBRAINZ_ALBUMID: string;
    MUSICBRAINZ_ARTISTID: string;
    MUSICBRAINZ_TRACKID: string;
    OriginalDate: string;
    Title: string;
    Track: string;
    Time: string;
    duration: string;
    Pos: string;
    Id: string;
}

interface status {
    volume: string;
    repeat: string;
    random: string;
    single: string;
    consume: string;
    playlist: string;
    playlistlength: string;
    mixrampdb: string;
    state: string;
    xfade: string;
    song: string;
    songid: string;
    time: string;
    elapsed: number;
    bitrate: string;
    duration: number;
    audio: string;
    nextsong: string;
    nextsongid: string;
}

const getCurrentSong: () => Promise<song> = () => {
    return new Promise((resolve, reject) => {
        client.sendCommand(cmd("currentsong", []), function(err: string, msg: string) {
            if (err) reject(new Error(err));
            let preParse = msg.split('\n').map(item => item.split(': '));
            let parsed = {};

            // @ts-ignore
            preParse.forEach(item => parsed[item[0]] = item[1])

            // @ts-ignore
            resolve(parsed);
        });
    })
}

const getCurrentStatus: () => Promise<status> = () => {
    return new Promise((resolve, reject) => {
        client.sendCommand(cmd("status", []), function(err: string, msg: string) {
            if (err) reject(new Error(err));
            let preParse = msg.split('\n').map(item => item.split(': '));
            // @ts-ignore
            let parsed:status = {};

            // @ts-ignore
            preParse.forEach(item => parsed[item[0]] = item[1])

            // @ts-ignore
            parsed.elapsed = parseFloat(parsed.elapsed);
            // @ts-ignore
            parsed.duration = parseFloat(parsed.duration);


            // @ts-ignore
            resolve(parsed);
        });
    })
}

const getCoverImage: (path: string) => Promise<Buffer> = (path) => {
    return new Promise((resolve, reject) => {
        jsmediatags.read(path, {
            onSuccess: data => {
                if (!data.tags.picture) return reject(new Error());
                if (!data.tags.picture.data) return reject(new Error());

                resolve(Buffer.from(data.tags.picture.data));
            },
            onError: error => reject(error)
        })
    });
}

const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
}

const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const seconds = Math.floor(time - (mins * 60)).toString().padStart(2,'0');

    return `${mins}:${seconds}`;
}

const server = restify.createServer();

server.get('/',  async (req, res, next) => {
    const canvas = createCanvas(imageWidth, imageHeight);
    const ctx = canvas.getContext('2d')

    const currentSong = await getCurrentSong();
    const currentStatus = await getCurrentStatus();

    console.log(currentSong);

    const progress = currentStatus.elapsed/currentStatus.duration;


    ctx.fillStyle = '#FFFFFF';
    drawRoundRect(ctx, 0, 0, imageWidth, imageHeight, 10);
    ctx.fill();
    ctx.clip();


    try {
        const imageData = await getCoverImage(mediaPath + '/' + currentSong.file);
        const image = await loadImage(imageData);
        ctx.drawImage(image, 0, 0, imageHeight, imageHeight);
    } catch (e) {
        ctx.beginPath();
        ctx.rect(0, 0, imageHeight, imageHeight);
        ctx.closePath();
        ctx.fillStyle = '#000000';
        ctx.fill();
    }

    ctx.fillStyle = '#585858';
    ctx.font = '20px Roboto'
    ctx.fillText('Whats playing on my MPD server?', imageHeight + 10, 30)

    ctx.fillStyle = '#222222';
    ctx.font = '40px Roboto'
    ctx.fillText(currentSong.Title || 'Unknown title', imageHeight + 10, 80)
    ctx.font = '20px Roboto'
    ctx.fillText('By ' + (currentSong.Artist || 'Unknown artist'), imageHeight + 10, 110)

    ctx.fillStyle = '#585858';
    ctx.font = '14px Roboto'
    ctx.fillText(formatTime(currentStatus.elapsed) + '/' + formatTime(currentStatus.duration), imageHeight + 10, imageHeight - 27)

    // Draw progress bar
    ctx.beginPath();
    ctx.moveTo(imageHeight + 10, imageHeight - 20);
    ctx.lineTo(imageHeight + 10 + (progress * (imageWidth - (imageHeight + 20))), imageHeight - 20);
    ctx.closePath();
    ctx.lineWidth = 5;
    ctx.stroke();

    res.header('content-type', 'image/png');
    res.header('Cache-Control', 'max-age=30');
    canvas.createPNGStream().pipe(res);
})

server.get('/svg', async (req, res, next) => {
    const currentSong = await getCurrentSong();
    const currentStatus = await getCurrentStatus();

    const imageData = await getCoverImage(mediaPath + '/' + currentSong.file);
    const base64Image = imageData.toString('base64');

    res.header('content-type', 'image/svg+xml; charset=utf-8');
    res.header('Cache-Control', 'max-age=30');
    
    const template = await fs.readFile(__dirname + '/../src/svg-templates/default.svg', 'utf-8');

    let compiled = template
        .replace(new RegExp('%ARTIST%', 'g'), currentSong.Artist)
        .replace(new RegExp('%TITLE%', 'g'), currentSong.Title)
        .replace(new RegExp('%IMAGE%', 'g'), 'data:image/png;base64,' + base64Image);

    res.sendRaw(compiled);
});

server.listen(8080);
