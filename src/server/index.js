import 'source-map-support/register'; // enable sourcemaps in node
import path from 'path';
import chalk from 'chalk';
import * as soundworks from 'soundworks/server';
import PlayerExperience from './PlayerExperience';
import audioConfig from '../shared/audio-config';

const configName = process.env.ENV || 'default';
const configPath = path.join(__dirname, 'config', configName);
let config = null;

// rely on node `require` for synchronicity
try {
  config = require(configPath).default;
} catch(err) {
  console.error(`Invalid ENV "${configName}", file "${configPath}.js" not found`);
  process.exit(1);
}

// configure express environment ('production' enables cache systems)
process.env.NODE_ENV = config.env;
// initialize application with configuration options
soundworks.server.init(config);

// define parameters shared by different clients
const sharedParams = soundworks.server.require('shared-params');
sharedParams.addText('numPlayers', 'num players', 0, ['conductor']);
sharedParams.addEnum('start-stop', 'start / stop', ['start', 'stop'], 'stop');
sharedParams.addNumber('cross-fade-duration', 'cross-fade duration', 0, 10, 0.01, 1);
sharedParams.addNumber('master-gain', 'master gain', -80, 10, 0.1, 0);
// sharedParams.addNumber('numStreamPerPlayer', 'num stream per player', 0, 100, 1, 1);

soundworks.server.setClientConfigDefinition((clientType, config, httpRequest) => {
  return {
    clientType: clientType,
    env: config.env,
    appName: config.appName,
    websockets: config.websockets,
    version: config.version,
    defaultType: config.defaultClient,
    assetsDomain: config.assetsDomain,
  };
});

console.log(chalk.green('-----------------------------------------'));
console.log(chalk.green('Streamed files:'));
audioConfig.streams.forEach(file => {
  console.log(chalk.yellow(file));
});
console.log(chalk.green('-----------------------------------------'));

const conductor = new soundworks.ControllerExperience('conductor');
const experience = new PlayerExperience('player', audioConfig.streams);

// start application
soundworks.server.start();
