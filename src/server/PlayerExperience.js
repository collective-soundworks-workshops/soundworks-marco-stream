import { Experience } from 'soundworks/server';

const audioFiles = [
  './public/streams/test/stream-0.wav',
  './public/streams/test/stream-1.wav',
  './public/streams/test/stream-2.wav',
  './public/streams/test/stream-3.wav',
  './public/streams/test/stream-4.wav',
  './public/streams/test/stream-5.wav',
  './public/streams/test/stream-6.wav',
  './public/streams/test/stream-7.wav',
  './public/streams/test/stream-8.wav',
];

// server-side 'player' experience.
export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    // services
    this.checkin = this.require('checkin');
    this.sync = this.require('sync');
    this.sharedConfig = this.require('shared-config');
    this.sharedParams = this.require('shared-params');
    this.audioStreamManager = this.require('audio-stream-manager', {
      audioFiles: audioFiles,
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

  // if anything needs to happen when a client enters the performance (*i.e.*
  // starts the experience on the client side), write it in the `enter` method
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
