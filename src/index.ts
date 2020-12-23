import {CanvasRenderingContext2D, createCanvas, loadImage} from 'canvas';
import restify from 'restify';
import jsmediatags from 'jsmediatags'

// @ts-ignore
import mpd from 'mpd';

const mpdServerHost = process.env.MPD_HOST || 'localhost';
const mpdServerPort = process.env.MPD_PORT || 6600;
const mediaPath = process.env.MPD_PATH || '/mnt/robin/Music'

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
            }
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

const server = restify.createServer();

server.get('/',  async (req, res, next) => {
    const canvas = createCanvas(900, 200);
    const ctx = canvas.getContext('2d')

    const currentSong = await getCurrentSong();
    const currentStatus = await getCurrentStatus();

    const progress = currentStatus.elapsed/currentStatus.duration;

    const imageData = await getCoverImage(mediaPath + '/' + currentSong.file);
    const image = await loadImage(imageData);

    ctx.fillStyle = '#FFFFFF';
    drawRoundRect(ctx, 10, 10, 880, 180, 10);
    ctx.fill();
    ctx.clip();



    ctx.drawImage(image, 10, 10, 180, 180);

    ctx.fillStyle = '#585858';
    ctx.font = '20px Roboto'
    ctx.fillText('Whats playing on my MPD server?', 200, 40)

    ctx.fillStyle = '#222222';
    ctx.font = '40px Roboto'
    ctx.fillText(currentSong.Title, 200, 90)
    ctx.font = '20px Roboto'
    ctx.fillText('By ' + currentSong.Artist, 200, 120)

    // Draw progress bar
    ctx.beginPath();
    ctx.moveTo(200,160);
    ctx.lineTo(200 + (progress * 680), 160);
    ctx.closePath();
    ctx.lineWidth = 5;
    ctx.stroke();

    res.header('content-type', 'image/png');
    res.header('Cache-Control', 'max-age=30')
    canvas.createPNGStream().pipe(res);
})

server.listen(8080);
