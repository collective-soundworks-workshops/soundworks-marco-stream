import { Experience } from 'soundworks/server';

// server-side 'player' experience.
export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    // services
    this.checkin = this.require('checkin');
    this.sharedConfig = this.require('shared-config');
    this.params = this.require('shared-params');
    let audioFiles = [
      './public/streams/aphex-twin-vordhosbn.wav',
      './public/streams/exorcist-theme.wav',
      './public/streams/sub-loop-test.wav',
    ];
    this.audioStreamManager = this.require('audio-stream-manager', {audioFiles: audioFiles});
    this.sync = this.require('sync');

    // local attr
    this.playerMap = new Map();
  }

  // if anything needs to append when the experience starts
  start() {
    this.params.addParamListener('startSyncStream', () => {
      const syncStartOffsetTime = this.sync.getSyncTime();
      this.broadcast('player', null, 'startSyncStreamFromZero', syncStartOffsetTime);
    });
  }

  // if anything needs to happen when a client enters the performance (*i.e.*
  // starts the experience on the client side), write it in the `enter` method
  enter(client) {
    super.enter(client);
    if( client.type !== 'player' ){ return; }
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
    if( client.type !== 'player' ){ return; }
    // unregister player
    this.playerMap.delete(client.index);
    // update shared param
    this.params.update('numPlayers', this.playerMap.size);    
  }
}
