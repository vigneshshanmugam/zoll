'use strict';

var Hook = require('./hook');
var PrototypeMapping = require('./prototype-mapping');

module.exports = new Hook({
    prototypeMapping: new PrototypeMapping()
});
