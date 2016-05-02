'use strict';

const Hook = require('../lib/hook');
const PrototypeMapping = require('../lib/prototype-mapping');
const assert = require('assert');
const sinon = require('sinon');

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
                ['foo-bar', 'a-----', 'a-.', 'a-', 'a-\uD83D\uDE31'].forEach((tagName) => {
                    hook.define(tagName);
                });
            });

            it('should throw when trying to define an element with an invalid name', () => {
                ['', 'foo', '1-foo', '-foo'].forEach((tagName) => {
                    assert.throws(() => hook.define(tagName), Error);
                });
            });

        });


        // https://w3c.github.io/webcomponents/spec/custom/#custom-elements-type-extension-example
        describe('type extensions', () => {

            it('should throw when trying to define an extension of a non-native element', () => {
                assert.throws(() => {
                    hook.define('foo-bar', {extends: 'not-an-element'});
                });
            });

            it('should throw when trying to define an extension of a an unknown native element', () => {
                hook.prototypeMapping.get = () => HTMLUnknownElement.prototype;
                assert.throws(() => {
                    hook.define('foo-bar', {extends: 'notanelement'});
                });
            });

            it('should allow to define a type extensions with a valid name', () => {
                hook.prototypeMapping.get = () => HTMLElement.prototype;
                ['foo-bar', 'a-----', 'a-.', 'a-', 'a-\uD83D\uDE31'].forEach((tagName) => {
                    hook.define(tagName, {
                        extends: 'input'
                    });
                });
            });

            it('should throw when trying to define an element with an invalid name', () => {
                hook.prototypeMapping.get = () => HTMLElement.prototype;
                ['', 'foo', '1-foo', '-foo'].forEach((tagName) => {
                    assert.throws(() => hook.define(tagName, { extends: 'input' }), Error);
                });
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
                ['foo-bar', 'a-----', 'a-.', 'a-', 'a-\uD83D\uDE31'].forEach((tagName) => {
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

                ['', '1-foo', '-foo'].forEach((tagName) => {
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

        it ('should notify about adding an observed attribute', () => {
            const spy = sinon.spy();
            hook.define('foo-bar', {
                observedAttributes: ['attr1', 'attr2'],
                attributeChangedCallback: spy
            });
            const node = hook.create('foo-bar');
            node.getAttribute.returns(null);

            hook.setAttribute(node, 'attr2', 'buzz');
            assert.deepEqual(spy.firstCall.args, ['attr2', 'buzz', null]);
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
            assert.deepEqual(spy.secondCall.args, ['attr1', 'two', 'one']);
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
            assert.deepEqual(spy.secondCall.args, ['attr2', null, 'buzz']);
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
            assert.deepEqual(spy.callCount, 0);
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

    });

    // https://w3c.github.io/webcomponents/spec/custom/#upgrades
    describe('upgrade', () => {
        it('should trigger the callbacks for all the observed attributes');

        it('should trigger connected callback if the node is in the document');
        it('should trigger connected callback after the attributes callbacks');

        // This may not be fully conforming but trying our best
        // https://w3c.github.io/webcomponents/spec/custom/#dfn-callback-queue
        it('should trigger trigger the callbacks batched together after gathering all the nodes');
    });

});
