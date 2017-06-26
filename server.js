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
const intro = 'Hello! Operator 6O at your serve. Here you can check if your favorite upcoming movie is out for schedule at Finnkino or not. You can also do some more stuff with it! Type HELP for the command you can issue!';

const theaterIds = [
  {'All': 1029},
  {'Helsinki': 1002},
  {'Espoo': 1012},
  {'Vantaa': 1013},
  {'Pori': 1019},
  {'Tampere': 1021}
];

const baseUrl = 'http://www.finnkino.fi/XML/';
const urlSchedules = 'Schedule';
const urlEvents = 'Events';
const urlDates = 'ScheduleDates';

// flag checks
let saidHello = false;
let areaCode = ''

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
          let text = event.message.text
          if (saidHello) {
            if (_.includes(_.toLower(text), 'browse')) {
              sendEventList(sender);
            } else {
              sendTextMessage(sender, 'Operator 6O does not understand this.')
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

function sendEventList(sender) {
  let messageData = {};
  request.get({
    uri: urlEvents,
    baseUrl: baseUrl,
    json: true,
    qs: {
      listType: 'ComingSoon',
      area: areaCode.length == 4 ? areaCode : 1002,
      nrOfDays: 14
    }
  }).then(function(body) {
    const result = body;
    if (result.lowest_price || result.lowest_price.length == 0) {
      let resultJSON = xmlParser.toJson(result);
      let events = resultJSON.Events.Event;
      console.log('result json', resultJSON);
      console.log('- - -  - - - - ');
      console.log('result events: ', events);
      // console.log(qs.stringify(itemName))
    } else {
      messageData.text = `Couldn't find the price of that item.`;
    }
  }, function (error) {
    messageData.text = `Couldn't find the price of that item.`;
  })
  //send the result message with prices
  .finally(function () {
    itemName = '';
    let messagePriceData = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'button',
          'text': `The price will be listed below, along with the link to detailed item view. \n --- --- --- \n ${price}`,
          'buttons': [
            {
             'type': 'web_url',
             'url': itemUrl,
             'title': 'Check on Steam'
            }
          ]
        }
      }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messagePriceData,
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
