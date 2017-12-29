const _ = require('lodash');
const xmlParser = require('xml2json');

const {commands, dialog, titleChunksPerMsg} = require('./const');
const {sendMessage, somethingWentWrong, getCurrentEvents} = require('./api');

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
      const events = xmlParser.toJson(resp, { object: true }).Events.Event;
      let results = _.map(events, function (event) {
        return `${event.Title || event.OriginalTitle}`;
      });
      cmdCenter.loadTitleCart(_.chunk(results, titleChunksPerMsg));
      const message = _.join(cmdCenter.titleCart[cmdCenter.currentCartPos], '\n');
      sendMessage({ sender, message: `Tadaa! Here's the list of events available for booking at the moment: \n\n${message} \n\nPage: *${cmdCenter.currentCartPos + 1}/${Math.ceil(_.flatten(cmdCenter.titleCart).length / titleChunksPerMsg)}* (\`!next\` to advance.)` });
    }).catch(function (err) {
      somethingWentWrong({sender});
    })
  },
  next: function (sender) {
    cmdCenter.advanceCartPos();
    const message = _.join(cmdCenter.titleCart[cmdCenter.currentCartPos], '\n');
    sendMessage({ sender, message: `Tadaa! Here's the list of events available for booking at the moment: \n\n${message} \n\nPage: *${cmdCenter.currentCartPos + 1}/${Math.ceil(_.flatten(cmdCenter.titleCart).length / titleChunksPerMsg)}* (\`!next\` to advance.)` });
  }
}

let cmdCenter = {
  saidHello: true,
  currentCartPos: 0,
  titleCart: [],
  areaCode: theaterIds.helsinki,
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
      return '';
    }
    return '';
  },
  executeCommand: function ({sender, command}) {
    console.log('execute command: ', command,' with sender: ', sender);
    if (command) {
      executioner[command](sender);
    } else {
      sendMessage({ sender, message: 'This command is not valid' });
    }
  },
  loadTitleCart: function (items) {
    this.titleCart = this.titleCart.concat(items);
  },
  advanceCartPos: function () {
    this.currentCartPos += 1;
  }
}

module.exports = {
  cmdCenter
}