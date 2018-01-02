'use strict'

const qs = require('qs');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const xmlParser = require('xml2json');
const request = require('request-promise');
const app = express();
const env = require('node-env-file');
env(__dirname + '/.env');

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
            sayHello(sender);
          }
        }
    }
    res.sendStatus(200);
});

function sayHello(sender) {
  const config = {
    sender: sender,
    message: dialog.intro
  }
  sendMessage(config).then(function (resp) {
    cmdCenter.updateHello();
    console.log('sending message for hello: ', resp);
    return;
  })
  .catch(function (err) {
    console.log('error when saying hello: ', err);
    somethingWentWrong(sender);
  });
}

function findMovie(sender, name) {
  resultEvent = [];
  let resultPromise = searchNowTheaters(name)
    .then(searchComingSoon(name))
    .catch(function (error) {
      console.log('promise error: ', error);
    })
    .finally(function (final) {
      let message = {};
      console.log(`... Requested to find: ${name} ...`);
      console.log(`Result: ${JSON.stringify(resultEvent, null, 4)}`);

      if (resultEvent.length > 0) {
        resultEvent = _.uniqBy(resultEvent, 'ID');
        if (resultEvent.length > 4) {
          resultEvent = _.filter(resultEvent, function (event) {
            return !_.includes(_.toLower(event.Title), 'swe') && !_.includes(_.toLower(event.OriginalTitle), 'swe');
          });
        }
        const events = _.map(resultEvent, function (event) {
          return {'web_url': event.EventURL, 'title': event.OriginalTitle};
        });
        const eventSample = resultEvent[0];
        const buttons = _.map(events, function (event) {
          return {'type': 'web_url', 'url': event.web_url, 'title': event.title}
        });

        console.log('buttons array: ', buttons);
        message = {
          'attachment': {
            'type': 'template',
            'payload': {
              'template_type': 'button',
              'text': `Are you searching for '${eventSample.OriginalTitle}'? \nIt's released on ${moment(eventSample.dtLocalRelease).format('DD/MM/YYYY')}.\n${eventSample.Videos.EventVideo ? 'You can watch the trailer at https://youtube.com/watch?v=' + eventSample.Videos.EventVideo.Location : ''}. If there're multiple versions, they should all be listed below. Check it out!`,
              'buttons': buttons
            }
          }
        }
      } else {
        message = {text: `I cannot find any event with [${name}] in it. Try another one then!`}
      }

      request({
          url: 'https://graph.facebook.com/v2.8/me/messages',
          qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
          method: 'POST',
          json: {
              recipient: {id: sender},
              message: message,
          }
      }, function (error, response, body) {
          if (error) {
              console.log('Error sending messages: ', error)
          } else if (response.body.error) {
              console.log('Error: ', response.body.error)
          }
      });
    })
}

function browseMovie(sender) {
  resultEvent = [];
  return searchNowTheaters('')
    .then(searchComingSoon(''))
    .catch(function (error) {
      console.log('promise error: ', error);
    })
    .finally(function (final) {
      let message = {text: ''};

      if (resultEvent.length > 0) {
        resultEvent = _.uniqBy(resultEvent, 'ID');
        const events = _.map(resultEvent, function (event) {
          return {'web_url': event.EventURL, 'title': event.OriginalTitle};
        });

        console.log(`... Requested to browse ...`);
        console.log(`Result: ${JSON.stringify(resultEvent, null, 4)}`);

        message.text = `Here's the list of event names that I found. 'Cmd find' with your one of your choice!\n- - - - -\n`;

        _.map(_.slice(events, 0, 10), function (event) {
          message.text += `${event.title}.\n`;
        });
      } else {
        message = {text: `Operator 6O cannot retrieve any event. Probably some problems from the Bunker... Try again after a while!`}
      }

      request({
          url: 'https://graph.facebook.com/v2.8/me/messages',
          qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
          method: 'POST',
          json: {
              recipient: {id: sender},
              message: message,
          }
      }, function (error, response, body) {
          if (error) {
              console.log('Error sending messages: ', error)
          } else if (response.body.error) {
              console.log('Error: ', response.body.error)
          }
      });
    })
}

function sendDetail(sender) {
  message = {
    'attachment': {
      'type': 'template',
      'payload': {
        'template_type': 'generic',
        'elements': [
          {
            'title': resultEvent.Title,
            'image_url': resultEvent.Images.EventMediumImagePortrait,
            'subtitle': `Length: ${resultEvent.LengthInMinutes} minutes. Rating: ${resultEvent.Rating}`,
            'default_action': {
              'type': 'web_url',
              'url': resultEvent.EventURL,
              'messenger_extensions': true,
              'webview_height_ratio': 'tall',
              'fallback_url': 'http://www.finnkino.fi/'
            },
            'buttons':[
              {
                'type':'web_url',
                'url': resultEvent.EventURL,
                'title': 'Go to event!'
              }
            ]
          }
        ]
      }
    }
  }
}

function _getPhraseAfterTheSpace(sentence) {
  const breakpoint = sentence.indexOf(' ');
  return sentence.substring(breakpoint + 1);
}

app.listen(app.get('port'), function () {
  console.log('running on port', app.get('port'));
});
