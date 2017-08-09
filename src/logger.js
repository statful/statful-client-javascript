/* eslint-disable no-console */

'use strict';

function Logger(enableDebug) {
    this.debugEnabled = enableDebug || false;
}

Logger.prototype.info = function () {
    if (this.debugEnabled) {
        var args = Array.prototype.slice.call(arguments);
        console.info.apply(console, args);
    }
};

Logger.prototype.debug = function () {
    if (this.debugEnabled) {
        var args = Array.prototype.slice.call(arguments);
        console.debug.apply(console, args);
    }
};

Logger.prototype.error = function () {
    if (this.debugEnabled) {
        var args = Array.prototype.slice.call(arguments);
        console.error.apply(console, args);
    }
};

export default Logger;
