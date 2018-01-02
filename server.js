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

const {commands} = require('./const');
const {cmdCenter} = require('./pandora');

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
