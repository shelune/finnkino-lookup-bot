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
const intro = 'Hello! Operator 6O wish you a good day. Here you can check if your favorite upcoming movie is out for schedule at Finnkino or not. Type "HELP" for the command you can issue!';
const commandFind = `The first command you can type is FIND (lower or uppercase is just fine). I'll prompt you a question on the name of the movie (in English) & which cinema area you go to. Hopefully I can return the movie you want with its event link & date.`;
const commandBrowse = `Then you can type BROWSE. I'll introduce a list of events available for you within 3 weeks. Then you can find with the provided name. Neat!`


const theaterIds = [
  {'All': '1029'},
  {'Helsinki': '1002'},
  {'Espoo': '1012'},
  {'Vantaa': '1013'},
  {'Pori': '1019'},
  {'Tampere': '1021'}
];

const baseUrl = 'http://www.finnkino.fi/XML/';
const urlSchedules = 'Schedule';
const urlEvents = 'Events';
const urlDates = 'ScheduleDates';

const commandCenter = {
  'help': function(sender) {
    let messageData = {text: commandFind};
    request({
        url: 'https://graph.facebook.com/v2.8/me/messages',
        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: sender},
            message: messageData,
        }
    }).then(function (body) {
      sendTextMessage(sender, commandBrowse);
    }, function (err) {
      console.log('error encountered', err);
    });
  },
  'browse': function(sender) {

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
let resultEvent = null;

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

          if (commandMode == 'find') {
            movieNameRequest = _.trim(_.toLower(text));

            if (movieNameRequest) {
              findMovie(sender, movieNameRequest);
            }
          }

          if (saidHello) {
            const processedText = _.toLower(_.trim(text));
            const availableCommands = _.keys(commandCenter);
            _.map(availableCommands, function (command) {
              if (processedText.includes(command)) {
                commandCenter[`${command}`](sender);
                commandMode = command;
              }
            });

            if (!commandMode) {
              sendTextMessage(sender, 'Operator 6O does not understand this.');
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
  let messageData = {text: commandFind};
  request({
      url: 'https://graph.facebook.com/v2.8/me/messages',
      qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
      method: 'POST',
      json: {
          recipient: {id: sender},
          message: messageData,
      }
  }).then(function (body) {
    sendTextMessage(sender, commandBrowse);
  }, function (err) {
    console.log('error encountered', err);
  });
}

function sendMovieSchedule(sender, name) {

}

function findMovie(sender, name) {
  request.get({
    uri: urlEvents,
    baseUrl: baseUrl,
    json: true,
    qs: {
      listType: 'ComingSoon',
      area: areaCode.length == 4 ? areaCode : '1002',
      nrOfDays: 14
    }
  }).then(function(body) {
    const result = body;
    let resultJSON = xmlParser.toJson(result, {
      object: true
    });
    let events = resultJSON.Events.Event;
    resultEvent = _.find(events, function (event) {
      return _.includes(_.toLower(event.Title), name) || _.includes(_.toLower(event.OriginalTitle), name);
    })
    /*
    if (resultEvent) {
      return resultEvent;
    } else {

      request.get({
        uri: urlEvents,
        baseUrl: baseUrl,
        json: true,
        qs: {
          area: areaCode.length == 4 ? areaCode : '1002',
        }
      }).then(function(body) {
        const result = body;
        let resultJSON = xmlParser.toJson(result, {
          object: true
        });
        let events = resultJSON.Events.Event;
        resultEvent = _.find(events, function (event) {
          return _.includes(event.Title, name);
        })
      })

    }
    */

    console.log(`... Requested to find: ${name} ...`);

  }, function (error) {

  }).finally(function () {
    console.log(`Result: ${JSON.stringify(resultEvent, null, 4)}`);
    let message = {};
    if (resultEvent) {
      message = {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'button',
            'text': `Are you searching for ${resultEvent.Title}? \n --- --- --- \n It's going to be release on ${moment(resultEvent.dtLocalRelease).format('DD/MM/YYYY')}`,
            'buttons': [
              {
               'type': 'web_url',
               'url': resultEvent.EventURL,
               'title': 'Go to event'
              }
            ]
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

  });
}

// Spin up the servurrr!
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'));
});
