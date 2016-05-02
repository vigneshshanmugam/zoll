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

function validateExtends(options) {
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

/**
 * @param {object} options
 * @constructor
 */
function Hook(options) {
    this.prototypeMapping = options.prototypeMapping;
    this.registry = Object.create(null);
}

/**
 * Defines a new custom element with the specified
 * tag name and options.
 * @param {string} tagName
 * @param {object} options
 */
Hook.prototype.define = function (tagName, options) {
    var descriptor = {};
    options = options || {};
    validateCustomTagName(tagName);
    if ('extends' in options) {
        validateExtends.call(this, options);
        descriptor.extends = options.extends;
    }
    var observedAttributeMap = Object.create(null);
    if ('observedAttributes' in options) {
        if (!Array.isArray(options.observedAttributes)) {
            throw new Error('It is only allowed to observe static array of attributes');
        }
        // There is no point in observing anything if there is noo ne to listen to it
        if (typeof options.attributeChangedCallback === 'function') {
            descriptor.attributeChangedCallback = options.attributeChangedCallback;
            options.observedAttributes.forEach(function (attribute) {
                observedAttributeMap[attribute] = true;
            });
        }
    }
    descriptor.observedAttributeMap = observedAttributeMap;
    this.registry[tagName.toUpperCase()] = descriptor;
};

/**
 * A simple wrapper around document.createElement
 * that can also set attributes in a batch without
 * notifying the possible observers.
 *
 * @param {string} tagName
 * @param {object=} attributes
 * @throws DOMException
 * @returns {Element}
 */
Hook.prototype.create = function (tagName, attributes) {
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

/**
 * A proxy for native `setAttribute` that takes care
 * of the observed attribute notifications
 * @param {Element} node
 * @param {string} attributeName
 * @param {*} attributeValue
 */
Hook.prototype.setAttribute = function (node, attributeName, attributeValue) {
    var descriptor = this.registry[node.tagName];
    var oldValue;
    if (descriptor !== undefined && descriptor.observedAttributeMap[attributeName]) {
        oldValue = node.getAttribute(attributeName);
        node.setAttribute(attributeName, attributeValue);
        descriptor.attributeChangedCallback(attributeName, attributeValue, oldValue);
    } else {
        node.setAttribute(attributeName, attributeValue);
    }
};

/**
 * A proxy for native `removeAttribute` that takes care
 * of the observed attribute notifications
 * @param {Element} node
 * @param {string} attributeName
 */
Hook.prototype.removeAttribute = function (node, attributeName) {
    var descriptor = this.registry[node.tagName];
    var oldValue;
    if (descriptor !== undefined && descriptor.observedAttributeMap[attributeName]) {
        oldValue = node.getAttribute(attributeName);
        node.removeAttribute(attributeName);
        descriptor.attributeChangedCallback(attributeName, null, oldValue);
    } else {
        node.removeAttribute(attributeName);
    }
};

/**
 * A proxy for native `getAttribute`
 * @param {Element} node
 * @param {string} attributeName
 * @returns {string|null}
 */
Hook.prototype.getAttribute = function (node, attributeName) {
    return node.getAttribute(attributeName);
};

/**
 * A proxy for native `hasAttribute`
 * @param {Element} node
 * @param {string} attributeName
 * @returns {boolean}
 */
Hook.prototype.hasAttribute = function (node, attributeName) {
    return node.hasAttribute(attributeName);
};

module.exports = Hook;
