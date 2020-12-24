"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var canvas_1 = require("canvas");
var restify_1 = require("restify");
var jsmediatags_1 = require("jsmediatags");
var fs_1 = require("fs");
// @ts-ignore
var mpd_1 = require("mpd");
var mpdServerHost = process.env.MPD_HOST || 'localhost';
var mpdServerPort = process.env.MPD_PORT || 6600;
var mediaPath = process.env.MPD_PATH || '/mnt/robin/Music';
var imageWidth = 900;
var imageHeight = 200;
var cmd = mpd_1["default"].cmd;
var client = mpd_1["default"].connect({
    port: mpdServerPort,
    host: mpdServerHost
});
var getCurrentSong = function () {
    return new Promise(function (resolve, reject) {
        client.sendCommand(cmd("currentsong", []), function (err, msg) {
            if (err)
                reject(new Error(err));
            var preParse = msg.split('\n').map(function (item) { return item.split(': '); });
            var parsed = {};
            // @ts-ignore
            preParse.forEach(function (item) { return parsed[item[0]] = item[1]; });
            // @ts-ignore
            resolve(parsed);
        });
    });
};
var getCurrentStatus = function () {
    return new Promise(function (resolve, reject) {
        client.sendCommand(cmd("status", []), function (err, msg) {
            if (err)
                reject(new Error(err));
            var preParse = msg.split('\n').map(function (item) { return item.split(': '); });
            // @ts-ignore
            var parsed = {};
            // @ts-ignore
            preParse.forEach(function (item) { return parsed[item[0]] = item[1]; });
            // @ts-ignore
            parsed.elapsed = parseFloat(parsed.elapsed);
            // @ts-ignore
            parsed.duration = parseFloat(parsed.duration);
            // @ts-ignore
            resolve(parsed);
        });
    });
};
var getCoverImage = function (path) {
    return new Promise(function (resolve, reject) {
        jsmediatags_1["default"].read(path, {
            onSuccess: function (data) {
                if (!data.tags.picture)
                    return reject(new Error());
                if (!data.tags.picture.data)
                    return reject(new Error());
                resolve(Buffer.from(data.tags.picture.data));
            },
            onError: function (error) { return reject(error); }
        });
    });
};
var drawRoundRect = function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};
var formatTime = function (time) {
    var mins = Math.floor(time / 60);
    var seconds = Math.floor(time - (mins * 60));
    return mins + ":" + seconds;
};
var server = restify_1["default"].createServer();
server.get('/', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var canvas, ctx, currentSong, currentStatus, progress, imageData, image, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                canvas = canvas_1.createCanvas(imageWidth, imageHeight);
                ctx = canvas.getContext('2d');
                return [4 /*yield*/, getCurrentSong()];
            case 1:
                currentSong = _a.sent();
                return [4 /*yield*/, getCurrentStatus()];
            case 2:
                currentStatus = _a.sent();
                console.log(currentSong);
                progress = currentStatus.elapsed / currentStatus.duration;
                ctx.fillStyle = '#FFFFFF';
                drawRoundRect(ctx, 0, 0, imageWidth, imageHeight, 10);
                ctx.fill();
                ctx.clip();
                _a.label = 3;
            case 3:
                _a.trys.push([3, 6, , 7]);
                return [4 /*yield*/, getCoverImage(mediaPath + '/' + currentSong.file)];
            case 4:
                imageData = _a.sent();
                return [4 /*yield*/, canvas_1.loadImage(imageData)];
            case 5:
                image = _a.sent();
                ctx.drawImage(image, 0, 0, imageHeight, imageHeight);
                return [3 /*break*/, 7];
            case 6:
                e_1 = _a.sent();
                ctx.beginPath();
                ctx.rect(0, 0, imageHeight, imageHeight);
                ctx.closePath();
                ctx.fillStyle = '#000000';
                ctx.fill();
                return [3 /*break*/, 7];
            case 7:
                ctx.fillStyle = '#585858';
                ctx.font = '20px Roboto';
                ctx.fillText('Whats playing on my MPD server?', imageHeight + 10, 30);
                ctx.fillStyle = '#222222';
                ctx.font = '40px Roboto';
                ctx.fillText(currentSong.Title || 'Unknown title', imageHeight + 10, 80);
                ctx.font = '20px Roboto';
                ctx.fillText('By ' + (currentSong.Artist || 'Unknown artist'), imageHeight + 10, 110);
                ctx.fillStyle = '#585858';
                ctx.font = '14px Roboto';
                ctx.fillText(formatTime(currentStatus.elapsed) + '/' + formatTime(currentStatus.duration), imageHeight + 10, imageHeight - 27);
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
                return [2 /*return*/];
        }
    });
}); });
server.get('/svg', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var currentSong, currentStatus, template;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getCurrentSong()];
            case 1:
                currentSong = _a.sent();
                return [4 /*yield*/, getCurrentStatus()];
            case 2:
                currentStatus = _a.sent();
                res.header('content-type', 'image/svg+xml; charset=utf-8');
                res.header('Cache-Control', 'max-age=30');
                return [4 /*yield*/, fs_1.promises.readFile('./svg-templates/default.svg')];
            case 3:
                template = _a.sent();
                res.sendRaw(template);
                return [2 /*return*/];
        }
    });
}); });
server.listen(8080);
