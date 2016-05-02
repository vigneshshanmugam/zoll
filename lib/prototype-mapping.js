'use strict';

var prototypeCache;

exports.reset = function () {
    prototypeCache = Object.create(null);
};
exports.reset();

exports.get = function (name) {
    if (!(name in prototypeCache)) {
        prototypeCache[name] = document.createElement(name).constructor.prototype;
    }
    return prototypeCache[name];
};

exports.add = function (name, prototype) {
    prototypeCache[name] = prototype;
};
