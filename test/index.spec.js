'use strict';

const Registry = require('../lib/hook');
const mendeleev = require('../lib/index');
const assert = require('assert');

describe('mendeleev', () => {
    it('should be an instance of Hook', () => {
        assert(mendeleev instanceof Registry);
    });
});
