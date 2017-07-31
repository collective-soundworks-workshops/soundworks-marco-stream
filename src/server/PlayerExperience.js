import { Experience } from 'soundworks/server';

// server-side 'player' experience.
export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    // services
    this.checkin = this.require('checkin');
    this.sharedConfig = this.require('shared-config');
    let audioFiles = [
      './public/streams/aphex-twin-vordhosbn.wav',
      './public/streams/exorcist-theme.wav',
    ];
    this.audioStreamManager = this.require('audio-stream-manager', {audioFiles: audioFiles});    
  }

  // if anything needs to append when the experience starts
  start() {

  }

  // if anything needs to happen when a client enters the performance (*i.e.*
  // starts the experience on the client side), write it in the `enter` method
  enter(client) {
    super.enter(client);
  }

  exit(client) {
    super.exit(client);
  }
}
