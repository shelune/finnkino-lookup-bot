const request = require('request-promise');
const qs = require('qs');

const baseUrl = 'http://www.finnkino.fi/XML/';
const urlSchedules = 'Schedule';
const urlEvents = 'Events';
const urlDates = 'ScheduleDates';

const {areaCodes} = require('./const');

function sendMessage(data) {
  // console.log('data when sending message: ', data);
  const config = {
    url: 'https://graph.facebook.com/v2.8/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: {
      recipient: { id: data.sender },
      message: { text: data.message }
    },
  };
  return request(config);
}

function somethingWentWrong(data) {
  const config = {
    url: 'https://graph.facebook.com/v2.8/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: {
      recipient: { id: data.sender },
      message: 'Something went wrong at our side'
    },
  };

  request(config);
}

function getCurrentEvents(data) {
  const config = {
    uri: urlEvents,
    baseUrl: baseUrl,
    json: true,
    qs: {
      area: data.areaCode ? data.areaCode : areaCodes.helsinki,
    }
  }
  
  return request(config);
}

function getFutureEvents(data) {
  const config = {
    uri: urlEvents,
    baseUrl: baseUrl,
    json: true,
    qs: {
      listType: 'ComingSoon',
      area: data.areaCode ? data.areaCode : areaCodes.helsinki
    }
  }

  return request(config);
}

module.exports = {
  sendMessage,
  somethingWentWrong,
  getCurrentEvents,
  getFutureEvents
}