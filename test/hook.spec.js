'use strict';

const Hook = require('../lib/hook');
const PrototypeMapping = require('../lib/prototype-mapping');
const assert = require('assert');
const sinon = require('sinon');

const validCustomTags = ['foo-bar', 'a-----', 'a-.', 'a-', 'a-\uD83D\uDE31'];
const invalidCustomTags = ['', '1-foo', '-foo'];
const invalidNativeTag = 'invalidtag';

require('../dev/dom');

describe('Hook', () => {

    let hook;
    let sandbox;

    before(() => {
        sandbox = sinon.sandbox.create();
    });

    beforeEach(() => {
        hook = new Hook({
            prototypeMapping: new PrototypeMapping()
        });
    });

    describe('define', () => {

        describe('custom tags', () => {

            it('should allow to define a custom elements with a valid name', () => {
                validCustomTags.forEach((tagName) => hook.define(tagName));
            });

            it('should throw when trying to define an element with an invalid name', () => {
                invalidCustomTags.concat([invalidNativeTag]).forEach((tagName) => {
                    assert.throws(() => hook.define(tagName), Error);
                });
            });

            it('should throw when trying to define an element more than once', () => {
                hook.define('foo-bar');
                assert.throws(() => {
                    hook.define('foo-bar');
                }, Error);
            });

        });


        // https://w3c.github.io/webcomponents/spec/custom/#custom-elements-type-extension-example
        describe('type extensions', () => {

            it('should throw when trying to define an extension of a non-native element', () => {
                assert.throws(() => {
                    hook.define('foo-bar', {extends: 'not-an-element'});
                }, Error);
            });

            it('should throw when trying to define an extension of a an unknown native element', () => {
                hook.prototypeMapping.get = () => HTMLUnknownElement.prototype;
                assert.throws(() => {
                    hook.define('foo-bar', {extends: invalidNativeTag });
                }, Error);
            });

            it('should allow to define a type extensions with a valid name', () => {
                hook.prototypeMapping.get = () => HTMLElement.prototype;
                validCustomTags.forEach((tagName) => {
                    hook.define(tagName, {
                        extends: 'input'
                    });
                });
            });

            it('should throw when trying to define an element with an invalid name', () => {
                hook.prototypeMapping.get = () => HTMLElement.prototype;
                invalidCustomTags.concat([invalidNativeTag]).forEach((tagName) => {
                    assert.throws(() => hook.define(tagName, { extends: 'input' }), Error);
                });
            });

        });

        describe('lifecycle callbacks', () => {

            it('should throw if the callback is not a function', () => {
                const options = {
                    'connectedCallback' : '',
                    'disconnectedCallback' : () => {}
                };

                assert.throws(() => {
                    hook.define('foo-bar', options);
                }, Error);
            });

        });

    });

    describe('create', () => {
        beforeEach(() => {
            sandbox.stub(global, 'document', {
                createElement: sandbox.stub()
            });
        });

        afterEach(() => {
            sandbox.restore();
        });

        describe('custom tags', () => {

            it('should just call document.createElement when it is not a custom element', () => {
                const createdElement = {};
                document.createElement.returns(createdElement);
                assert.strictEqual(hook.create('div'), createdElement);
            });

            it('should allow to create a custom elements with a valid name', () => {
                validCustomTags.forEach((tagName) => {
                    hook.create(tagName);
                });
            });

            it('should throw when called with an invalid name', () => {
                // This is not a very useful test but it's still there to show that
                // it is a responsibility of document.createElement to throw
                // and that Hook should propagate the error.
                function DOMException() {}
                DOMException.prototype = Object.create(Error);
                document.createElement.throws(new DOMException);

                invalidCustomTags.forEach((tagName) => {
                    assert.throws(() => hook.create(tagName), DOMException);
                });
            });

        });

        describe('attributes', () => {

            it('should allow to pass a map of attributes as a second argument', () => {
                const createdElement = {
                    setAttribute: sinon.spy()
                };
                document.createElement.returns(createdElement);
                assert.strictEqual(hook.create('a', {
                    class: 'foo',
                    href: 'https://tech.zalando.com',
                    title: 'Zalando'
                }), createdElement);
                assert.strictEqual(createdElement.setAttribute.callCount, 3);
            });

            it('should add `is` attribute as any other', () => {
                const createdElement = {
                    setAttribute: sinon.spy()
                };
                document.createElement.returns(createdElement);
                assert.strictEqual(hook.create('button', { is: 'foo-button' }), createdElement);
                assert.strictEqual(createdElement.setAttribute.callCount, 1);
            });

            it('should allow invalid values for `is` attribute', () => {
                const createdElement = {
                    setAttribute: sinon.spy()
                };
                document.createElement.returns(createdElement);
                assert.strictEqual(hook.create('button', { is: '---button' }), createdElement);
            });

        });
    });

    describe('attribute handling', () => {
        beforeEach(() => {
            sandbox.stub(global, 'document', {
                createElement: sandbox.spy(function (name) {
                    return {
                        hasAttribute: sinon.stub(),
                        getAttribute: sinon.stub(),
                        setAttribute: sinon.spy(),
                        removeAttribute: sinon.spy(),
                        tagName: name.toUpperCase()
                    };
                })
            });
        });

        afterEach(() => {
            sandbox.restore();
        });

        it ('should throw if `observedAttributes` is not an array', () => {
            assert.throws(() => hook.define('foo-bar', { observedAttributes: true }), Error);
            assert.throws(() => hook.define('foo-bar', { observedAttributes: false }), Error);
            assert.throws(() => hook.define('foo-bar', { observedAttributes: null }), Error);
            assert.throws(() => hook.define('foo-bar', { observedAttributes: {} }), Error);

            // The standard actually expects a static function, but we can allow
            // such usage later. For now static will allow better performance.
            assert.throws(() => hook.define('foo-bar', { observedAttributes: function () {} }), Error);
        });

        it ('should call attributeChangedCallback with element as `this`', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', {
                observedAttributes: ['foo'],
                attributeChangedCallback: spy
            });
            const node = hook.create('foo-bar');
            hook.setAttribute(node, 'foo', 'buzz');
            assert.strictEqual(spy.firstCall.thisValue, node);
        });

        it ('should notify about adding an observed attribute', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', {
                observedAttributes: ['attr1', 'attr2'],
                attributeChangedCallback: spy
            });
            const node = hook.create('foo-bar');
            node.getAttribute.returns(null);

            hook.setAttribute(node, 'attr2', 'buzz');
            assert.deepEqual(spy.firstCall.args, ['attr2', null, 'buzz']);
            assert.deepEqual(node.setAttribute.firstCall.args, ['attr2', 'buzz']);
        });

        it ('should notify about changing an observed attribute', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', {
                observedAttributes: ['attr1', 'attr2'],
                attributeChangedCallback: spy
            });
            const node = hook.create('foo-bar');
            node.getAttribute.returns(null);

            hook.setAttribute(node, 'attr1', 'one');
            node.getAttribute.returns('one');

            hook.setAttribute(node, 'attr1', 'two');
            assert.deepEqual(spy.secondCall.args, ['attr1', 'one', 'two']);
        });

        it ('should notify about removing an observed attribute', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', {
                observedAttributes: ['attr1', 'attr2'],
                attributeChangedCallback: spy
            });
            const node = hook.create('foo-bar');
            node.getAttribute.returns(null);

            hook.setAttribute(node, 'attr2', 'buzz');
            node.getAttribute.returns('buzz');

            hook.removeAttribute(node, 'attr2');
            assert.deepEqual(spy.secondCall.args, ['attr2', 'buzz', null]);
            assert.deepEqual(node.removeAttribute.firstCall.args, ['attr2']);
        });

        it ('should ignore non-observed attributes', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', {
                observedAttributes: ['attr1', 'attr2'],
                attributeChangedCallback: spy
            });
            const node = hook.create('foo-bar');
            node.getAttribute.returns(null);

            hook.setAttribute(node, 'class', 'buzz');
            assert.strictEqual(spy.callCount, 0);
        });

        it ('should have `getAttribute` method for interface completeness', () => {
            hook.define('foo-bar');
            const node = hook.create('foo-bar');
            node.setAttribute('class', 'buzz');
            node.getAttribute.returns('buzz');
            assert.strictEqual(hook.getAttribute(node, 'class'), 'buzz');
        });

        it ('should have `hasAttribute` method for interface completeness', () => {
            hook.define('foo-bar');
            const node = hook.create('foo-bar');
            node.hasAttribute.returns(true);
            assert.strictEqual(hook.hasAttribute(node, 'class'), true);
        });

        it ('should allow manual notification about attribute changes', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', {
                observedAttributes: ['attr1', 'attr2'],
                attributeChangedCallback: spy
            });
            const node = hook.create('foo-bar');
            hook.forceNotifyAttributeChange(
                hook.getDescriptor(node), node, 'attr2', null, 'buzz'
            );
            assert.deepEqual(spy.firstCall.args, ['attr2', null, 'buzz']);
        });

        it ('should ugnore unobserved attributes during manual notification', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', {
                observedAttributes: ['attr1', 'attr2'],
                attributeChangedCallback: spy
            });
            const node = hook.create('foo-bar');
            hook.forceNotifyAttributeChange(
                hook.getDescriptor(node), node, 'data-foo', null, 'buzz'
            );
            assert.deepEqual(spy.callCount, 0);
        });

    });

    // https://w3c.github.io/webcomponents/spec/custom/#upgrades
    describe('connect', () => {
        beforeEach(() => {
            sandbox.stub(global, 'document', {
                createElement: sandbox.spy(function (name) {
                    return {
                        hasAttribute: sinon.stub(),
                        getAttribute: sinon.stub(),
                        setAttribute: sinon.spy(),
                        removeAttribute: sinon.spy(),
                        querySelectorAll: sinon.stub().returns([]),
                        tagName: name.toUpperCase()
                    };
                })
            });
        });

        afterEach(() => {
            sandbox.restore();
        });

        it('should not do any attribute callbacks if the node is detached', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', {
                observedAttributes: ['attr1', 'attr2'],
                attributeChangedCallback: spy
            });
            const node = hook.create('foo-bar', {
                'attr1': 'buzz'
            });
            hook.connect(node);
            assert.strictEqual(spy.callCount, 0);
        });

        it('should trigger the callbacks for all the observed attributes', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', {
                observedAttributes: ['attr1', 'attr2'],
                attributeChangedCallback: spy
            });
            const node = hook.create('foo-bar', {
                'attr1': 'buzz',
                'attr2': 'buzz'
            });
            node.getAttribute.returns('buzz');
            node.parentNode = document;

            hook.connect(node);
            assert.deepEqual(spy.firstCall.args, ['attr1', null, 'buzz']);
            assert.deepEqual(spy.secondCall.args, ['attr2', null, 'buzz']);
        });

        it('should trigger connected callback if the node is in the document', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', {
                connectedCallback: spy
            });
            const node = hook.create('foo-bar');
            node.parentNode = document;

            hook.connect(node);
            assert.deepEqual(spy.callCount, 1);
        });

        it('should work for type extensions', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', {
                extends: 'button',
                connectedCallback: spy
            });
            const node = hook.create('button', { is: 'foo-bar' });
            node.getAttribute.returns('foo-bar');
            node.parentNode = document;

            hook.connect(node);
            assert.deepEqual(spy.callCount, 1);
        });

        it('should connect nested nodes', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', { connectedCallback: spy });
            hook.define('foo-buzz', { connectedCallback: spy });

            const node = hook.create('foo-bar');
            node.parentNode = document;

            const customChild = hook.create('foo-buzz');
            const regularChild = hook.create('div');

            node.querySelectorAll.returns(
                { 0: regularChild, 1: customChild, length: 2 } // emulating NodeList
            );

            hook.connect(node);
            assert.deepEqual(spy.callCount, 2);
        });
    });


    describe('add / remove children', () => {
        beforeEach(() => {
            sandbox.stub(global, 'document', {
                createElement: sandbox.spy(function (name) {
                    return {
                        hasAttribute: sinon.stub(),
                        getAttribute: sinon.stub(),
                        setAttribute: sinon.spy(),
                        removeAttribute: sinon.spy(),
                        querySelectorAll: sinon.stub().returns([]),
                        tagName: name.toUpperCase()
                    };
                })
            });
            document.appendChild = sinon.stub();
            document.removeChild = sinon.stub();
        });

        afterEach(() => {
            sandbox.restore();
        });

        it('should notify when the node is disconnected from the DOM', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', { disconnectedCallback: spy });
            const node = hook.create('foo-bar');
            node.parentNode = document;
            hook.remove(node);

            assert.deepEqual(spy.callCount, 1);
        });

        it('should not notify when the detached node is disconnected from the DOM', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', { disconnectedCallback: spy });
            hook.define('foo-buzz', { disconnectedCallback: spy });

            const node = hook.create('foo-bar');
            node.removeChild = sinon.spy();

            const customChild = hook.create('foo-buzz');
            customChild.parentNode = node;

            hook.remove(customChild);
            assert.deepEqual(spy.callCount, 0);
            assert(node.removeChild.callCount, 1);
        });

        it('should be able to notify disconnecting nested nodes', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', { disconnectedCallback: spy });
            hook.define('foo-buzz', { disconnectedCallback: spy });

            const node = hook.create('foo-bar');
            node.parentNode = document;

            const customChild = hook.create('foo-buzz');
            const regularChild = hook.create('div');

            node.querySelectorAll.returns(
                { 0: regularChild, 1: customChild, length: 2 } // emulating NodeList
            );

            hook.remove(node);
            assert.deepEqual(spy.callCount, 2);
        });

        it('should auto call `connect` when the nodes is appended to the DOM', () => {
            hook.define('foo-bar');
            hook.connect = sinon.spy();

            const node = hook.create('foo-bar');
            node.appendChild = sinon.spy();
            const customChild = hook.create('foo-buzz');

            hook.appendChild(node, customChild);
            assert.deepEqual(node.appendChild.callCount, 1);
            assert.deepEqual(hook.connect.callCount, 1);
            assert.deepEqual(hook.connect.firstCall.args[0], customChild);
        });

        it('should auto call `connect` when the nodes is inserted into the DOM', () => {
            hook.define('foo-bar');
            hook.connect = sinon.spy();

            const node = hook.create('foo-bar');
            node.insertBefore = sinon.spy();
            const customChild = hook.create('foo-buzz');

            hook.insertBefore(node, customChild, node.firstChild);
            assert.deepEqual(node.insertBefore.callCount, 1);
            assert.deepEqual(hook.connect.callCount, 1);
            assert.deepEqual(hook.connect.firstCall.args[0], customChild);
        });
    });

    describe('misc', () => {
        it('should construct correct query for all custom elements', () => {
            hook.define('foo-bar');
            assert.strictEqual(hook.query, 'foo-bar');
            hook.define('foo-is', { extends: 'button' });
            assert.strictEqual(hook.query, 'foo-bar,[is="foo-is"]');
            hook.define('foo-buzz');
            assert.strictEqual(hook.query, 'foo-bar,[is="foo-is"],foo-buzz');
        });
    });

});
