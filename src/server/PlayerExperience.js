import { Experience } from 'soundworks/server';

const audioFiles = [
  './public/streams/stream-0.wav',
  './public/streams/stream-1.wav',
  './public/streams/stream-2.wav',
  './public/streams/stream-3.wav',
  './public/streams/stream-4.wav',
  './public/streams/stream-5.wav',
  './public/streams/stream-6.wav',
  './public/streams/stream-7.wav',
  './public/streams/stream-8.wav',
];

// server-side 'player' experience.
export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    // services
    this.checkin = this.require('checkin');
    this.sharedConfig = this.require('shared-config');
    this.params = this.require('shared-params');
    this.audioStreamManager = this.require('audio-stream-manager', {
      audioFiles: audioFiles,
    });

    this.syncScheduler = this.require('sync-scheduler');
    // local attr
    this.playerMap = new Map();
  }

  // start() {}

  // if anything needs to happen when a client enters the performance (*i.e.*
  // starts the experience on the client side), write it in the `enter` method
  enter(client) {
    super.enter(client);

    if (client.type !== 'player')
      return;

    // register players
    this.playerMap.set(client.index, client);
    // update shared param
    this.params.update('numPlayers', this.playerMap.size);
    // msg callbacks
    this.receive(client, 'dropPacket', (clientId) => {
      console.log('-> client ' + clientId + ' dropped a packet');
    });
  }

  exit(client) {
    super.exit(client);

    if (client.type !== 'player')
      return;

    // unregister player
    this.playerMap.delete(client.index);
    // update shared param
    this.params.update('numPlayers', this.playerMap.size);
  }
}
