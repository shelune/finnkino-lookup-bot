'use strict'

//EAAILAOmIWYwBAO4VKlcuPUje5gOZC22U9G5RKnllyZBZAMWuAZB0PUtWS9c1FXwtML92ALFgKjRYVvRFR1y34Bkmc0ZBYuHa91TZBV669Es8TimwZAmu2t8keMcfPabJNokjE96r3O2MZBmquo0P4nuZBVhFZCeVvxZBj5Qt4nVRyBzkAZDZD

const qs = require('qs');
const _ = require('lodash');
const moment = require('moment');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request-promise');
const app = express();

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
          let secretMesg = detectLA(event.message.text);
          console.log(secretMesg);
          if (secretMesg != '') {
            sendTextMessage(sender, secretMesg);
          } else {
            let text = event.message.text.toLowerCase().trim();
            foundItem = false;

            if (saidHello) {
              // iterate through item list and assign item key
              _.forIn(arcanaList, (value, key) => {
                if (key == text.toLowerCase().trim()) {
                  itemName = value;
                  foundItem = true;
                }
              });

              if (!foundItem) {
                sendTextMessage(sender, `No such record found. You can type in one of these commands. \n ${joinWords(arcanaList).toUpperCase()}`);
              } else {
                if (currencySet) {
                  sendPrice(sender, currency, itemName);
                } else {
                  askCurrency(sender);
                  continue;
                }
              }

              if (detectPhrase(text, 'currency', true)) {
                askCurrency(sender);
              }
            } else {
              sayHello(sender, intro);
            }
          }

        } else if (event.postback && event.postback.payload) {
          currency = event.postback.payload;
          if (itemName.length > 0) {
            sendPrice(sender, currency, itemName);
          }
        }
    }
    res.sendStatus(200);
});

// Spin up the servurrr!
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'));
});
