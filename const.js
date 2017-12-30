const dialog = {
  intro: 'Hello! Operator 6O wish you a good day. Here you can check if your favorite upcoming movie is out for schedule at Finnkino or not. Type "!help" for the command you can issue!',
  find: `*!find [insert movie name]*: I'll hopefully return the movie you want with its event link & date.`,
  current: `*!current*: I'll return a list of currently showing movies at Finnkino.`,
  future: `*!future*: I'll introduce a list of events available for you within the near future (approx. 3 weeks)`,
};

const commands = {
  triggerMark: '!',
  availableCmds: ['help', 'find', 'future', 'current', 'next']
};

const areaCodes = {
  helsinki: '1002',
  espoo: '1012',
  vantaa: '1013',
  tampere: '1021'
};

const titleChunksPerMsg = 12;

module.exports = {
  dialog,
  commands,
  areaCodes,
  titleChunksPerMsg
}