'use strict';

// This provides minimal environment required by the library
// when running tests in node

if(typeof HTMLUnknownElement === 'undefined') {
    global.HTMLUnknownElement = function () {};
}

if(typeof HTMLElement === 'undefined') {
    global.HTMLElement = function () {};
}

if(typeof document === 'undefined') {
    global.document = {
        createElement: function () {
            return new HTMLElement();
        }
    };
}
