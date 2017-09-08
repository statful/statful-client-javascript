/**
* statful-client-javascript 2.0.3
* Copyright 2017 Statful <https://www.statful.com/>
*/

var statful = (function () {
'use strict';

/* eslint-env browser,amd,node */
//
// usertiming.js
//
// A polyfill for UserTiming (http://www.w3.org/TR/user-timing/)
//
// Copyright 2013 Nic Jansma
// http://nicj.net
//
// https://github.com/nicjansma/usertiming.js
//
// Licensed under the MIT license
//
(function (window) {
    "use strict";

    // allow running in Node.js environment

    if (typeof window === "undefined") {
        window = {};
    }

    // prepare base perf object
    if (typeof window.performance === "undefined") {
        window.performance = {};
    }

    // We need to keep a global reference to the window.performance object to
    // prevent any added properties from being garbage-collected in Safari 8.
    // https://bugs.webkit.org/show_bug.cgi?id=137407
    window._perfRefForUserTimingPolyfill = window.performance;

    //
    // Note what we shimmed
    //
    window.performance.userTimingJsNow = false;
    window.performance.userTimingJsNowPrefixed = false;
    window.performance.userTimingJsUserTiming = false;
    window.performance.userTimingJsUserTimingPrefixed = false;
    window.performance.userTimingJsPerformanceTimeline = false;
    window.performance.userTimingJsPerformanceTimelinePrefixed = false;

    // for prefixed support
    var prefixes = [];
    var methods = [];
    var methodTest = null;
    var i, j;

    //
    // window.performance.now() shim
    //  http://www.w3.org/TR/hr-time/
    //
    if (typeof window.performance.now !== "function") {
        window.performance.userTimingJsNow = true;

        // copy prefixed version over if it exists
        methods = ["webkitNow", "msNow", "mozNow"];

        for (i = 0; i < methods.length; i++) {
            if (typeof window.performance[methods[i]] === "function") {
                window.performance.now = window.performance[methods[i]];

                window.performance.userTimingJsNowPrefixed = true;

                break;
            }
        }

        //
        // now() should be a DOMHighResTimeStamp, which is defined as being a time relative
        // to navigationStart of the PerformanceTiming (PT) interface.  If this browser supports
        // PT, use that as our relative start.  Otherwise, use "now" as the start and all other
        // now() calls will be relative to our initialization.
        //

        var nowOffset = +new Date();
        if (window.performance.timing && window.performance.timing.navigationStart) {
            nowOffset = window.performance.timing.navigationStart;
        } else if (typeof process !== "undefined" && typeof process.hrtime === "function") {
            nowOffset = process.hrtime();
            window.performance.now = function () {
                var time = process.hrtime(nowOffset);
                return time[0] * 1e3 + time[1] * 1e-6;
            };
        }

        if (typeof window.performance.now !== "function") {
            // No browser support, fall back to Date.now
            if (Date.now) {
                window.performance.now = function () {
                    return Date.now() - nowOffset;
                };
            } else {
                // no Date.now support, get the time from new Date()
                window.performance.now = function () {
                    return +new Date() - nowOffset;
                };
            }
        }
    }

    //
    // PerformanceTimeline (PT) shims
    //  http://www.w3.org/TR/performance-timeline/
    //

    /**
     * Adds an object to our internal Performance Timeline array.
     *
     * Will be blank if the environment supports PT.
     */
    var addToPerformanceTimeline = function addToPerformanceTimeline() {};

    /**
     * Clears the specified entry types from our timeline array.
     *
     * Will be blank if the environment supports PT.
     */
    var clearEntriesFromPerformanceTimeline = function clearEntriesFromPerformanceTimeline() {};

    // performance timeline array
    var performanceTimeline = [];

    // whether or not the timeline will require sort on getEntries()
    var performanceTimelineRequiresSort = false;

    // whether or not ResourceTiming is natively supported but UserTiming is
    // not (eg Firefox 35)
    var hasNativeGetEntriesButNotUserTiming = false;

    //
    // If getEntries() and mark() aren't defined, we'll assume
    // we have to shim at least some PT functions.
    //
    if (typeof window.performance.getEntries !== "function" || typeof window.performance.mark !== "function") {

        if (typeof window.performance.getEntries === "function" && typeof window.performance.mark !== "function") {
            hasNativeGetEntriesButNotUserTiming = true;
        }

        window.performance.userTimingJsPerformanceTimeline = true;

        // copy prefixed version over if it exists
        prefixes = ["webkit", "moz"];
        methods = ["getEntries", "getEntriesByName", "getEntriesByType"];

        for (i = 0; i < methods.length; i++) {
            for (j = 0; j < prefixes.length; j++) {
                // prefixed method will likely have an upper-case first letter
                methodTest = prefixes[j] + methods[i].substr(0, 1).toUpperCase() + methods[i].substr(1);

                if (typeof window.performance[methodTest] === "function") {
                    window.performance[methods[i]] = window.performance[methodTest];

                    window.performance.userTimingJsPerformanceTimelinePrefixed = true;
                }
            }
        }

        /**
         * Adds an object to our internal Performance Timeline array.
         *
         * @param {Object} obj PerformanceEntry
         */
        addToPerformanceTimeline = function addToPerformanceTimeline(obj) {
            performanceTimeline.push(obj);

            //
            // If we insert a measure, its startTime may be out of order
            // from the rest of the entries because the use can use any
            // mark as the start time.  If so, note we have to sort it before
            // returning getEntries();
            //
            if (obj.entryType === "measure") {
                performanceTimelineRequiresSort = true;
            }
        };

        /**
         * Ensures our PT array is in the correct sorted order (by startTime)
         */
        var ensurePerformanceTimelineOrder = function ensurePerformanceTimelineOrder() {
            if (!performanceTimelineRequiresSort) {
                return;
            }

            //
            // Measures, which may be in this list, may enter the list in
            // an unsorted order. For example:
            //
            //  1. measure("a")
            //  2. mark("start_mark")
            //  3. measure("b", "start_mark")
            //  4. measure("c")
            //  5. getEntries()
            //
            // When calling #5, we should return [a,c,b] because technically the start time
            // of c is "0" (navigationStart), which will occur before b's start time due to the mark.
            //
            performanceTimeline.sort(function (a, b) {
                return a.startTime - b.startTime;
            });

            performanceTimelineRequiresSort = false;
        };

        /**
         * Clears the specified entry types from our timeline array.
         *
         * @param {string} entryType Entry type (eg "mark" or "measure")
         * @param {string} [name] Entry name (optional)
         */
        clearEntriesFromPerformanceTimeline = function clearEntriesFromPerformanceTimeline(entryType, name) {
            // clear all entries from the perf timeline
            i = 0;
            while (i < performanceTimeline.length) {
                if (performanceTimeline[i].entryType !== entryType) {
                    // unmatched entry type
                    i++;
                    continue;
                }

                if (typeof name !== "undefined" && performanceTimeline[i].name !== name) {
                    // unmatched name
                    i++;
                    continue;
                }

                // this entry matches our criteria, remove just it
                performanceTimeline.splice(i, 1);
            }
        };

        if (typeof window.performance.getEntries !== "function" || hasNativeGetEntriesButNotUserTiming) {
            var origGetEntries = window.performance.getEntries;

            /**
             * Gets all entries from the Performance Timeline.
             * http://www.w3.org/TR/performance-timeline/#dom-performance-getentries
             *
             * NOTE: This will only ever return marks and measures.
             *
             * @returns {PerformanceEntry[]} Array of PerformanceEntrys
             */
            window.performance.getEntries = function () {
                ensurePerformanceTimelineOrder();

                // get a copy of all of our entries
                var entries = performanceTimeline.slice(0);

                // if there was a native version of getEntries, add that
                if (hasNativeGetEntriesButNotUserTiming && origGetEntries) {
                    // merge in native
                    Array.prototype.push.apply(entries, origGetEntries.call(window.performance));

                    // sort by startTime
                    entries.sort(function (a, b) {
                        return a.startTime - b.startTime;
                    });
                }

                return entries;
            };
        }

        if (typeof window.performance.getEntriesByType !== "function" || hasNativeGetEntriesButNotUserTiming) {
            var origGetEntriesByType = window.performance.getEntriesByType;

            /**
             * Gets all entries from the Performance Timeline of the specified type.
             * http://www.w3.org/TR/performance-timeline/#dom-performance-getentriesbytype
             *
             * NOTE: This will only work for marks and measures.
             *
             * @param {string} entryType Entry type (eg "mark" or "measure")
             *
             * @returns {PerformanceEntry[]} Array of PerformanceEntrys
             */
            window.performance.getEntriesByType = function (entryType) {
                // we only support marks/measures
                if (typeof entryType === "undefined" || entryType !== "mark" && entryType !== "measure") {

                    if (hasNativeGetEntriesButNotUserTiming && origGetEntriesByType) {
                        // native version exists, forward
                        return origGetEntriesByType.call(window.performance, entryType);
                    }

                    return [];
                }

                // see note in ensurePerformanceTimelineOrder() on why this is required
                if (entryType === "measure") {
                    ensurePerformanceTimelineOrder();
                }

                // find all entries of entryType
                var entries = [];
                for (i = 0; i < performanceTimeline.length; i++) {
                    if (performanceTimeline[i].entryType === entryType) {
                        entries.push(performanceTimeline[i]);
                    }
                }

                return entries;
            };
        }

        if (typeof window.performance.getEntriesByName !== "function" || hasNativeGetEntriesButNotUserTiming) {
            var origGetEntriesByName = window.performance.getEntriesByName;

            /**
             * Gets all entries from the Performance Timeline of the specified
             * name, and optionally, type.
             * http://www.w3.org/TR/performance-timeline/#dom-performance-getentriesbyname
             *
             * NOTE: This will only work for marks and measures.
             *
             * @param {string} name Entry name
             * @param {string} [entryType] Entry type (eg "mark" or "measure")
             *
             * @returns {PerformanceEntry[]} Array of PerformanceEntrys
             */
            window.performance.getEntriesByName = function (name, entryType) {
                if (entryType && entryType !== "mark" && entryType !== "measure") {
                    if (hasNativeGetEntriesButNotUserTiming && origGetEntriesByName) {
                        // native version exists, forward
                        return origGetEntriesByName.call(window.performance, name, entryType);
                    }

                    return [];
                }

                // see note in ensurePerformanceTimelineOrder() on why this is required
                if (typeof entryType !== "undefined" && entryType === "measure") {
                    ensurePerformanceTimelineOrder();
                }

                // find all entries of the name and (optionally) type
                var entries = [];
                for (i = 0; i < performanceTimeline.length; i++) {
                    if (typeof entryType !== "undefined" && performanceTimeline[i].entryType !== entryType) {
                        continue;
                    }

                    if (performanceTimeline[i].name === name) {
                        entries.push(performanceTimeline[i]);
                    }
                }

                if (hasNativeGetEntriesButNotUserTiming && origGetEntriesByName) {
                    // merge in native
                    Array.prototype.push.apply(entries, origGetEntriesByName.call(window.performance, name, entryType));

                    // sort by startTime
                    entries.sort(function (a, b) {
                        return a.startTime - b.startTime;
                    });
                }

                return entries;
            };
        }
    }

    //
    // UserTiming support
    //
    if (typeof window.performance.mark !== "function") {
        window.performance.userTimingJsUserTiming = true;

        // copy prefixed version over if it exists
        prefixes = ["webkit", "moz", "ms"];
        methods = ["mark", "measure", "clearMarks", "clearMeasures"];

        for (i = 0; i < methods.length; i++) {
            for (j = 0; j < prefixes.length; j++) {
                // prefixed method will likely have an upper-case first letter
                methodTest = prefixes[j] + methods[i].substr(0, 1).toUpperCase() + methods[i].substr(1);

                if (typeof window.performance[methodTest] === "function") {
                    window.performance[methods[i]] = window.performance[methodTest];

                    window.performance.userTimingJsUserTimingPrefixed = true;
                }
            }
        }

        // only used for measure(), to quickly see the latest timestamp of a mark
        var marks = {};

        if (typeof window.performance.mark !== "function") {
            /**
             * UserTiming mark
             * http://www.w3.org/TR/user-timing/#dom-performance-mark
             *
             * @param {string} markName Mark name
             */
            window.performance.mark = function (markName) {
                var now = window.performance.now();

                // mark name is required
                if (typeof markName === "undefined") {
                    throw new SyntaxError("Mark name must be specified");
                }

                // mark name can't be a NT timestamp
                if (window.performance.timing && markName in window.performance.timing) {
                    throw new SyntaxError("Mark name is not allowed");
                }

                if (!marks[markName]) {
                    marks[markName] = [];
                }

                marks[markName].push(now);

                // add to perf timeline as well
                addToPerformanceTimeline({
                    entryType: "mark",
                    name: markName,
                    startTime: now,
                    duration: 0
                });
            };
        }

        if (typeof window.performance.clearMarks !== "function") {
            /**
             * UserTiming clear marks
             * http://www.w3.org/TR/user-timing/#dom-performance-clearmarks
             *
             * @param {string} markName Mark name
             */
            window.performance.clearMarks = function (markName) {
                if (!markName) {
                    // clear all marks
                    marks = {};
                } else {
                    marks[markName] = [];
                }

                clearEntriesFromPerformanceTimeline("mark", markName);
            };
        }

        if (typeof window.performance.measure !== "function") {
            /**
             * UserTiming measure
             * http://www.w3.org/TR/user-timing/#dom-performance-measure
             *
             * @param {string} measureName Measure name
             * @param {string} [startMark] Start mark name
             * @param {string} [endMark] End mark name
             */
            window.performance.measure = function (measureName, startMark, endMark) {
                var now = window.performance.now();

                if (typeof measureName === "undefined") {
                    throw new SyntaxError("Measure must be specified");
                }

                // if there isn't a startMark, we measure from navigationStart to now
                if (!startMark) {
                    // add to perf timeline as well
                    addToPerformanceTimeline({
                        entryType: "measure",
                        name: measureName,
                        startTime: 0,
                        duration: now
                    });

                    return;
                }

                //
                // If there is a startMark, check for it first in the NavigationTiming interface,
                // then check our own marks.
                //
                var startMarkTime = 0;
                if (window.performance.timing && startMark in window.performance.timing) {
                    // mark cannot have a timing of 0
                    if (startMark !== "navigationStart" && window.performance.timing[startMark] === 0) {
                        throw new Error(startMark + " has a timing of 0");
                    }

                    // time is the offset of this mark to navigationStart's time
                    startMarkTime = window.performance.timing[startMark] - window.performance.timing.navigationStart;
                } else if (startMark in marks) {
                    startMarkTime = marks[startMark][marks[startMark].length - 1];
                } else {
                    throw new Error(startMark + " mark not found");
                }

                //
                // If there is a endMark, check for it first in the NavigationTiming interface,
                // then check our own marks.
                //
                var endMarkTime = now;

                if (endMark) {
                    endMarkTime = 0;

                    if (window.performance.timing && endMark in window.performance.timing) {
                        // mark cannot have a timing of 0
                        if (endMark !== "navigationStart" && window.performance.timing[endMark] === 0) {
                            throw new Error(endMark + " has a timing of 0");
                        }

                        // time is the offset of this mark to navigationStart's time
                        endMarkTime = window.performance.timing[endMark] - window.performance.timing.navigationStart;
                    } else if (endMark in marks) {
                        endMarkTime = marks[endMark][marks[endMark].length - 1];
                    } else {
                        throw new Error(endMark + " mark not found");
                    }
                }

                // add to our measure array
                var duration = endMarkTime - startMarkTime;

                // add to perf timeline as well
                addToPerformanceTimeline({
                    entryType: "measure",
                    name: measureName,
                    startTime: startMarkTime,
                    duration: duration
                });
            };
        }

        if (typeof window.performance.clearMeasures !== "function") {
            /**
             * UserTiming clear measures
             * http://www.w3.org/TR/user-timing/#dom-performance-clearmeasures
             *
             * @param {string} measureName Measure name
             */
            window.performance.clearMeasures = function (measureName) {
                clearEntriesFromPerformanceTimeline("measure", measureName);
            };
        }
    }

    //
    // Export UserTiming to the appropriate location.
    //
    // When included directly via a script tag in the browser, we're good as we've been
    // updating the window.performance object.
    //
    if (typeof define === "function" && define.amd) {
        //
        // AMD / RequireJS
        //
        define([], function () {
            return window.performance;
        });
    } else if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
        //
        // Node.js
        //
        module.exports = window.performance;
    }
})(typeof window !== "undefined" ? window : undefined);

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

/* eslint-disable no-console */
var Logger = function () {
    function Logger(enableDebug) {
        classCallCheck(this, Logger);

        this.debugEnabled = enableDebug || false;
    }

    createClass(Logger, [{
        key: "info",
        value: function info() {
            if (this.debugEnabled) {
                console.info.apply(console, Array.prototype.slice.call(arguments));
            }
        }
    }, {
        key: "debug",
        value: function debug() {
            if (this.debugEnabled) {
                console.debug.apply(console, Array.prototype.slice.call(arguments));
            }
        }
    }, {
        key: "error",
        value: function error() {
            if (this.debugEnabled) {
                console.error.apply(console, Array.prototype.slice.call(arguments));
            }
        }
    }]);
    return Logger;
}();

var StatfulUtil = function () {
    function StatfulUtil(config) {
        classCallCheck(this, StatfulUtil);

        this.config = {};
        Object.assign(this.config, config);

        this.logger = new Logger(this.config.debug);
        if (this.config && this.config.flushInterval) {
            this.registerQueue(this.config.flushInterval);
        }
    }

    /**
     * Sends data
     * @param {object} data
     */


    createClass(StatfulUtil, [{
        key: 'sendData',
        value: function sendData(data) {
            var _this = this;

            var requestUrl = this.config.apiAddress + '/beacon/metrics';
            var requestData = JSON.stringify(data);

            if (!this.config.dryrun) {
                var xmlHttp = new XMLHttpRequest();
                xmlHttp.open('POST', requestUrl, true);
                xmlHttp.timeout = this.config.timeout;

                //Send the proper header information along with the request
                xmlHttp.setRequestHeader('Content-type', 'application/json');
                xmlHttp.send(requestData);

                xmlHttp.onreadystatechange = function () {
                    if (xmlHttp.status == 200 || xmlHttp.status == 201) {
                        _this.logger.debug('Successfully send metric');
                    } else {
                        _this.logger.debug('Error send metric', requestUrl, xmlHttp.status);
                    }
                };
            } else {
                this.logger.debug('Dryrun data', data);
            }
        }

        /**
         * Register a new queue
         * @param {number} flushInterval
         */

    }, {
        key: 'registerQueue',
        value: function registerQueue(flushInterval) {
            var _this2 = this;

            var metricsTimer = void 0;

            this.metricsQueue = [];

            if (typeof flushInterval === 'number' && flushInterval > 0) {
                metricsTimer = setInterval(function () {
                    if (_this2.metricsQueue.length > 0) {
                        _this2.sendData(_this2.metricsQueue);
                        _this2.metricsQueue = [];
                    }
                }, flushInterval);

                window.addEventListener('beforeunload', function () {
                    clearInterval(metricsTimer);
                });

                return true;
            } else {
                return false;
            }
        }

        /**
         * Add Metric
         * @param {object} metric - object to be sent
         * @param {Boolean} usingQueue
         */

    }, {
        key: 'addMetric',
        value: function addMetric() {
            var metric = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
            var usingQueue = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

            if (metric && typeof metric.isValid === 'function' && metric.isValid()) {
                if (this.shouldAddMetric(metric)) {
                    if (usingQueue) {
                        this.metricsQueue.push(metric);
                    } else {
                        this.sendData([metric]);
                    }
                } else {
                    this.logger.debug('Metric was discarded due to sample rate.');
                }
            } else {
                this.logger.error('Invalid metric.');
            }
        }

        /**
         * Determines is a metric should be sent to the server
         * @param {object} metric - object to be sent
         */

    }, {
        key: 'shouldAddMetric',
        value: function shouldAddMetric() {
            var metric = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            var sampleRate = (metric.sampleRate || this.config.sampleRate || 100) / 100;

            return Math.random() <= sampleRate;
        }
    }]);
    return StatfulUtil;
}();

var aggregationList = ['avg', 'count', 'sum', 'first', 'last', 'p90', 'p95', 'min', 'max'];
var aggregationFrequencyList = [10, 30, 60, 120, 180, 300];

var Metric = function () {
    function Metric() {
        var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
        var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
        var value = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
        var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
        var config = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
        classCallCheck(this, Metric);

        this.name = name;
        this.type = type;
        this.value = value;

        var typeTags = [];
        var typeAggregations = [];
        var typeAggregationFrequency = 0;

        if (config[type]) {
            typeTags = config[type].tags;
            typeAggregations = config[type].aggregations;
            typeAggregationFrequency = config[type].aggregationFrequency;
        }

        this.tags = this.buildTags(options.tags, config.tags, typeTags, config.app);
        this.aggregations = this.buildAggregations(options.aggregations, config.aggregations, typeAggregations);
        this.aggregationFrequency = this.buildAggregationFrequency(options.aggregationFrequency, config.aggregationFrequency, typeAggregationFrequency);
        this.namespace = options.namespace || config.namespace;
        this.sampleRate = options.sampleRate || config.sampleRate;
    }

    /**
     * Build tags for a metric type
     * @param {object} methodTags - list of method tags
     * @param {object} globalTags - list of global tags
     * @param {object} typeTags - list of type tags
     * @param {string} app - app tag value
     * @returns {*}
     */


    createClass(Metric, [{
        key: 'buildTags',
        value: function buildTags() {
            var methodTags = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
            var globalTags = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
            var typeTags = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
            var app = arguments[3];

            var tags = {};

            Object.assign(tags, globalTags);
            Object.assign(tags, typeTags);
            Object.assign(tags, methodTags);

            if (!tags.app && app) {
                tags.app = app;
            }

            return tags;
        }

        /**
         * Build aggregations for a metric type
         * @param {Array} methodAggregations - list of method aggregations
         * @param {Array} globalAggregations - list of global aggregations
         * @param {Array} typeAggregations - list of type aggregations
         * @returns {*|Array}
         */

    }, {
        key: 'buildAggregations',
        value: function buildAggregations() {
            var methodAggregations = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
            var globalAggregations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
            var typeAggregations = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

            var aggregations = [];

            aggregations = aggregations.concat(globalAggregations);
            aggregations = aggregations.concat(typeAggregations).filter(this.uniq);
            aggregations = aggregations.concat(methodAggregations).filter(this.uniq);

            return this.filterAggregations(aggregations);
        }

        /**
         * Check for uniq values
         * @param item
         * @param index
         * @param array
         * @returns Boolean
         */

    }, {
        key: 'uniq',
        value: function uniq(item, index, array) {
            return item && array.indexOf(item) === index;
        }

        /**
         * Build aggregation frequency
         * @param {number} methodFrequency - method aggregation frequency
         * @param {number} globalFrequency - global aggregation frequency
         * @param {number} typeFrequency - type aggregation frequency
         */

    }, {
        key: 'buildAggregationFrequency',
        value: function buildAggregationFrequency(methodFrequency, globalFrequency, typeFrequency) {
            var frequency = methodFrequency || typeFrequency || globalFrequency;

            return this.filterAggregationFrequency(frequency);
        }

        /**
         * Filter unsupported aggregations
         * @param {Array} aggregations - list of aggregations
         * @returns {Array}
         */

    }, {
        key: 'filterAggregations',
        value: function filterAggregations() {
            var aggregations = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

            return aggregations.filter(function (item) {
                return aggregationList.includes(item);
            });
        }

        /**
         * Filter unsupported frequencies
         * @param {number} frequency - aggregation frequency
         * @returns {*}
         */

    }, {
        key: 'filterAggregationFrequency',
        value: function filterAggregationFrequency(frequency) {
            return aggregationFrequencyList.includes(frequency) ? frequency : 10;
        }

        /**
         * Validates metric model
         * @returns {Boolean}
         */

    }, {
        key: 'isValid',
        value: function isValid() {
            return !!(!isNaN(this.value) && this.name);
        }
    }]);
    return Metric;
}();

/**
 * @description
 *
 * This object provides a client for the Statful service to register
 * application metrics. It can be called as follows:
 *
 * statful.initialize({
 *      app: 'example-app'
 *      namespace: 'mobile',
 *      dryrun: false,
 *      debug: false
 *  });
 *
 * statful.counter('metricName', 1);
 *
 */

var defaultConfig = {
    dryrun: false,
    debug: false,
    app: undefined,
    namespace: 'web',
    tags: {},
    aggregations: [],
    aggregationFrequency: 10,
    timer: {
        tags: {
            unit: 'ms'
        },
        aggregations: ['avg', 'p90', 'count']
    },
    counter: {
        tags: {},
        aggregations: ['sum', 'count']
    },
    gauge: {
        tags: {},
        aggregations: ['last']
    },
    timeout: 2000,
    flushInterval: 10000,
    sampleRate: 100
};

var Statful = function () {
    function Statful() {
        classCallCheck(this, Statful);
    }

    createClass(Statful, null, [{
        key: 'initialize',

        /**
         * Initialize the Statful client settings and register events
         * @param {Object} clientConfig
         */
        value: function initialize(clientConfig) {
            this.config = {
                apiAddress: 'https://beacon.statful.com'
            };

            // Set default properties
            if ((typeof clientConfig === 'undefined' ? 'undefined' : _typeof(clientConfig)) !== 'object' || clientConfig === null) {
                clientConfig = {};
            }

            Object.assign(this.config, defaultConfig);
            Object.assign(this.config, clientConfig);

            // Create Logger
            this.logger = new Logger(this.config.debug);

            // Create Util
            this.util = new StatfulUtil(this.config);
        }

        /**
         * Measure a timer using the user timing specification
         * @param {string} measureName name of the measure to create
         * @returns {number}
         */

    }, {
        key: 'measureTimeUserTiming',
        value: function measureTimeUserTiming() {
            var measureName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

            var measure = window.performance.getEntriesByName(measureName).filter(function (entry) {
                return entry.entryType === 'measure';
            });
            var time = void 0;

            if (measure.length > 0) {
                // Always use the most recent measure if more exist
                time = measure[measure.length - 1].duration;
            } else {
                this.logger.debug('Measure ' + measureName + ' not found');
            }

            return time;
        }

        /**
         * Clear marks
         * @param {Array} marks - list of marks to clear (optional)
         */

    }, {
        key: 'clearMarks',
        value: function clearMarks(marks) {
            try {
                if (Array.isArray(marks)) {
                    marks.forEach(function (mark) {
                        if (mark) {
                            window.performance.clearMarks(mark);
                        }
                    });
                } else {
                    window.performance.clearMarks();
                }
            } catch (ex) {
                this.logger.error(ex);
            }
        }

        /**
         * Clear resources
         */

    }, {
        key: 'clearResources',
        value: function clearResources() {
            try {
                window.performance.clearResourceTimings();
            } catch (ex) {
                this.logger.error(ex);
            }
        }

        /**
         * Clear measures
         * @param {Array} measures - list of measures to clear (optional)
         */

    }, {
        key: 'clearMeasures',
        value: function clearMeasures(measures) {
            try {
                if (Array.isArray(measures)) {
                    measures.forEach(function (measure) {
                        if (measure) {
                            window.performance.clearMeasures(measure);
                        }
                    });
                } else {
                    window.performance.clearMeasures();
                }
            } catch (ex) {
                this.logger.error(ex);
            }
        }

        /**
         * Register a mark using the user timing specification
         * @param markName - name of the mark to add
         */

    }, {
        key: 'registerMark',
        value: function registerMark() {
            var markName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

            try {
                this.logger.debug('Register Mark', markName);
                if (markName) {
                    window.performance.mark(markName);
                } else {
                    this.logger.error('Undefined resource name to register as a mark');
                }
            } catch (ex) {
                this.logger.error(ex);
            }
        }

        /**
         * Register a measure and sends a timer using the user timing specification and metric options
         * @param {string} measureName - name of the measure to create in the browser (ie. timeto.apploaded)
         * @param {string} metricName - name of the metric to send to statful (ie. timeto)
         * @param {object} options - set of option (clearMarks, clearMeasures, startMark, endMark, tags and aggregations)
         */

    }, {
        key: 'registerMeasure',
        value: function registerMeasure(measureName, metricName) {
            var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

            try {
                this.logger.debug('Register Measure', measureName, metricName, options);
                if (measureName) {
                    var defaults$$1 = {
                        clearMarks: false,
                        clearMeasures: false
                    };

                    Object.assign(defaults$$1, options);

                    // Create endMark if none is set
                    if (!defaults$$1.endMark) {
                        this.registerMark(measureName);
                        defaults$$1.endMark = measureName;
                    }

                    window.performance.measure(measureName, defaults$$1.startMark, defaults$$1.endMark);

                    // Measure timer
                    var time = this.measureTimeUserTiming(measureName);

                    if (time) {
                        // Push metrics to queue
                        var metricItem = new Metric(metricName, 'timer', time, defaults$$1, this.config);
                        this.util.addMetric(metricItem, true);
                    } else {
                        this.logger.error('Failed to get measure time to register as timer value');
                    }

                    if (defaults$$1.clearMarks) {
                        this.clearMarks([defaults$$1.startMark, defaults$$1.endMark]);
                    }

                    if (defaults$$1.clearMeasures) {
                        this.clearMeasures([measureName]);
                    }
                } else {
                    this.logger.error('Undefined resource name to register as a measure');
                }
            } catch (ex) {
                this.logger.error(ex);
            }
        }

        /**
         * Register timer
         * @param {string} metricName - metric name to be used as metric name
         * @param {number} metricValue - timer value to be sent
         * @param {object} options - set of option (tags, agg, aggFreq, namespace)
         */

    }, {
        key: 'timer',
        value: function timer(metricName, metricValue) {
            var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

            this.logger.debug('Register Timer', metricName, metricValue, options);
            var metric = new Metric(metricName, 'timer', metricValue, options, this.config);

            this.util.addMetric(metric, true);
        }

        /**
         * Register counter
         * @param {string} metricName - metric name to be sent
         * @param {number} metricValue - count value to be sent
         * @param {object} options - set of option (tags, agg, aggFreq, namespace)
         */

    }, {
        key: 'counter',
        value: function counter(metricName) {
            var metricValue = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
            var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

            this.logger.debug('Register Counter', metricName, options);
            var metric = new Metric(metricName, 'counter', metricValue, options, this.config);
            metric.value = Math.abs(parseInt(metric.value, 10));

            this.util.addMetric(metric, true);
        }

        /**
         * Register gauge
         * @param {string} metricName -  metric name to be sent
         * @param {number} metricValue - gauge value to be sent
         * @param {object} options - set of option (tags, agg, aggFreq, namespace)
         */

    }, {
        key: 'gauge',
        value: function gauge(metricName, metricValue) {
            var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

            this.logger.debug('Register Gauge', metricName, metricValue, options);
            var metric = new Metric(metricName, 'gauge', metricValue, options, this.config);

            this.util.addMetric(metric, true);
        }

        /**
         * Send Metric without going to Queue
         * @param {string} type -  metric type to be sent
         * @param {string} metricName -  metric name to be sent
         * @param {number} metricValue - gauge value to be sent
         * @param {object} options - set of option (tags, agg, aggFreq, namespace)
         */

    }, {
        key: 'sendMetric',
        value: function sendMetric(type, metricName, metricValue) {
            var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

            var metric = new Metric(metricName, type, metricValue, options, this.config);

            this.util.addMetric(metric, false);
        }
    }]);
    return Statful;
}();

return Statful;

}());
