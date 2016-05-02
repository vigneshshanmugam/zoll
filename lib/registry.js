'use strict';

// Based on Custom Element Spec
// https://w3c.github.io/webcomponents/spec/custom/#prod-PotentialCustomElementName
var PCENChar = ('(' +
'[' +
'-' + '.' + '0-9' + 'a-z' + '\xb7' + '\xc0-\xd6' + '\xd8-\xf6' +
'\xf8-\u02ff' + '\u0300-\u037d' + '\u037F-\u1FFF' + '\u200C-\u200D' +
'\u203F-\u2040' + '\u2070-\u218F' + '\u2C00-\u2FEF' + '\u3001-\uD7FF' +
'\uF900-\uFDCF' + '\uFDF0-\uFFFD' +
']|' +
// Because of the surrogate pairs this had to be altered from
// '\u{10000}-\u{EFFFF}'
'[\uD800-\uDB7F][\uDC00-\uDFFF]' +
')');
var nameValidator = new RegExp(
    '[a-z]' + (PCENChar + '*') + '-' + (PCENChar + '*')
);

function isProbablyNativeElementTagName(tagName) {
    tagName = String(tagName);
    return tagName && tagName.indexOf('-') === -1;
}

function defineExtends(options) {
    if (!isProbablyNativeElementTagName(options.extends)) {
        throw new Error('Type extensions for non-native elements are not allowed');
    }
    var extendsPrototype = this.prototypeMapping.get(options.extends);
    if (extendsPrototype === HTMLUnknownElement.prototype) {
        throw new Error('Type extensions for unknown elements are not allowed');
    }
}

function validateCustomTagName(tagName) {
    if (!tagName || !nameValidator.test(tagName)) {
        throw new Error('The custom element type name ' + tagName + ' is invalid');
    }
}

function Registry(options) {
    this.prototypeMapping = options.prototypeMapping;
}

Registry.prototype.define = function (tagName, options) {
    options = options || {};
    validateCustomTagName(tagName);
    if (options.extends) {
        defineExtends.call(this, options);
    }
};

Registry.prototype.create = function (tagName, attributes) {
    var el = document.createElement(tagName);
    if (typeof attributes === 'object') {
        for (var attr in attributes) {
            if (attributes.hasOwnProperty(attr)) {
                el.setAttribute(attr, attributes[attr]);
            }
        }
    }
    return el;
};

module.exports = Registry;
