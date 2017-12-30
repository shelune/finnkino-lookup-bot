const _ = require('lodash');
const xmlParser = require('xml2json');

const {commands, dialog, titleChunksPerMsg} = require('./const');
const {
  sendMessage, 
  somethingWentWrong, 
  getCurrentEvents,
  getFutureEvents
} = require('./api');

const theaterIds = {
  'helsinki': '1002',
  'espoo': '1012',
  'vantaa': '1019'
}

let executioner = {
  help: function (sender) {
    sendMessage({sender, message: dialog.current}).then(function (resp) {
      return resp;
    }).then(function (resp) {
      return sendMessage({sender, message: dialog.future});
    }).then(function (resp) {
      return sendMessage({sender, message: dialog.find});
    }).catch(function (err) {
      somethingWentWrong({sender});
    })
  },
  current: function (sender) {
    getCurrentEvents({areaCode: cmdCenter.areaCode}).then(function (resp) {
      cmdCenter.updateCart(resp);
      const message = cmdCenter.getCartChunk();
      sendMessage({ sender, message: `Tadaa! Here's the list of events available for booking at the moment: \n\n${message} \n\nPage: *${cmdCenter.getCartPos()}/${cmdCenter.pageCount}* (\`!next\` to advance.)` });
    }).catch(function (err) {
      somethingWentWrong({sender});
    });
  },
  future: function (sender) {
    getFutureEvents({areaCode: cmdCenter.areaCode}).then(function(resp) {
      cmdCenter.updateCart(resp);
      const message = cmdCenter.getCartChunk();
      sendMessage({ sender, message: `Tadaa! Here's the list of events available in the next *3 weeks*: \n\n${message} \n\nPage: *${cmdCenter.getCartPos()}/${cmdCenter.pageCount}* (\`!next\` to advance.)` });
    }).catch(function (err) {
      somethingWentWrong({sender});
    });
  },
  next: function (sender) {
    if (cmdCenter.titleCart.length < 1) {
      sendMessage({sender, message: 'I cannot advance in an empty list. Try `!current` or `!future` first?'});
      return;
    }

    if (cmdCenter.getCartPos() < Math.ceil(_.flatten(cmdCenter.titleCart).length / titleChunksPerMsg)) {
      cmdCenter.advanceCartPos();
      const message = cmdCenter.getCartChunk();
      sendMessage({ sender, message: `Tadaa! Here's the list of events available for booking at the moment: \n\n${message} \n\nPage: *${cmdCenter.getCartPos()}/${cmdCenter.pageCount}* (\`!next\` to advance.)` });
    } else {
      const message = 'Reached the end of the list';
      sendMessage({sender, message});
    }
  },
  find: function (sender, name) {
    getCurrentEvents({ areaCode: cmdCenter.areaCode }).then(function (resp) {
      const events = xmlParser.toJson(resp, { object: true }).Events.Event;
      return _.filter(events, function (event) {
        return _.includes(_.toLower(event.Title), name) || _.includes(_.toLower(event.OriginalTitle), name);
      });
    }).then(function (currentEvents) {
      return getFutureEvents({ areaCode: cmdCenter.areaCode }).then(function (futureResp) {
        const events = xmlParser.toJson(futureResp, { object: true }).Events.Event;
        return _.concat(currentEvents, _.filter(events, function (event) {
          return _.includes(_.toLower(event.Title), name) || _.includes(_.toLower(event.OriginalTitle), name);
        }));
      });
    }).then(function (filtered) {
      const uniqResult = _.uniqBy(filtered, 'ID');
      console.log('using search phrase _', name, '_ . Got:', uniqResult.length, ' with content:', uniqResult);
    });
    /*
    const futureFiltered = currentFiltered.then(function () {
      return getFutureEvents({ areaCode: cmdCenter.areaCode }).then(function (futureResp) {
        const events = xmlParser.toJson(futureResp, { object: true }).Events.Event;
        return _.filter(events, function (event) {
          return _.includes(_.toLower(event.Title), name) || _.includes(_.toLower(event.OriginalTitle), name);
        });
      });
    });  
    */
  }
}

let cmdCenter = {
  saidHello: true,
  currentCartPos: 0,
  pageCount: 0,
  titleCart: [],
  areaCode: theaterIds.helsinki,
  _loadTitleCart: function (items) {
    this.titleCart = items;
  },
  updateHello: function () {
    this.saidHello = true;
  },
  handleCommandRequest: function (input) {
    if (input.startsWith(commands.triggerMark)) {
      const commandWord = _.words(input)[0];
      const command = _.trim(commandWord, commands.triggerMark);
      if (_.indexOf(commands.availableCmds, command) != -1) {
        return command;
      }
    }
    return '';
  },
  executeCommand: function ({sender, command, input}) {
    if (command) {
      executioner[command](sender, input);
      console.log('execute command _', command, '_ with sender id: ', sender);
    } else {
      sendMessage({ sender, message: 'Operator 6O does not understand this command. '});
    }
  },
  extractParams: function (input) {
    return _.join(_.drop(_.words(input)), ' ');
  },
  updateCart: function (resp) {
    if (resp) {
      const events = xmlParser.toJson(resp, { object: true }).Events.Event;
      let results = _.map(events, function (event, index) {
        return `${index + 1}. ${event.Title || event.OriginalTitle}`;
      });
      this.pageCount = 0;
      this._loadTitleCart(_.chunk(results, titleChunksPerMsg));
      this.pageCount = Math.ceil(_.flatten(cmdCenter.titleCart).length / titleChunksPerMsg);
    }
    return;
  },
  getCartChunk: function () {
    return _.join(cmdCenter.titleCart[cmdCenter.currentCartPos], '\n');
  },
  getCartPos: function () {
    return this.currentCartPos + 1;
  },
  advanceCartPos: function () {
    this.currentCartPos += 1;
  },
}

module.exports = {
  cmdCenter
}