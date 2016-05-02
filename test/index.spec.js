'use strict';

const mendeleev = require('../lib/index');
const assert = require('assert');

describe('mendeleev', () => {


    it('should allow to define a custom elements with a valid name', () => {
        ['foo-bar', 'a-----', 'a-.', 'a-', 'a-\uD83D\uDE31'].forEach((tagName) => {
            mendeleev.define(tagName);
        });
    });

    it('should throw when trying to define an element with an invalid name', () => {
        ['', 'foo', '1-foo', '-foo'].forEach((tagName) => {
            assert.throws(() => mendeleev.define(tagName), Error);
        });
    });

});
