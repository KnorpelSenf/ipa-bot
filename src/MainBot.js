require('dotenv').config();
const tmp = require('tmp');
const fs = require('fs');
const converter = require('audio-converter');

const https = require('https');
const meSpeak = require('mespeak');

// Prevent zeit.co from restarting the bot
https.createServer().listen(3000);

const helpMessage = 'Send me some IPA to listen to it.'

const botApiToken = process.env.BOT_API_TOKEN;
const Slimbot = require('slimbot');
const slimbot = new Slimbot(botApiToken);

let botId;
let botName;
let isDevBot;

// Register listeners
slimbot.on('message', message => {
    let chat = message.chat;
    let chatId = chat.id;
    let chatType = chat.type;
    let messageId = message.message_id;

    if (message.hasOwnProperty('text')) {

        let text = message.text;
        let options = { original: text };
        let lowerText = text.toLowerCase();

        if (message.hasOwnProperty('entities')
            && message.entities[0].type === 'bot_command'
            && message.entities[0].offset === 0
            && (lowerText.indexOf('@') < 0 || lowerText.endsWith(botName))) {
            handleCommand(chatId, chatType, messageId, lowerText, options);
        } else {
            handleText(chatId, chatType, messageId, text, options);
        }
    }
});

function handleCommand(chatId, chatType, messageId, command, options) {
    if (command.startsWith('/help')) {
        slimbot.sendMessage(chatId, helpMessage, { parse_mode: 'html' });
    }
}

function handleText(chatId, chatType, messageId, text) {
    sendSpeechFile(chatId, chatType, messageId, text);
}

slimbot.getMe().then(response => {
    let result = response.result;
    botId = result.id;
    botName = result.username;
    isDevBot = botName.indexOf('dev') >= 0;

    // load mespeak config
    meSpeak.loadConfig(require('./mespeak_config.json'));
    meSpeak.loadVoice(require('./en.json'));

    // wait for messages
    console.log('Start polling at ' + new Date());
    slimbot.startPolling();
});

function sendSpeechFile(chatId, chatType, messageId, text) {
    let uipa = text;
    // nothing to process      
    if (uipa == null || uipa.length == 0) {
        return;
    }
    //translate
    let mappings = [
        { 'src': /^\s*\//g, 'dest': '' },
        { 'src': /\/\s*$/g, 'dest': '' },
        { 'src': /(\.)/g, 'dest': '%' },
        { 'src': /(\u02c8)/g, 'dest': '\'' },
        { 'src': /(\u02cc)/g, 'dest': ',' },
        { 'src': /(\u0251)/g, 'dest': 'A:' },
        { 'src': /(\u02d0)/g, 'dest': ':' },
        { 'src': /(\u0251\u02d0)/g, 'dest': 'A' },
        { 'src': /(\u0251\u0279)/g, 'dest': 'A' },
        { 'src': /(a\u02d0)/g, 'dest': 'A' },
        // feedback from formantzero via r/linguistics
        { 'src': /(\u0329)/g, 'dest': 'r' },

        // feedback from scharfes_s via r/linguistics
        { 'src': /(\u027e)/g, 'dest': 't' },
        { 'src': /(\xe6)/g, 'dest': 'a' },
        { 'src': /(a)/g, 'dest': 'a' },
        { 'src': /(\u028c)/g, 'dest': 'V' },
        { 'src': /(\u0252)/g, 'dest': '0' },
        { 'src': /(\u0254)/g, 'dest': '0' },
        { 'src': /(a\u028a)/g, 'dest': 'aU' },
        { 'src': /(\xe6\u0254)/g, 'dest': 'aU' },
        { 'src': /(\u0259)/g, 'dest': '@' },
        { 'src': /(\u025a)/g, 'dest': '3' },
        { 'src': /(\u0259\u02d0)/g, 'dest': '3:' },
        { 'src': /(a\u026a)/g, 'dest': 'aI' },
        { 'src': /(\u028c\u026a)/g, 'dest': 'aI' },
        { 'src': /(\u0251e)/g, 'dest': 'aI' },
        { 'src': /(b)/g, 'dest': 'b' },
        { 'src': /(t\u0283)/g, 'dest': 'tS' },
        { 'src': /(\u02a7)/g, 'dest': 'tS' },
        { 'src': /(d)/g, 'dest': 'd' },
        { 'src': /(\xf0)/g, 'dest': 'D' },
        { 'src': /(\u025b)/g, 'dest': 'E' },
        { 'src': /(e)/g, 'dest': 'E' },
        { 'src': /(\u025d)/g, 'dest': '3:' },
        { 'src': /(\u025c\u02d0)/g, 'dest': '3:' },
        { 'src': /(\u025b\u0259)/g, 'dest': 'e@' },
        { 'src': /(e)/g, 'dest': 'E' },
        { 'src': /(\u025d)/g, 'dest': '3:' },
        { 'src': /(\u025c\u02d0)/g, 'dest': '3:' },
        { 'src': /(e\u026a)/g, 'dest': 'eI' },
        { 'src': /(\xe6\u026a)/g, 'dest': 'eI' },
        { 'src': /(f)/g, 'dest': 'f' },
        { 'src': /(\u0261)/g, 'dest': 'g' },
        { 'src': /(g)/g, 'dest': 'g' },
        { 'src': /(h)/g, 'dest': 'h' },
        { 'src': /(\u026a)/g, 'dest': 'I' },
        { 'src': /(\u0268)/g, 'dest': 'I' },
        { 'src': /(\u026a\u0259)/g, 'dest': 'i@' },
        { 'src': /(\u026a\u0279)/g, 'dest': 'i@' },
        { 'src': /(\u026a\u0279\u0259)/g, 'dest': 'i@3' },
        { 'src': /(i)/g, 'dest': 'i:' },
        { 'src': /(i\u02d0)/g, 'dest': 'i:' },
        { 'src': /(d\u0292)/g, 'dest': 'dZ' },
        { 'src': /(\u02a4)/g, 'dest': 'dZ' },
        { 'src': /(k)/g, 'dest': 'k' },
        { 'src': /(x)/g, 'dest': 'x' },
        { 'src': /(l)/g, 'dest': 'l' },
        { 'src': /(d\u026b)/g, 'dest': 'l' },
        { 'src': /(m)/g, 'dest': 'm' },
        { 'src': /(n)/g, 'dest': 'n' },
        { 'src': /(\u014b)/g, 'dest': 'N' },
        { 'src': /(\u0259\u028a)/g, 'dest': 'oU' },
        { 'src': /(o)/g, 'dest': 'oU' },
        { 'src': /(o\u028a)/g, 'dest': 'oU' },
        { 'src': /(\u0259\u0289)/g, 'dest': 'V' },
        { 'src': /(\u0254\u026a)/g, 'dest': 'OI' },
        { 'src': /(o\u026a)/g, 'dest': 'OI' },
        { 'src': /(p)/g, 'dest': 'p' },
        { 'src': /(\u0279)/g, 'dest': 'r' },
        { 'src': /(s)/g, 'dest': 's' },
        { 'src': /(\u0283)/g, 'dest': 'S' },
        { 'src': /(t)/g, 'dest': 't' },
        { 'src': /(\u027e)/g, 'dest': 't' },
        { 'src': /(\u03b8)/g, 'dest': 'T' },
        { 'src': /(\u028a\u0259)/g, 'dest': 'U@' },
        { 'src': /(\u028a\u0279)/g, 'dest': 'U@' },
        { 'src': /(\u028a)/g, 'dest': 'U' },
        { 'src': /(\u0289\u02d0)/g, 'dest': 'u:' },
        { 'src': /(u\u02d0)/g, 'dest': 'u:' },
        { 'src': /(u)/g, 'dest': 'u:' },
        { 'src': /(\u0254\u02d0)/g, 'dest': 'O:' },
        { 'src': /(o\u02d0)/g, 'dest': 'O:' },
        { 'src': /(v)/g, 'dest': 'v' },
        { 'src': /(w)/g, 'dest': 'w' },
        { 'src': /(\u028d)/g, 'dest': 'w' },
        { 'src': /(j)/g, 'dest': 'j' },
        { 'src': /(z)/g, 'dest': 'z' },
        { 'src': /(\u0292)/g, 'dest': 'Z' },
        { 'src': /(\u0294)/g, 'dest': '?' },

        // special edits
        { 'src': /(k\'a2n)/g, 'dest': 'k\'@n' },
        { 'src': /(ka2n)/g, 'dest': 'k@n' },
        { 'src': /(gg)/g, 'dest': 'g' },
        { 'src': /(@U)/g, 'dest': 'oU' },
        { 'src': /rr$/g, 'dest': 'r' },
        { 'src': /3r$/g, 'dest': '3:' },
        { 'src': /([iU]|([AO]:))@r$/g, 'dest': '$1@' },
        { 'src': /([^e])@r/g, 'dest': '$1:3' },
        { 'src': /e@r$/g, 'dest': 'e@' },
        { 'src': /e@r([bdDfghklmnNprsStTvwjzZ])/g, 'dest': 'e@$1' },
        // edits arising from testing
        { 'src': /(\'k)+/g, 'dest': 'k\'' },
        { 'src': /(\ː)+/g, 'dest': ':' },
        { 'src': /(\:)+/g, 'dest': ':' },
        { 'src': /(ᵻ)/g, 'dest': 'I' },
        { 'src': /(ɜ)/g, 'dest': '3' },
        { 'src': /(ɔ)/g, 'dest': 'O' },
        // feedback from formantzero via r/linguistics
        { 'src': /\u0361(.)/g, 'dest': '$1\'' },
        { 'src': /3$/g, 'dest': 'R' }
    ];
    for (let i = 0; i < mappings.length; i++) {
        uipa = uipa.replace(mappings[i].src, mappings[i].dest);
        //console.log(mappings[i].src + uipa);
    }
    let buffer = meSpeak.speak('[[' + uipa + ']]', { 'rawdata': 'buffer' });

    let dir = tmp.dirSync().name;
    let pathWav = dir + '/speech.wav';
    let pathOgg = dir + '/speech.ogg';
    fs.writeFile(pathWav, buffer, (err) => {
        converter(dir, dir, {
            verbose: true,
            oggOnly: true
        }).then(function () {
            let file = fs.createReadStream(pathOgg);
            slimbot.sendDocument(chatId, file);
        });
    });
}