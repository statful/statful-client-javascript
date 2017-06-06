/**
* statful-client-javascript 2.0.2
* Copyright 2017 Statful <https://www.statful.com/>
*/

(function(window) {
    "use strict";
    function Logger(enableDebug) {
        this.debugEnabled = enableDebug || false;
    }
    Logger.prototype.info = function() {
        if (this.debugEnabled) {
            var args = Array.prototype.slice.call(arguments);
            console.info.apply(console, args);
        }
    };
    Logger.prototype.debug = function() {
        if (this.debugEnabled) {
            var args = Array.prototype.slice.call(arguments);
            console.debug.apply(console, args);
        }
    };
    Logger.prototype.error = function() {
        if (this.debugEnabled) {
            var args = Array.prototype.slice.call(arguments);
            console.error.apply(console, args);
        }
    };
    window.StatfulLogger = Logger;
})(window);

(function(window) {
    "use strict";
    function StatfulUtil(config) {
        config = config || {};
        var self = this;
        var logger;
        //Merge configs
        this.config = {};
        this.constants = {
            aggregationList: [ "avg", "count", "sum", "first", "last", "p90", "p95", "min", "max" ],
            aggregationFrequencyList: [ 10, 30, 60, 120, 180, 300 ]
        };
        Object.keys(config).forEach(function(key) {
            self.config[key] = config[key];
        });
        this.listQueues = [];
        logger = new StatfulLogger(self.config.debug);
        /**
         * Sends HTTP request to the api
         * @param {string} endpoint - action
         * @param {string} requestData - request data
         */
        this.sendRequest = function(endpoint, requestData) {
            var requestArr = [ this.config.apiAddress, endpoint ];
            var requestUrl = requestArr.join("/");
            logger.debug("Request: " + requestUrl, requestData);
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.open("POST", requestUrl, true);
            xmlHttp.timeout = config.timeout;
            //Send the proper header information along with the request
            xmlHttp.setRequestHeader("Content-type", "application/json");
            xmlHttp.send(requestData);
            xmlHttp.onreadystatechange = function() {
                if (xmlHttp.status == 200 || xmlHttp.status == 201) {
                    logger.debug("Successfully send metric");
                } else {
                    logger.debug("Error send metric", requestUrl, xmlHttp.status);
                }
            };
        };
        /**
         * Register a new queue
         * @param {string} queueName - queue name
         * @param {string} endpoint - endpoint to send requests
         * @param {int} timeInterval - interval in milliseconds, default 30000 ms
         */
        this.registerQueue = function(queueName, endpoint, timeInterval) {
            timeInterval = timeInterval || this.config.flushInterval;
            if (typeof queueName === "string" && typeof timeInterval === "number") {
                var self = this;
                this.listQueues[queueName] = {
                    data: [],
                    endpoint: endpoint
                };
                this.listQueues[queueName].timer = setInterval(function() {
                    var queue = self.listQueues[queueName];
                    if (queue.data.length > 0) {
                        if (!self.config.dryrun) {
                            self.sendRequest(queue.endpoint, JSON.stringify(queue.data));
                        } else {
                            logger.debug("Dryrun data", queue.endpoint, queue.data);
                        }
                        queue.data = [];
                    }
                }, timeInterval);
                return true;
            } else {
                return false;
            }
        };
        /**
         * Unregister queue
         * @param {string} queueName - queue name
         */
        this.unregisterQueue = function(queueName) {
            if (this.listQueues[queueName]) {
                clearInterval(this.listQueues[queueName].timer);
                this.listQueues[queueName] = undefined;
            }
        };
        /**
         * Sends an Item to a specific queue
         * @param {string} queueName - queue name
         * @param {object} item - object to be sent
         */
        this.addItemToQueue = function(queueName, item) {
            var sampleRateNormalized = (item.sampleRate || this.config.sampleRate || 100) / 100;
            if (this.listQueues[queueName] && Math.random() <= sampleRateNormalized) {
                this.listQueues[queueName].data.push(item);
                return true;
            } else {
                logger.debug("Metric was discarded due to sample rate.");
                return false;
            }
        };
        /**
         * Define aggregations for a metric type
         * @param {Array} methodAggregations - list of method aggregations
         * @param {Array} globalAggregations - list of global aggregations
         * @param {Array} typeAggregations - list of type aggregations
         * @returns {*|Array}
         */
        this.setAggregations = function(methodAggregations, globalAggregations, typeAggregations) {
            function uniq(item, index, array) {
                return item && array.indexOf(item) === index;
            }
            var aggregations = globalAggregations;
            aggregations = aggregations.concat(typeAggregations).filter(uniq);
            if (!methodAggregations) {
                aggregations = aggregations || [];
            } else {
                aggregations = aggregations.concat(methodAggregations).filter(uniq);
            }
            return this.filterAggregations(aggregations);
        };
        /**
         * Define tags for a metric type
         * @param {object} methodTags - list of method tags
         * @param {object} globalTags - list of global tags
         * @param {string} typeTags - list of type tags
         * @param {string} app - app tag value
         * @returns {*}
         */
        this.setTags = function(methodTags, globalTags, typeTags, app) {
            var tags = {};
            Object.keys(globalTags).forEach(function(key) {
                tags[key] = globalTags[key];
            });
            Object.keys(typeTags).forEach(function(key) {
                tags[key] = typeTags[key];
            });
            Object.keys(methodTags).forEach(function(key) {
                tags[key] = methodTags[key];
            });
            if (!tags.app && app) {
                tags.app = app;
            }
            return tags;
        };
        /**
         * Define aggregation frequency
         * @param {number} methodFrequency - method aggregation frequency
         * @param {number} globalFrequency - global aggregation frequency
         * @param {number} typeFrequency - type aggregation frequency
         */
        this.setAggregationFrequency = function(methodFrequency, globalFrequency, typeFrequency) {
            var frequency = globalFrequency;
            if (typeFrequency) {
                frequency = typeFrequency;
            }
            if (methodFrequency) {
                frequency = methodFrequency;
            }
            return this.filterAggregationFrequency(frequency);
        };
        /**
         * Filter unsupported aggregations
         * @param {Array} aggregations - list of aggregations
         * @returns {Array}
         */
        this.filterAggregations = function(aggregations) {
            var agg = this.constants.aggregationList;
            aggregations = aggregations || [];
            return aggregations.filter(function(item) {
                return agg.indexOf(item) !== -1;
            });
        };
        /**
         * Filter unsupported frequencies
         * @param {number} frequency - aggregation frequency
         * @returns {*}
         */
        this.filterAggregationFrequency = function(frequency) {
            var frequencyList = this.constants.aggregationFrequencyList;
            var freq = 10;
            if (frequencyList.indexOf(frequency) > -1) {
                freq = frequency;
            }
            return freq;
        };
    }
    window.StatfulUtil = StatfulUtil;
})(window);

(function(window) {
    "use strict";
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
        namespace: "web",
        tags: {},
        aggregations: [],
        aggregationFrequency: 10,
        timer: {
            tags: {
                unit: "ms"
            },
            aggregations: [ "avg", "p90", "count" ]
        },
        counter: {
            tags: {},
            aggregations: [ "sum", "count" ]
        },
        gauge: {
            tags: {},
            aggregations: [ "last" ]
        },
        timeout: 2e3,
        flushInterval: 1e4,
        sampleRate: 100
    };
    var logger;
    var statful = {
        config: {
            apiAddress: "https://beacon.statful.com"
        },
        endpoints: {
            metrics: "beacon/metrics"
        },
        perf: window.performance,
        /**
         * Initialize the Statful client settings and register events
         */
        initialize: function(clientConfig) {
            var self = this;
            //Private functions
            self.mergeConfigs = function(clientConfig) {
                if (typeof clientConfig !== "object" || clientConfig === null) {
                    clientConfig = {};
                }
                // Set default properties
                Object.keys(defaultConfig).forEach(function(key) {
                    self.config[key] = defaultConfig[key];
                });
                Object.keys(clientConfig).forEach(function(key) {
                    self.config[key] = clientConfig[key];
                });
            };
            self.metricsData = function(name, type, value, tags, aggregations, aggregationFrequency, namespace, sampleRate) {
                return {
                    name: name,
                    type: type,
                    value: value,
                    tags: self.util.setTags(tags || {}, self.config.tags, self.config[type].tags, self.config.app),
                    aggregations: self.util.setAggregations(aggregations, self.config.aggregations, self.config[type].aggregations),
                    aggregationFrequency: self.util.setAggregationFrequency(aggregationFrequency, self.config.aggregationFrequency, self.config[type].aggregationFrequency),
                    namespace: namespace || self.config.namespace,
                    sampleRate: sampleRate || self.config.sampleRate
                };
            };
            this.mergeConfigs(clientConfig);
            // Create Logger
            logger = new StatfulLogger(self.config.debug);
            // Create Util
            self.util = new StatfulUtil({
                apiAddress: this.config.apiAddress,
                debug: this.config.debug,
                dryrun: this.config.dryrun,
                flushInterval: this.config.flushInterval,
                timeout: this.config.timeout
            });
            //Register queue to send metrics
            self.util.registerQueue("metrics", this.endpoints.metrics, this.config.flushInterval);
        },
        /**
         * Measure a timer using the user timing specification
         * @param {string} measureName name of the measure to create
         * @returns {number}
         */
        measureTimeUserTiming: function(measureName) {
            var time;
            var measure = statful.perf.getEntriesByName(measureName).filter(function filterMeasures(entry) {
                return entry.entryType === "measure";
            });
            if (measure.length > 0) {
                // Always use the most recent measure if more exist
                time = measure[measure.length - 1].duration;
            } else {
                logger.debug("Measure " + measureName + " not found");
            }
            return time;
        },
        /**
         * Clear marks
         * @param {Array} marks - list of marks to clear (optional)
         */
        clearMarks: function(marks) {
            try {
                if (marks) {
                    marks.forEach(function(mark) {
                        if (mark) {
                            statful.perf.clearMarks(mark);
                        }
                    });
                } else {
                    statful.perf.clearMarks();
                }
            } catch (ex) {
                logger.error(ex);
            }
        },
        /**
         * Clear resources
         */
        clearResources: function() {
            try {
                statful.perf.clearResourceTimings();
            } catch (ex) {
                logger.error(ex);
            }
        },
        /**
         * Clear measures
         * @param {Array} measures - list of measures to clear (optional)
         */
        clearMeasures: function(measures) {
            try {
                if (measures) {
                    measures.forEach(function(measure) {
                        statful.perf.clearMeasures(measure);
                    });
                } else {
                    statful.perf.clearMeasures();
                }
            } catch (ex) {
                logger.error(ex);
            }
        },
        /**
         * Register a mark using the user timing specification
         * @param markName - name of the mark to add
         */
        registerMark: function(markName) {
            try {
                logger.debug("Register Mark", markName);
                if (markName) {
                    statful.perf.mark(markName);
                } else {
                    logger.error("Undefined resource name to register as a mark");
                }
            } catch (ex) {
                logger.error(ex);
            }
        },
        /**
         * Register a measure and sends a timer using the user timing specification and metric options
         * @param {string} measureName - name of the measure to create in the browser (ie. timeto.apploaded)
         * @param {string} metricName - name of the metric to send to statful (ie. timeto)
         * @param {object} options - set of option (clearMarks, clearMeasures, startMark, endMark, tags and aggregations)
         */
        registerMeasure: function(measureName, metricName, options) {
            try {
                logger.debug("Register Measure", measureName, metricName, options);
                if (measureName) {
                    var defaults = {
                        clearMarks: false,
                        clearMeasures: false
                    };
                    options = options || {};
                    Object.keys(options).forEach(function(key) {
                        defaults[key] = options[key];
                    });
                    // Create endMark if none is set
                    if (!defaults.endMark) {
                        this.registerMark(measureName);
                        defaults.endMark = measureName;
                    }
                    statful.perf.measure(measureName, defaults.startMark, defaults.endMark);
                    // Measure timer
                    var time = this.measureTimeUserTiming(measureName);
                    if (time) {
                        // Push metrics to queue
                        this.util.addItemToQueue("metrics", new this.metricsData(metricName, "timer", time, defaults.tags, defaults.aggregations, defaults.aggregationFrequency, defaults.namespace, defaults.sampleRate));
                    } else {
                        logger.error("Failed to get measure time to register as timer value");
                    }
                    if (defaults.clearMarks) {
                        this.clearMarks([ defaults.startMark, defaults.endMark ]);
                    }
                    if (defaults.clearMeasures) {
                        this.clearMeasures([ measureName ]);
                    }
                } else {
                    logger.error("Undefined resource name to register as a measure");
                }
            } catch (ex) {
                logger.error(ex);
            }
        },
        /**
         * Register timer
         * @param {string} metricName - metric name to be used as metric name
         * @param {number} metricValue - timer value to be sent
         * @param {object} options - set of option (tags, agg, aggFreq, namespace)
         */
        timer: function(metricName, metricValue, options) {
            try {
                logger.debug("Register Timer", metricName, metricValue, options);
                if (metricName && metricValue >= 0) {
                    options = options || {};
                    // Push metrics to queue
                    var item = new this.metricsData(metricName, "timer", metricValue, options.tags, options.agg, options.aggFreq, options.namespace, options.sampleRate);
                    this.util.addItemToQueue("metrics", item);
                } else {
                    logger.error("Undefined metric name or invalid value to register as a timer");
                }
            } catch (ex) {
                logger.error(ex);
            }
        },
        /**
         * Register counter
         * @param {string} metricName - metric name to be sent
         * @param {number} metricValue - count value to be sent
         * @param {object} options - set of option (tags, agg, aggFreq, namespace)
         */
        counter: function(metricName, metricValue, options) {
            try {
                logger.debug("Register Counter", metricName, options);
                metricValue = metricValue || 1;
                if (metricName) {
                    options = options || {};
                    // Push metrics to queue
                    var item = new this.metricsData(metricName, "counter", metricValue, options.tags, options.agg, options.aggFreq, options.namespace, options.sampleRate);
                    this.util.addItemToQueue("metrics", item);
                } else {
                    logger.error("Undefined metric name to register as a counter");
                }
            } catch (ex) {
                logger.error(ex);
            }
        },
        /**
         * Register gauge
         * @param {string} metricName metric name to be sent
         * @param {number} metricValue gauge value to be sent
         * @param {object} options - set of option (tags, agg, aggFreq, namespace)
         */
        gauge: function(metricName, metricValue, options) {
            try {
                logger.debug("Register Gauge", metricName, metricValue, options);
                if (metricName && metricValue) {
                    options = options || {};
                    // Push metrics to queue
                    var item = new this.metricsData(metricName, "gauge", metricValue, options.tags, options.agg, options.aggFreq, options.namespace, options.sampleRate);
                    this.util.addItemToQueue("metrics", item);
                } else {
                    logger.error("Undefined metric name/value to register as a gauge");
                }
            } catch (ex) {
                logger.error(ex);
            }
        }
    };
    window.statful = statful;
})(window);

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
(function(window) {
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
        methods = [ "webkitNow", "msNow", "mozNow" ];
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
            window.performance.now = function() {
                var time = process.hrtime(nowOffset);
                return time[0] * 1e3 + time[1] * 1e-6;
            };
        }
        if (typeof window.performance.now !== "function") {
            // No browser support, fall back to Date.now
            if (Date.now) {
                window.performance.now = function() {
                    return Date.now() - nowOffset;
                };
            } else {
                // no Date.now support, get the time from new Date()
                window.performance.now = function() {
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
    var addToPerformanceTimeline = function() {};
    /**
     * Clears the specified entry types from our timeline array.
     *
     * Will be blank if the environment supports PT.
     */
    var clearEntriesFromPerformanceTimeline = function() {};
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
        prefixes = [ "webkit", "moz" ];
        methods = [ "getEntries", "getEntriesByName", "getEntriesByType" ];
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
        addToPerformanceTimeline = function(obj) {
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
        var ensurePerformanceTimelineOrder = function() {
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
            performanceTimeline.sort(function(a, b) {
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
        clearEntriesFromPerformanceTimeline = function(entryType, name) {
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
            window.performance.getEntries = function() {
                ensurePerformanceTimelineOrder();
                // get a copy of all of our entries
                var entries = performanceTimeline.slice(0);
                // if there was a native version of getEntries, add that
                if (hasNativeGetEntriesButNotUserTiming && origGetEntries) {
                    // merge in native
                    Array.prototype.push.apply(entries, origGetEntries.call(window.performance));
                    // sort by startTime
                    entries.sort(function(a, b) {
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
            window.performance.getEntriesByType = function(entryType) {
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
            window.performance.getEntriesByName = function(name, entryType) {
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
                    entries.sort(function(a, b) {
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
        prefixes = [ "webkit", "moz", "ms" ];
        methods = [ "mark", "measure", "clearMarks", "clearMeasures" ];
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
            window.performance.mark = function(markName) {
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
            window.performance.clearMarks = function(markName) {
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
            window.performance.measure = function(measureName, startMark, endMark) {
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
            window.performance.clearMeasures = function(measureName) {
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
        define([], function() {
            return window.performance;
        });
    } else if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
        //
        // Node.js
        //
        module.exports = window.performance;
    }
})(typeof window !== "undefined" ? window : undefined);

//----------------------------------------------------------------------
//
// ECMAScript 5 Polyfills
//
//----------------------------------------------------------------------
//----------------------------------------------------------------------
// ES5 15.2 Object Objects
//----------------------------------------------------------------------
//
// ES5 15.2.3 Properties of the Object Constructor
//
// ES5 15.2.3.2 Object.getPrototypeOf ( O )
// From http://ejohn.org/blog/objectgetprototypeof/
// NOTE: won't work for typical function T() {}; T.prototype = {}; new T; case
// since the constructor property is destroyed.
if (!Object.getPrototypeOf) {
    Object.getPrototypeOf = function(o) {
        if (o !== Object(o)) {
            throw TypeError("Object.getPrototypeOf called on non-object");
        }
        return o.__proto__ || o.constructor.prototype || Object.prototype;
    };
}

//    // ES5 15.2.3.3 Object.getOwnPropertyDescriptor ( O, P )
//    if (typeof Object.getOwnPropertyDescriptor !== "function") {
//        Object.getOwnPropertyDescriptor = function (o, name) {
//            if (o !== Object(o)) { throw TypeError(); }
//            if (o.hasOwnProperty(name)) {
//                return {
//                    value: o[name],
//                    enumerable: true,
//                    writable: true,
//                    configurable: true
//                };
//            }
//        };
//    }
// ES5 15.2.3.4 Object.getOwnPropertyNames ( O )
if (typeof Object.getOwnPropertyNames !== "function") {
    Object.getOwnPropertyNames = function(o) {
        if (o !== Object(o)) {
            throw TypeError("Object.getOwnPropertyNames called on non-object");
        }
        var props = [], p;
        for (p in o) {
            if (Object.prototype.hasOwnProperty.call(o, p)) {
                props.push(p);
            }
        }
        return props;
    };
}

// ES5 15.2.3.5 Object.create ( O [, Properties] )
if (typeof Object.create !== "function") {
    Object.create = function(prototype, properties) {
        if (typeof prototype !== "object") {
            throw TypeError();
        }
        function Ctor() {}
        Ctor.prototype = prototype;
        var o = new Ctor();
        if (prototype) {
            o.constructor = Ctor;
        }
        if (properties !== undefined) {
            if (properties !== Object(properties)) {
                throw TypeError();
            }
            Object.defineProperties(o, properties);
        }
        return o;
    };
}

// ES 15.2.3.6 Object.defineProperty ( O, P, Attributes )
// Partial support for most common case - getters, setters, and values
(function() {
    if (!Object.defineProperty || !function() {
        try {
            Object.defineProperty({}, "x", {});
            return true;
        } catch (e) {
            return false;
        }
    }()) {
        var orig = Object.defineProperty;
        Object.defineProperty = function(o, prop, desc) {
            // In IE8 try built-in implementation for defining properties on DOM prototypes.
            if (orig) {
                try {
                    return orig(o, prop, desc);
                } catch (e) {}
            }
            if (o !== Object(o)) {
                throw TypeError("Object.defineProperty called on non-object");
            }
            if (Object.prototype.__defineGetter__ && "get" in desc) {
                Object.prototype.__defineGetter__.call(o, prop, desc.get);
            }
            if (Object.prototype.__defineSetter__ && "set" in desc) {
                Object.prototype.__defineSetter__.call(o, prop, desc.set);
            }
            if ("value" in desc) {
                o[prop] = desc.value;
            }
            return o;
        };
    }
})();

// ES 15.2.3.7 Object.defineProperties ( O, Properties )
if (typeof Object.defineProperties !== "function") {
    Object.defineProperties = function(o, properties) {
        if (o !== Object(o)) {
            throw TypeError("Object.defineProperties called on non-object");
        }
        var name;
        for (name in properties) {
            if (Object.prototype.hasOwnProperty.call(properties, name)) {
                Object.defineProperty(o, name, properties[name]);
            }
        }
        return o;
    };
}

// ES5 15.2.3.14 Object.keys ( O )
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
    Object.keys = function(o) {
        if (o !== Object(o)) {
            throw TypeError("Object.keys called on non-object");
        }
        var ret = [], p;
        for (p in o) {
            if (Object.prototype.hasOwnProperty.call(o, p)) {
                ret.push(p);
            }
        }
        return ret;
    };
}

//----------------------------------------------------------------------
// ES5 15.3 Function Objects
//----------------------------------------------------------------------
//
// ES5 15.3.4 Properties of the Function Prototype Object
//
// ES5 15.3.4.5 Function.prototype.bind ( thisArg [, arg1 [, arg2, ... ]] )
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
if (!Function.prototype.bind) {
    Function.prototype.bind = function(o) {
        if (typeof this !== "function") {
            throw TypeError("Bind must be called on a function");
        }
        var args = Array.prototype.slice.call(arguments, 1), self = this, nop = function() {}, bound = function() {
            return self.apply(this instanceof nop ? this : o, args.concat(Array.prototype.slice.call(arguments)));
        };
        if (this.prototype) nop.prototype = this.prototype;
        bound.prototype = new nop();
        return bound;
    };
}

//----------------------------------------------------------------------
// ES5 15.4 Array Objects
//----------------------------------------------------------------------
//
// ES5 15.4.3 Properties of the Array Constructor
//
// ES5 15.4.3.2 Array.isArray ( arg )
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray
Array.isArray = Array.isArray || function(o) {
    return Boolean(o && Object.prototype.toString.call(Object(o)) === "[object Array]");
};

//
// ES5 15.4.4 Properties of the Array Prototype Object
//
// ES5 15.4.4.14 Array.prototype.indexOf ( searchElement [ , fromIndex ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement) {
        if (this === void 0 || this === null) {
            throw TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0) {
            return -1;
        }
        var n = 0;
        if (arguments.length > 0) {
            n = Number(arguments[1]);
            if (isNaN(n)) {
                n = 0;
            } else if (n !== 0 && n !== 1 / 0 && n !== -(1 / 0)) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        if (n >= len) {
            return -1;
        }
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
        for (;k < len; k++) {
            if (k in t && t[k] === searchElement) {
                return k;
            }
        }
        return -1;
    };
}

// ES5 15.4.4.15 Array.prototype.lastIndexOf ( searchElement [ , fromIndex ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/lastIndexOf
if (!Array.prototype.lastIndexOf) {
    Array.prototype.lastIndexOf = function(searchElement) {
        if (this === void 0 || this === null) {
            throw TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0) {
            return -1;
        }
        var n = len;
        if (arguments.length > 1) {
            n = Number(arguments[1]);
            if (n !== n) {
                n = 0;
            } else if (n !== 0 && n !== 1 / 0 && n !== -(1 / 0)) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        var k = n >= 0 ? Math.min(n, len - 1) : len - Math.abs(n);
        for (;k >= 0; k--) {
            if (k in t && t[k] === searchElement) {
                return k;
            }
        }
        return -1;
    };
}

// ES5 15.4.4.16 Array.prototype.every ( callbackfn [ , thisArg ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/every
if (!Array.prototype.every) {
    Array.prototype.every = function(fun) {
        if (this === void 0 || this === null) {
            throw TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== "function") {
            throw TypeError();
        }
        var thisp = arguments[1], i;
        for (i = 0; i < len; i++) {
            if (i in t && !fun.call(thisp, t[i], i, t)) {
                return false;
            }
        }
        return true;
    };
}

// ES5 15.4.4.17 Array.prototype.some ( callbackfn [ , thisArg ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some
if (!Array.prototype.some) {
    Array.prototype.some = function(fun) {
        if (this === void 0 || this === null) {
            throw TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== "function") {
            throw TypeError();
        }
        var thisp = arguments[1], i;
        for (i = 0; i < len; i++) {
            if (i in t && fun.call(thisp, t[i], i, t)) {
                return true;
            }
        }
        return false;
    };
}

// ES5 15.4.4.18 Array.prototype.forEach ( callbackfn [ , thisArg ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/forEach
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(fun) {
        if (this === void 0 || this === null) {
            throw TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== "function") {
            throw TypeError();
        }
        var thisp = arguments[1], i;
        for (i = 0; i < len; i++) {
            if (i in t) {
                fun.call(thisp, t[i], i, t);
            }
        }
    };
}

// ES5 15.4.4.19 Array.prototype.map ( callbackfn [ , thisArg ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/Map
if (!Array.prototype.map) {
    Array.prototype.map = function(fun) {
        if (this === void 0 || this === null) {
            throw TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== "function") {
            throw TypeError();
        }
        var res = [];
        res.length = len;
        var thisp = arguments[1], i;
        for (i = 0; i < len; i++) {
            if (i in t) {
                res[i] = fun.call(thisp, t[i], i, t);
            }
        }
        return res;
    };
}

// ES5 15.4.4.20 Array.prototype.filter ( callbackfn [ , thisArg ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/Filter
if (!Array.prototype.filter) {
    Array.prototype.filter = function(fun) {
        if (this === void 0 || this === null) {
            throw TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== "function") {
            throw TypeError();
        }
        var res = [];
        var thisp = arguments[1], i;
        for (i = 0; i < len; i++) {
            if (i in t) {
                var val = t[i];
                // in case fun mutates this
                if (fun.call(thisp, val, i, t)) {
                    res.push(val);
                }
            }
        }
        return res;
    };
}

// ES5 15.4.4.21 Array.prototype.reduce ( callbackfn [ , initialValue ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/Reduce
if (!Array.prototype.reduce) {
    Array.prototype.reduce = function(fun) {
        if (this === void 0 || this === null) {
            throw TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== "function") {
            throw TypeError();
        }
        // no value to return if no initial value and an empty array
        if (len === 0 && arguments.length === 1) {
            throw TypeError();
        }
        var k = 0;
        var accumulator;
        if (arguments.length >= 2) {
            accumulator = arguments[1];
        } else {
            do {
                if (k in t) {
                    accumulator = t[k++];
                    break;
                }
                // if array contains no values, no initial value to return
                if (++k >= len) {
                    throw TypeError();
                }
            } while (true);
        }
        while (k < len) {
            if (k in t) {
                accumulator = fun.call(undefined, accumulator, t[k], k, t);
            }
            k++;
        }
        return accumulator;
    };
}

// ES5 15.4.4.22 Array.prototype.reduceRight ( callbackfn [, initialValue ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/ReduceRight
if (!Array.prototype.reduceRight) {
    Array.prototype.reduceRight = function(callbackfn) {
        if (this === void 0 || this === null) {
            throw TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof callbackfn !== "function") {
            throw TypeError();
        }
        // no value to return if no initial value, empty array
        if (len === 0 && arguments.length === 1) {
            throw TypeError();
        }
        var k = len - 1;
        var accumulator;
        if (arguments.length >= 2) {
            accumulator = arguments[1];
        } else {
            do {
                if (k in this) {
                    accumulator = this[k--];
                    break;
                }
                // if array contains no values, no initial value to return
                if (--k < 0) {
                    throw TypeError();
                }
            } while (true);
        }
        while (k >= 0) {
            if (k in t) {
                accumulator = callbackfn.call(undefined, accumulator, t[k], k, t);
            }
            k--;
        }
        return accumulator;
    };
}

//----------------------------------------------------------------------
// ES5 15.5 String Objects
//----------------------------------------------------------------------
//
// ES5 15.5.4 Properties of the String Prototype Object
//
// ES5 15.5.4.20 String.prototype.trim()
if (!String.prototype.trim) {
    String.prototype.trim = function() {
        return String(this).replace(/^\s+/, "").replace(/\s+$/, "");
    };
}

//----------------------------------------------------------------------
// ES5 15.9 Date Objects
//----------------------------------------------------------------------
//
// ES 15.9.4 Properties of the Date Constructor
//
// ES5 15.9.4.4 Date.now ( )
// From https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Date/now
if (!Date.now) {
    Date.now = function now() {
        return Number(new Date());
    };
}

//
// ES5 15.9.5 Properties of the Date Prototype Object
//
// ES5 15.9.4.43 Date.prototype.toISOString ( )
// Inspired by http://www.json.org/json2.js
if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function() {
        function pad2(n) {
            return ("00" + n).slice(-2);
        }
        function pad3(n) {
            return ("000" + n).slice(-3);
        }
        return this.getUTCFullYear() + "-" + pad2(this.getUTCMonth() + 1) + "-" + pad2(this.getUTCDate()) + "T" + pad2(this.getUTCHours()) + ":" + pad2(this.getUTCMinutes()) + ":" + pad2(this.getUTCSeconds()) + "." + pad3(this.getUTCMilliseconds()) + "Z";
    };
}