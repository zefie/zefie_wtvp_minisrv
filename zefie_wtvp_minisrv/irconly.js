'use strict';
const path = require('path');
const classPath = path.resolve(__dirname + path.sep + "includes" + path.sep + "classes" + path.sep) + path.sep;
require(classPath + "Prototypes.js");
const WTVIRC = require(classPath + "WTVIRC.js");
const { WTVShared, clientShowAlert } = require(classPath + "WTVShared.js");
const wtvshared = new WTVShared(); // creates minisrv_config

const minisrv_config = wtvshared.readMiniSrvConfig(true, false, true);
minisrv_config.version = require('./package.json').version;
const ircServer = new WTVIRC(minisrv_config, '0.0.0.0', minisrv_config.config.irc.port, true);
ircServer.start();