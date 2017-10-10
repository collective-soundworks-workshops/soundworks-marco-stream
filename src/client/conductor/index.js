import * as soundworks from 'soundworks/client';
import serviceViews from '../shared/serviceViews';

function bootstrap() {
  // initialize the client with configuration received
  // from the server through the `index.html`
  // @see {~/src/server/index.js}
  // @see {~/html/default.ejs}
  const config = Object.assign({ appContainer: '#container' }, window.soundworksConfig);
  soundworks.client.init(config.clientType, config);

  // configure views for the services
  soundworks.client.setServiceInstanciationHook((id, instance) => {
    if (serviceViews.has(id))
      instance.view = serviceViews.get(id, config);
  });

  // configure appearance of shared parameters
  let defaultSliderSize = 'medium';
  const conductor = new soundworks.ControllerExperience();

  conductor.setGuiOptions('start-stop', { type: 'buttons' });

  conductor.setGuiOptions('cross-fade-duration', {
    type: 'slider',
    size: 'large',
  });

  conductor.setGuiOptions('master-gain', {
    type: 'slider',
    size: 'large',
  });

  // conductor.setGuiOptions('numStreamPerPlayer', { show: false });
  // start client
  soundworks.client.start();
}

window.addEventListener('load', bootstrap);
