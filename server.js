'use strict'

const qs = require('qs');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const xmlParser = require('xml2json');
const request = require('request-promise');
const app = express();
/*
const env = require('node-env-file');
env(__dirname + '/.env');
*/

const {dialog, commands} = require('./const');
const {sendMessage, somethingWentWrong} = require('./api');
const {cmdCenter} = require('./pandora');

const favouriteGenres = 'toiminta, seikkailu, sci-fi, komedia, perhe-elokuva, animaatio, rikoselokuva';

const commandCenter = {
  'help': function (sender) {
    sendHelp(sender);
  },
  'browse': function (sender) {
    console.log('command mode chosen - browse');
    browseMovie(sender);

  },
  'find': function (sender) {
    console.log('command mode chosen - find');
    sendTextMessage(sender, 'Operator 6O requires your movie name.');
  }
}

// flag checks & modifiable stuff
let commandMode = '';
let areaCode = '1002';
let movieNameRequest = '';
let resultEvent = [];
let browseChunk = 0;

const token = "<PAGE_ACCESS_TOKEN>";
app.set('port', (process.env.PORT || 5000));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// Process application/json
app.use(bodyParser.json());

// Index route
app.get('/', function (req, res) {
  res.send('Hello! I am a chat bot!');
});

// Facebook verification
app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === process.env.FB_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  }

  res.send('Error, wrong token');
});

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i];
        let sender = event.sender.id;

        if (event.message && event.message.text) {
          const processedText = _.toLower(_.trim(event.message.text));

          if (cmdCenter.saidHello) {
            if (processedText.startsWith(commands.triggerMark)) {
              const command = cmdCenter.handleCommandRequest(processedText);
              const input = cmdCenter.extractParams(processedText);
              cmdCenter.executeCommand({sender, command, input});
            }
          } else {
            cmdCenter.sayHello(sender);
          }
        }
    }
    res.sendStatus(200);
});

app.listen(app.get('port'), function () {
  console.log('running on port', app.get('port'));
});
