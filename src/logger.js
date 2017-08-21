/* eslint-disable no-console */
export default class Logger {
    constructor(enableDebug) {
        this.debugEnabled = enableDebug || false;
    }

    info() {
        if (this.debugEnabled) {
            console.info.apply(console, Array.prototype.slice.call(arguments));
        }
    }

    debug() {
        if (this.debugEnabled) {
            console.debug.apply(console, Array.prototype.slice.call(arguments));
        }
    }

    error() {
        if (this.debugEnabled) {
            console.error.apply(console, Array.prototype.slice.call(arguments));
        }
    }
}
