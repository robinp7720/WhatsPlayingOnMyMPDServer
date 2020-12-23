import {createCanvas, loadImage} from 'canvas';
import restify from 'restify';
import jsmediatags from 'jsmediatags'

// @ts-ignore
import mpd from 'mpd';

const mpdServerHost = process.env.MPD_HOST || 'localhost';
const mpdServerPort = process.env.MPD_PORT || 6600;
const mediaPath = '/mnt/robin/Music'

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

const server = restify.createServer();

server.get('/',  async (req, res, next) => {
    const canvas = createCanvas(700, 200);
    const ctx = canvas.getContext('2d');

    const currentSong = await getCurrentSong();
    const imageData = await getCoverImage(mediaPath + '/' + currentSong.file);
    const image = await loadImage(imageData);

    ctx.drawImage(image, 10, 10, 180, 180);

    ctx.font = '20px Roboto'
    ctx.fillText('Whats playing on my MPD server?', 200, 30)

    ctx.font = '40px Roboto'
    ctx.fillText(currentSong.Title, 200, 80)
    ctx.font = '20px Roboto'
    ctx.fillText('By ' + currentSong.Artist, 200, 110)

    canvas.createPNGStream().pipe(res);
})

server.listen(8080);
