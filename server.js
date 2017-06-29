'use strict'

// Token Generated
//EAAEIHve3uJsBAFsPJzqM9sqeYK3ehMj47SPEdEgun0w8aKe9cfz1LgIftFNyEhQ7gTQsCarMzZCOLhGRnlqvaTYJQFGshAvSTWsn9YDIghuPR6TkAEvBxYxVYfI3psvfgZAfKQy06cTwkBICmmkMKPIL7nQgF0dOTi5G8gmwZDZD

const qs = require('qs');
const _ = require('lodash');
const moment = require('moment');
const express = require('express');
const bodyParser = require('body-parser');
const xmlParser = require('xml2json');
const request = require('request-promise');
const app = express();

// Const stuff
const intro = 'Hello! Operator 6O wish you a good day. Here you can check if your favorite upcoming movie is out for schedule at Finnkino or not. Type "cmd help" for the command you can issue!';
const commandFind = `The first command is "cmd find" (lower or uppercase is just fine). I'll prompt you a question on the name of the movie (in English). Hopefully I can return the movie you want with its event link & date.`;
const commandBrowse = `Then you can type "cmd browse". I'll introduce a list of events available for you within 3 weeks. Then you can find with the provided name. Neat!`


const theaterIds = [
  {'All': '1029'},
  {'Helsinki': '1002'},
  {'Espoo': '1012'},
  {'Vantaa': '1013'},
  {'Pori': '1019'},
  {'Tampere': '1021'}
];

const favouriteGenres = 'toiminta, seikkailu, sci-fi, komedia, perhe-elokuva, animaatio, rikoselokuva';

const baseUrl = 'http://www.finnkino.fi/XML/';
const urlSchedules = 'Schedule';
const urlEvents = 'Events';
const urlDates = 'ScheduleDates';

const commandCenter = {
  'help': function(sender) {
    sendHelp(sender);
  },
  'browse': function(sender) {
    console.log('command mode chosen - browse');
    browseMovie(sender);
  },
  'find': function(sender) {
    console.log('command mode chosen - find');
    sendTextMessage(sender, 'Operator 6O requires your movie name.');
  }
}

// flag checks & modifiable stuff
let saidHello = false;
let commandMode = '';
let areaCode = '1002';
let movieNameRequest = '';
let resultEvent = [];

const token = "<PAGE_ACCESS_TOKEN>";

app.set('port', (process.env.PORT || 5000));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// Process application/json
app.use(bodyParser.json());

// Index route
app.get('/', function(req, res) {
  res.send('Hello! I am a chat bot!');
});

// Facebook verification
app.get('/webhook/', function(req, res) {
  if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
    res.send(req.query['hub.challenge']);
  }

  res.send('Error, wrong token');
});

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i];
        let sender = event.sender.id;
        // check first hero name
        if (event.message && event.message.text) {
          let text = event.message.text;
          const processedText = _.toLower(_.trim(text));

          if (saidHello) {
            const processedText = _.toLower(_.trim(text));

            if (processedText.startsWith('cmd')) {
              const availableCommands = _.keys(commandCenter);
              const cmd = _.words(processedText)[1];
              _.map(availableCommands, function (command) {
                if (cmd == command) {
                  commandCenter[`${command}`](sender);
                  commandMode = command;
                }
              });
            } else if (commandMode == 'find') {
              movieNameRequest = processedText;

              if (movieNameRequest) {
                findMovie(sender, movieNameRequest);
              }
            } else if (!commandMode) {
              sendTextMessage(sender, 'Operator 6O does not understand this command.');
            }
          } else {
            sayHello(sender);
          }
        }
    }
    res.sendStatus(200);
});

function sayHello(sender) {
  let messageData = {text: intro};
  request({
      url: 'https://graph.facebook.com/v2.8/me/messages',
      qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
      method: 'POST',
      json: {
          recipient: {id: sender},
          message: messageData,
      }
  }).then(function (body) {
    saidHello = true
  }, function (err) {
    console.log('error encountered', err);
  });
}

function sendTextMessage(sender, text) {
    let messageData = {text: text}
    request({
	    url: 'https://graph.facebook.com/v2.8/me/messages',
	    qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
	    method: 'POST',
  		json: {
  		  recipient: {id: sender},
  			message: messageData,
  		}
	}, function(error, response, body) {
		if (error) {
		  console.log('Error sending messages: ', error)
		} else if (response.body.error) {
		  console.log('Error: ', response.body.error)
	  }
  })
}

function sendHelp(sender) {
  let messageData = {text: commandBrowse};
  request({
      url: 'https://graph.facebook.com/v2.8/me/messages',
      qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
      method: 'POST',
      json: {
          recipient: {id: sender},
          message: messageData,
      }
  }).then(function (body) {
    sendTextMessage(sender, commandFind);
  }, function (err) {
    console.log('error encountered', err);
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
      }, function(error, response, body) {
          if (error) {
              console.log('Error sending messages: ', error)
          } else if (response.body.error) {
              console.log('Error: ', response.body.error)
          }
      });
    })
}

function searchComingSoon(name) {
  return request.get({
    uri: urlEvents,
    baseUrl: baseUrl,
    json: true,
    qs: {
      listType: 'ComingSoon',
      area: areaCode.length == 4 ? areaCode : '1002'
    }
  }).then(function(body) {
    const result = body;
    const resultJSON = xmlParser.toJson(result, {
      object: true
    });
    const events = resultJSON.Events.Event;
    const matchedEvents = _.filter(events, function (event) {
      return _.includes(_.toLower(event.Title), name) || _.includes(_.toLower(event.OriginalTitle), name);
    });
    console.log('coming soon filtered: ', matchedEvents);

    resultEvent = _.concat(resultEvent, matchedEvents);
  })
}

function searchNowTheaters(name) {
  return request.get({
    uri: urlEvents,
    baseUrl: baseUrl,
    json: true,
    qs: {
      area: areaCode.length == 4 ? areaCode : '1002',
    }
  }).then(function(body) {
    const result = body;
    const resultJSON = xmlParser.toJson(result, {
      object: true
    });
    const events = resultJSON.Events.Event;
    const matchedEvents = _.filter(events, function (event) {
      return _.includes(_.toLower(event.Title), name) || _.includes(_.toLower(event.OriginalTitle), name);
    });

    resultEvent = _.concat(resultEvent, matchedEvents);
  })
}

function browseMovie(sender) {
  resultEvent = [];
  let resultPromise = searchNowTheaters('')
    .then(searchComingSoon(''))
    .catch(function (error) {
      console.log('promise error: ', error);
    })
    .finally(function (final) {
      let message = {};
      console.log(`... Requested to browse ...`);
      console.log(`Result: ${JSON.stringify(resultEvent, null, 4)}`);

      if (resultEvent.length > 0) {
        resultEvent = _.uniqBy(resultEvent, 'ID');
        const events = _.map(resultEvent, function (event) {
          return {'web_url': event.EventURL, 'title': event.OriginalTitle};
        });

        message = `Here's the list of event names that I found. 'Cmd find' with your one of your choice!\n- - - - -\n`;

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
      }, function(error, response, body) {
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

// Spin up the servurrr!
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'));
});
