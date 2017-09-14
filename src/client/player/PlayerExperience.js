import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

const template = `
  <div id="wrapper">
    <% for (var i = 0; i < 9; i++) { %>
      <div class="zone" data-stream="stream-<%= i %>" id="stream-<%= i %>"></div>
    <% } %>
  </div>
`;

class PlayerView extends soundworks.View {
  constructor(...args) {
    super(...args);

    this.$selectedZone = null;
  }

  onRender() {
    super.onRender();

    this.$wrapper = this.$el.querySelector('#wrapper');
    this.$zones = this.$el.querySelectorAll('.zone');
  }

  onResize(width, height, orientation) {
    super.onResize(width, height, orientation);

    let wrapperSize = null;
    let wrapperLeft = null;
    let wrapperTop = null;

    if (orientation === 'portrait') {
      wrapperSize = width;
      wrapperLeft = 0;
      wrapperTop = (height - wrapperSize) / 2;
    } else {
      wrapperSize = height;
      wrapperLeft = (width - wrapperSize) / 2;
      wrapperTop = 0;
    }

    this.$wrapper.style.width = `${wrapperSize}px`;
    this.$wrapper.style.height = `${wrapperSize}px`;
    this.$wrapper.style.left = `${wrapperLeft}px`;
    this.$wrapper.style.top = `${wrapperTop}px`;

    const zoneSize = wrapperSize / 3;

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const zoneIndex = i * 3 + j;
        const $zone = this.$zones[zoneIndex];

        const top = i * zoneSize;
        const left = j * zoneSize;

        $zone.style.width = `${zoneSize}px`;
        $zone.style.height = `${zoneSize}px`;
        $zone.style.top = `${top}px`;
        $zone.style.left = `${left}px`;
      }
    }

    this.selectZone(this.$selectedZone);
  }

  selectZone($selectedZone) {
    if ($selectedZone !== this.$selectedZone) {
      this.$selectedZone = $selectedZone;

      for (let i = 0; i < 9; i++) {
        const $zone = this.$zones[i];

        if ($zone === this.$selectedZone)
          $zone.classList.add('selected');
        else
          $zone.classList.remove('selected');
      }
    }
  }
}

// this experience plays a sound when it starts, and plays another sound when
// other clients join the experience
class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    // services
    this.platform = this.require('platform', { features: ['web-audio'] });
    this.checkin = this.require('checkin', { showDialog: false });

    this.audioStreamManager = this.require('audio-stream-manager', {
      monitorInterval: 1,
      requiredAdvanceThreshold: 10
    });

    this.params = this.require('shared-params');
    this.syncScheduler = this.require('sync-scheduler');
    this.sync = this.require('sync');

    // local attr
    const defaultStream = 'stream-4'; // center of the screen
    this.currentStream = defaultStream;
    this.metaAudioStream = null;
    this.parallelStreams = [];
    this.crossFadeDuration = null;

    // bind
    this.dropPacketCallback = this.dropPacketCallback.bind(this);
    this.latePacketCallback = this.latePacketCallback.bind(this);
  }

  start() {
    super.start(); // don't forget this

    // initialize the view
    this.view = new PlayerView(template, {}, {
      'touchstart .zone': (e) => {
        const streamId = e.target.dataset['stream'];

        if (streamId !== this.currentStreamId) {
          this.view.selectZone(e.target);
          this.setStreamSource(streamId, this.crossFadeDuration);
        }
      }
    }, {
      id: this.id,
    });

    // this.audioStreamManager.syncStartTime
    // const startTime = this.sync.getSyncTime() - 0.5;
    // console.log('syncStartTime', startTime);
    // this.audioStreamManager.syncStartTime = startTime;

    // const stream = this.audioStreamManager.getAudioStream();
    // stream.onended = () => console.log('ended!');
    // stream.connect(audioContext.destination);
    // stream.url = 'stream-1';
    // stream.loop = false;
    // stream.sync = true;
    // stream.start(0);
    // return;

    // as show can be async, we make sure that the view is actually rendered
    this.show().then(() => {
      this.params.addParamListener('cross-fade-duration', value => {
        this.crossFadeDuration = value;
      });

      this.receive('start', () => {
        this.setStreamSource(this.currentStream);

        const $zone = this.view.$el.querySelector(`#${this.currentStream}`);
        this.view.selectZone($zone);
      });

      this.receive('stop', () => {
        if (this.metaAudioStream)
          this.metaAudioStream.stream.stop();
      });
    });
  }

  setStreamSource(url, fadeDuration = 1.0) {
    if (this.metaAudioStream && this.metaAudioStream.stream.url === url)
      return;

    if (this.metaAudioStream !== null) { // fade out old audio stream
      const { gain, stream } = this.metaAudioStream;
      this.fadeGainNode(gain, 1, 0, fadeDuration);
      stream.stop(fadeDuration);
    }

    this.metaAudioStream = this.getMetaAudioStream();
    this.metaAudioStream.stream.url = url;
    this.fadeGainNode(this.metaAudioStream.gain, 0, 1, fadeDuration);
    this.metaAudioStream.stream.start();
  }

  getMetaAudioStream() {
    const audioStream = this.audioStreamManager.getAudioStream();
    audioStream.loop = false;
    audioStream.sync = true;

    const gain = audioContext.createGain();
    audioStream.connect(gain);
    gain.connect(audioContext.destination);

    audioStream.onended = () => gain.disconnect();

    return { 'stream': audioStream, 'gain': gain };
  }

  fadeGainNode(node, initValue, endValue, fadeDuration) {
    node.gain.value = initValue;
    node.gain.cancelScheduledValues(audioContext.currentTime);
    node.gain.setValueAtTime(node.gain.value, audioContext.currentTime);
    node.gain.linearRampToValueAtTime(endValue, audioContext.currentTime + fadeDuration);
  }

  dropPacketCallback() {
    this.send('dropPacket', client.index);
  }

  latePacketCallback(time) {
    console.log('late packet ' + time);
  }

  // setParallelStream(value) {
  //   // need to add streams
  //   if (value > this.parallelStreams.length) {
  //     // create new streams and store in local array
  //     for( let i = 0; i < value - this.parallelStreams.length; i++ ){
  //       let metaStream = this.getMetaAudioStream();
  //       metaStream.stream.url = 'sub-loop-test';
  //       metaStream.stream.ondrop = this.dropPacketCallback;
  //       metaStream.stream.onlate = this.latePacketCallback;
  //       metaStream.stream.start();
  //       this.parallelStreams.push(metaStream);
  //     }
  //   } else if (value < this.parallelStreams.length) {
  //     // need to remove streams
  //     for (let i = 0; i < this.parallelStreams.length - value; i++) {
  //       const metaStream = this.parallelStreams.pop();
  //       metaStream.stream.stop();
  //     }
  //   }

  //   console.log('num parallel stream: ' + this.parallelStreams.length);
  // }
}

export default PlayerExperience;
