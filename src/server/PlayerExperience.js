import { Experience } from 'soundworks/server';


class PlayerExperience extends Experience {
  constructor(clientType, streamsConfig) {
    super(clientType);

    const streamFiles = [];

    for (let key in streamsConfig)
      streamFiles.push(streamsConfig[key]);

    // services
    this.checkin = this.require('checkin');
    this.sync = this.require('sync');
    this.sharedConfig = this.require('shared-config');
    this.sharedParams = this.require('shared-params');
    this.audioStreamManager = this.require('audio-stream-manager', {
      audioFiles: streamFiles,
    });

    this.syncScheduler = this.require('sync-scheduler');
    // local attr
    this.playerMap = new Map();
    this.isPlaying = false;
  }

  start() {
    this.sharedParams.addParamListener('start-stop', value => {
      if (value === 'start') {
        const syncTime = this.sync.getSyncTime();
        this.audioStreamManager.syncStartTime = syncTime + 1;
        this.broadcast('player', null, 'start');

        this.isPlaying = true;
      } else if (value === 'stop') {
        this.broadcast('player', null, 'stop');

        this.isPlaying = false;
      }
    });
  }

  enter(client) {
    super.enter(client);

    if (client.type !== 'player')
      return;

    // register players
    this.playerMap.set(client.index, client);
    // update shared param
    this.sharedParams.update('numPlayers', this.playerMap.size);
    // msg callbacks
    this.receive(client, 'dropPacket', (clientId) => {
      console.log('-> client ' + clientId + ' dropped a packet');
    });

    if (this.isPlaying)
      this.send(client, 'start');
  }

  exit(client) {
    super.exit(client);

    if (client.type !== 'player')
      return;

    // unregister player
    this.playerMap.delete(client.index);
    // update shared param
    this.sharedParams.update('numPlayers', this.playerMap.size);
  }
}

export default PlayerExperience;
