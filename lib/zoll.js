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
    var ele = document.createElement(options.extends);
    if (!isProbablyNativeElementTagName(options.extends)) {
        throw new Error('Type extensions for non-native elements are not allowed');
    }

    if (ele.prototype === HTMLUnknownElement.prototype) {
        throw new Error('Type extensions for unknown elements are not allowed');
    }
}

function validateCustomTagName(tagName) {
    if (!tagName || !nameValidator.test(tagName)) {
        throw new Error('The custom element type name ' + tagName + ' is invalid');
    }
}

function isDetached(node) {
    do {
        node = node.parentNode;
    } while (node && node !== document);

    return !node;
}

function checkCallback(obj) {
    if (obj !== undefined && typeof obj !== 'function') {
        throw new Error('lifecycle callbacks should be defined as function');
    }
}

function validateLifecycleCallbacks(options) {
    checkCallback(options.attributeChangedCallback);
    checkCallback(options.connectedCallback);
    checkCallback(options.disconnectedCallback);
}

/**
 * @param {object} options
 * @constructor
 */
function Zoll() {
    this.registry = Object.create(null);
    this.query = '';
}

/**
 * Defines a new custom element with the specified
 * tag name and options.
 * @param {string} tagName
 * @param {object} options
 */
Zoll.prototype.define = function (tagName, options) {
    var descriptor = {};
    var selector = tagName;

    if (typeof this.registry[tagName.toUpperCase()] === 'object') {
        throw new Error('The custom element type ' + tagName + ' is already defined');
    }
    options = options || {};
    validateCustomTagName(tagName);
    validateLifecycleCallbacks(options);

    if ('extends' in options) {
        validateExtends.call(this, options);
        descriptor.extends = options.extends;
        selector = '[is="' + tagName + '"]';
    }

    var observedAttributeMap = Object.create(null);
    if ('observedAttributes' in options) {
        if (!Array.isArray(options.observedAttributes)) {
            throw new Error('It is only allowed to observe static array of attributes');
        }
        // There is no need in observing anything if there is no one to listen to it
        if (options.attributeChangedCallback) {
            options.observedAttributes.forEach(function (attribute) {
                observedAttributeMap[attribute] = true;
            });
        }
    }
    descriptor.observedAttributeMap = observedAttributeMap;
    descriptor.connectedCallback = options.connectedCallback;
    descriptor.disconnectedCallback = options.disconnectedCallback;
    descriptor.attributeChangedCallback = options.attributeChangedCallback;
    this.registry[tagName.toUpperCase()] = descriptor;

    if (this.query) {
        this.query += ',';
    }
    this.query += selector;
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
Zoll.prototype.create = function (tagName, attributes) {
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
Zoll.prototype.setAttribute = function (node, attributeName, attributeValue) {
    var descriptor = this.getDescriptor(node);
    var oldValue;

    if (isDetached(node)) {
        return;
    }

    if (descriptor !== undefined && descriptor.observedAttributeMap[attributeName]) {
        oldValue = node.getAttribute(attributeName);
        node.setAttribute(attributeName, attributeValue);
        descriptor.attributeChangedCallback.call(node, attributeName, oldValue, attributeValue);
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
Zoll.prototype.removeAttribute = function (node, attributeName) {
    var descriptor = this.getDescriptor(node);
    var oldValue;

    if (isDetached(node)) {
        return;
    }

    if (descriptor !== undefined && descriptor.observedAttributeMap[attributeName]) {
        oldValue = node.getAttribute(attributeName);
        node.removeAttribute(attributeName);
        descriptor.attributeChangedCallback.call(node, attributeName, oldValue, null);
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
Zoll.prototype.getAttribute = function (node, attributeName) {
    return node.getAttribute(attributeName);
};

/**
 * A proxy for native `hasAttribute`
 * @param {Element} node
 * @param {string} attributeName
 * @returns {boolean}
 */
Zoll.prototype.hasAttribute = function (node, attributeName) {
    return node.hasAttribute(attributeName);
};

/**
 * Simulates the connect process for custom elements, in the
 * given subtree, calling defined lifecycle callbacks.
 *
 * WARNING: There is no guard against calling it multiple
 * times, as this is an unlikely scenario for a library
 * that would use this and implementing such a guard
 * would be quite expensive.
 *
 * @param {Element} root
 */
Zoll.prototype.connect = function (root) {
    if (isDetached(root)) {
        return;
    }

    this.forceConnectNode(root);
    this.forceConnectChildren(root);
};

/**
 * A proxy for native `appendChild` that will notify
 * about nodes connected to the document
 * @param {Node} parent
 * @param {Element} child
 */
Zoll.prototype.appendChild = function (parent, child) {
    parent.appendChild(child);
    this.connect(child);
};

/**
 * A proxy for native `insertBefore` that will notify
 * about nodes connected to the document
 * @param {Node} parent
 * @param {Element} child
 */
Zoll.prototype.insertBefore = function (parent, child, reference) {
    parent.insertBefore(child, reference);
    this.connect(child);
};

/**
 * Removes the node from it's parent if one exists
 * @param {Element} el
 */
Zoll.prototype.remove = function (el) {
    if (!el.parentNode) {
        return;
    }

    var wasDetached = isDetached(el);
    el.parentNode.removeChild(el);

    if (wasDetached) {
        return;
    }
    this.forceDisconnectNode(el);
    this.forceDisconnectChildren(el);
};

/**
 * Allows to manually notify when the element's children is removed in document.
 *
 * @param {Element} el
 */
Zoll.prototype.forceDisconnectChildren = function (el) {
    var customChildren = el.querySelectorAll(this.query);
    for (var i = 0, length = customChildren.length; i < length; ++i) {
        this.forceDisconnectNode(customChildren[i]);
    }
};

/**
 * Allows to manually notify when the element is removed in document.
 *
 * @param {Element} el
 */
Zoll.prototype.forceDisconnectNode = function (el) {
    var descriptor = this.getDescriptor(el);
    if (descriptor !== undefined && descriptor.disconnectedCallback) {
        descriptor.disconnectedCallback.call(el);
    }
};

/**
 * Allows to manually notify when the element's children is inserted in document.
 *
 * @param {Element} el
 */
Zoll.prototype.forceConnectChildren = function (el) {
    var customChildren = el.querySelectorAll(this.query);
    for (var i = 0, length = customChildren.length; i < length; ++i) {
        this.forceConnectNode(customChildren[i]);
    }
};

/**
 * Allows to manually notify when the element is inserted in document.
 *
 * @param {Element} el
 */
Zoll.prototype.forceConnectNode = function (el) {
    var descriptor = this.getDescriptor(el);
    if (descriptor === undefined) {
        return;
    }
    if (descriptor.attributeChangedCallback) {
        for (var attributeName in descriptor.observedAttributeMap) {
            // We can get way here not checking hasOwnProperty
            // because our map has no prototype
            var attributeValue = el.getAttribute(attributeName);
            if (attributeValue !== null) {
                descriptor.attributeChangedCallback.call(el, attributeName, null, attributeValue);
            }
        }
    }
    if (descriptor.connectedCallback) {
        descriptor.connectedCallback.call(el);
    }
};

/**
 * Allows to manually notify an element about the attribute change.
 *
 * This is useful for some libraries that manipulate DOM
 * under you, like React.
 *
 * @param {object} descriptor
 * @param {Element} el
 * @param {string} attributeName
 * @param {string|null} oldValue
 * @param {string|null} attributeValue
 */
Zoll.prototype.forceNotifyAttributeChange = function (descriptor, el, attributeName, oldValue, attributeValue) {
    if (descriptor.attributeChangedCallback && (attributeName in descriptor.observedAttributeMap)) {
        descriptor.attributeChangedCallback.call(el, attributeName, oldValue, attributeValue);
    }
};

/**
* Retrives the custom element from the registry if defined.
* @param {Node} node
**/
Zoll.prototype.getDescriptor = function (node) {
    var descriptor = this.registry[node.tagName];
    if (!descriptor) {
        var is = node.getAttribute('is');
        if (is) {
            descriptor = this.registry[is.toUpperCase()];
        }
    }
    return descriptor;
};

module.exports = Zoll;
