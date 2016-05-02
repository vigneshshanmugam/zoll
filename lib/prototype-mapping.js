'use strict';


function PrototypeMapping() {
    this.cache = Object.create(null);
}

PrototypeMapping.prototype.get = function (name) {
    if (!(name in this.cache)) {
        this.cache[name] = document.createElement(name).constructor.prototype;
    }
    return this.cache[name];
};

PrototypeMapping.prototype.add = function (name, prototype) {
    this.cache[name] = prototype;
};

module.exports = PrototypeMapping;
