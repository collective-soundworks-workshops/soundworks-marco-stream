import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

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
    this.params = this.require('shared-params');

    // local attr
    this.metaAudioStream = undefined;
    this.parallelStreams = [];

    // bind
    this.dropPacketCallback = this.dropPacketCallback.bind(this);
    this.latePacketCallback = this.latePacketCallback.bind(this);
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
        // touch top: one sound, touch down: another (fade between both)
        if( normY >= 0.5 ){ this.setStreamSource('exorcist-theme'); }
        else{ this.setStreamSource('aphex-twin-vordhosbn'); }
      });

      this.params.addParamListener('numStreamPerPlayer', (value) => {
        this.setParallelStream(value);
      });

      this.receive('startSyncStreamFromZero', (offsetTime) => {
        console.log('server defined offset time:', offsetTime);
        this.startSyncStreamFromZero(offsetTime);
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

  fadeGainNode(node, initValue, endValue, fadeDuration){
    node.gain.value = initValue;
    node.gain.cancelScheduledValues(audioContext.currentTime);
    node.gain.setValueAtTime(node.gain.value, audioContext.currentTime);
    node.gain.linearRampToValueAtTime(endValue, audioContext.currentTime + fadeDuration);
  }

  startSyncStreamFromZero(offsetTime){
    this.audioStreamManager.syncStartTime = offsetTime;
    let audioStream = this.audioStreamManager.getAudioStream();
    // setup audio stream
    audioStream.loop = true; // disable loop
    audioStream.sync = true; // disable synchronization
    audioStream.url = 'aphex-twin-vordhosbn';
    // connect graph
    audioStream.connect( audioContext.destination );
    // start node
    audioStream.start();
  }

  setParallelStream(value){
    // need to add streams
    if( value > this.parallelStreams.length ){
      // create new streams and store in local array
      for( let i = 0; i < value - this.parallelStreams.length; i++ ){
        let metaStream = this.getMetaAudioStream();
        metaStream.stream.url = 'sub-loop-test';
        metaStream.stream.ondrop = this.dropPacketCallback;
        metaStream.stream.onlate = this.latePacketCallback;
        metaStream.stream.start();
        this.parallelStreams.push( metaStream );
      }
    }
    // need to remove streams
    else if( value < this.parallelStreams.length ){
      for( let i = 0; i < this.parallelStreams.length - value; i++ ){
        let metaStream = this.parallelStreams.pop();
        metaStream.stream.stop();
      }
    }
    console.log('num parallel stream: ' + this.parallelStreams.length);
  }

  dropPacketCallback(){
    this.send('dropPacket', client.index);
  }

  latePacketCallback(time){
    console.log('late packet ' + time);
  }

}

export default PlayerExperience;