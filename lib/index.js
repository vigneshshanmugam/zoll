'use strict';

var Registry = require('./registry');
var PrototypeMapping = require('./prototype-mapping');

module.exports = new Registry({
    prototypeMapping: new PrototypeMapping()
});
