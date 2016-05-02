'use strict';

const Mapping = require('../lib/prototype-mapping');
const assert = require('assert');
const sinon = require('sinon');

require('../dev/dom');

describe('Prototype Mapping', () => {
    let sandbox;
    let mapping;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    beforeEach(() => {
        mapping = new Mapping();
        sandbox.stub(global, 'document', {
            createElement: sandbox.stub()
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should use document.createElement to figure out prototypes', () => {
        function HTMLInputElement() {}
        document.createElement.returns(new HTMLInputElement());
        const proto = mapping.get('input');
        assert.strictEqual(document.createElement.callCount, 1);
        assert.strictEqual(proto, HTMLInputElement.prototype);
    });

    it('should cache prototypes to avoid extra document.createElement calls', () => {
        function HTMLInputElement() {}
        document.createElement.returns(new HTMLInputElement());
        mapping.get('input');
        const proto = mapping.get('input');
        assert.strictEqual(document.createElement.callCount, 1);
        assert.strictEqual(proto, HTMLInputElement.prototype);
    });

    it('should be possible to manually add prototypes for later lookup', () => {
        function HTMLInputElement() {}
        mapping.add('input', HTMLInputElement.prototype);
        const proto = mapping.get('input');
        assert.strictEqual(document.createElement.callCount, 0);
        assert.strictEqual(proto, HTMLInputElement.prototype);
    });

});
