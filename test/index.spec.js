'use strict';

const Registry = require('../lib/registry');
const mendeleev = require('../lib/index');
const assert = require('assert');

describe('mendeleev', () => {
    it('should be an instance of Registry', () => {
        assert(mendeleev instanceof Registry);
    });
});
