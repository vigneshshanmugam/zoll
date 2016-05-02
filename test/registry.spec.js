'use strict';

const Registry = require('../lib/registry');
const PrototypeMapping = require('../lib/prototype-mapping');
const assert = require('assert');
const sinon = require('sinon');

require('../dev/dom');

describe('Registry', () => {

    let registry;
    let sandbox;

    before(() => {
        sandbox = sinon.sandbox.create();
    });

    beforeEach(() => {
        registry = new Registry({
            prototypeMapping: new PrototypeMapping()
        });
    });

    describe('define', () => {

        describe('custom tags', () => {

            it('should allow to define a custom elements with a valid name', () => {
                ['foo-bar', 'a-----', 'a-.', 'a-', 'a-\uD83D\uDE31'].forEach((tagName) => {
                    registry.define(tagName);
                });
            });

            it('should throw when trying to define an element with an invalid name', () => {
                ['', 'foo', '1-foo', '-foo'].forEach((tagName) => {
                    assert.throws(() => registry.define(tagName), Error);
                });
            });

        });


        // https://w3c.github.io/webcomponents/spec/custom/#custom-elements-type-extension-example
        describe('type extensions', () => {

            it('should throw when trying to define an extension of a non-native element', () => {
                assert.throws(() => {
                    registry.define('foo-bar', {extends: 'not-an-element'});
                });
            });

            it('should throw when trying to define an extension of a an unknown native element', () => {
                registry.prototypeMapping.get = () => HTMLUnknownElement.prototype;
                assert.throws(() => {
                    registry.define('foo-bar', {extends: 'notanelement'});
                });
            });

            it('should allow to define a type extensions with a valid name', () => {
                registry.prototypeMapping.get = () => HTMLElement.prototype;
                ['foo-bar', 'a-----', 'a-.', 'a-', 'a-\uD83D\uDE31'].forEach((tagName) => {
                    registry.define(tagName, {
                        extends: 'input'
                    });
                });
            });

            it('should throw when trying to define an element with an invalid name', () => {
                registry.prototypeMapping.get = () => HTMLElement.prototype;
                ['', 'foo', '1-foo', '-foo'].forEach((tagName) => {
                    assert.throws(() => registry.define(tagName, { extends: 'input' }), Error);
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

        describe('custom tags', () => {

            it('should just call document.createElement when it is not a custom element', () => {
                const createdElement = {};
                document.createElement.returns(createdElement);
                assert.strictEqual(registry.create('div'), createdElement);
            });

            it('should allow to create a custom elements with a valid name', () => {
                ['foo-bar', 'a-----', 'a-.', 'a-', 'a-\uD83D\uDE31'].forEach((tagName) => {
                    registry.create(tagName);
                });
            });

            it('should throw when called with an invalid name', () => {
                // This is not a very useful test but it's still there to show that
                // it is a responsibility of document.createElement to throw
                // and that Registry should propagate the error.
                function DOMException() {}
                DOMException.prototype = Object.create(Error);
                document.createElement.throws(new DOMException);

                ['', '1-foo', '-foo'].forEach((tagName) => {
                    assert.throws(() => registry.create(tagName), DOMException);
                });
            });

        });

        describe('attributes', () => {

            it('should allow to pass a map of attributes as a second argument', () => {
                const createdElement = {
                    setAttribute: sinon.spy()
                };
                document.createElement.returns(createdElement);
                assert.strictEqual(registry.create('a', {
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
                assert.strictEqual(registry.create('button', { is: 'foo-button' }), createdElement);
                assert.strictEqual(createdElement.setAttribute.callCount, 1);
            });

            it('should allow invalid values for `is` attribute', () => {
                const createdElement = {
                    setAttribute: sinon.spy()
                };
                document.createElement.returns(createdElement);
                assert.strictEqual(registry.create('button', { is: '---button' }), createdElement);
            });

        });

        afterEach(() => {
            sandbox.restore();
        });
    });

});
