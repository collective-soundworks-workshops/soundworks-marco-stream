import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;

const template = `
  <canvas class="background"></canvas>
  <div class="foreground">
    <div class="section-top flex-middle"></div>
    <div class="section-center flex-center">
      <p class="big"><%= title %></p>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

const model = { title: `Let's stream!` };

// this experience plays a sound when it starts, and plays another sound when
// other clients join the experience
class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    // services
    this.platform = this.require('platform', { features: ['web-audio'] });
    this.checkin = this.require('checkin', { showDialog: false });
    this.audioStreamManager = this.require('audio-stream-manager', {monitorInterval: 1, requiredAdvanceThreshold: 10});

    // local attr
    this.metaAudioStream = undefined;
  }

  start() {
    super.start(); // don't forget this

    // initialize the view
    this.view = new soundworks.CanvasView(template, model, {}, {
      id: this.id,
      preservePixelRatio: true,
    });

    // as show can be async, we make sure that the view is actually rendered
    this.show().then(() => {
      // create touch event source referring to our view
      const surface = new soundworks.TouchSurface(this.view.$el);
      // setup touch listeners
      surface.addListener('touchstart', (id, normX, normY) => {
        console.log(id, normX, normY);
        if( normY >= 0.5 ){ this.setStreamSource('exorcist-theme'); }
        else{ this.setStreamSource('aphex-twin-vordhosbn'); }
      });

    });
  }

  setStreamSource(url, fadeDuration = 1.0){
    // get new audio stream
    const metaAudioStream = this.getMetaAudioStream();
    metaAudioStream.stream.url = url;
    // fade in new audio stream
    this.fadeGainNode( metaAudioStream.gain, 0, 1, fadeDuration );
    // start new audio stream
    metaAudioStream.stream.start();
    // 1st time: simply store local ref for later use
    if( this.metaAudioStream === undefined ){ 
      this.metaAudioStream = metaAudioStream;
      return; 
    }
    // fade out old audio stream
    this.fadeGainNode( this.metaAudioStream.gain, 1, 0, fadeDuration );
    // replace old by new when fade over
    setTimeout( () => {
      this.metaAudioStream.stream.stop();
      this.metaAudioStream = metaAudioStream;
    }, 1000 * fadeDuration);
  }

  getMetaAudioStream(){
    // request new audio stream
    let audioStream = this.audioStreamManager.getAudioStream();
    // setup audio stream
    audioStream.loop = true; // disable loop
    audioStream.sync = false; // disable synchronization
    // audioStream.onended = function(){ console.log('stream ended'); }; // mimics AudioBufferSourceNode onended method
    // create gain
    let gain = audioContext.createGain();
    // connect graph
    audioStream.connect( gain );
    gain.connect( audioContext.destination );
    // output
    return { 'stream': audioStream, 'gain': gain };
  }

  fadeGainNode( node, initValue, endValue, fadeDuration ){
    node.gain.value = initValue;
    node.gain.cancelScheduledValues(audioContext.currentTime);
    node.gain.setValueAtTime(node.gain.value, audioContext.currentTime);
    node.gain.linearRampToValueAtTime(endValue, audioContext.currentTime + fadeDuration);
  }

}

export default PlayerExperience;