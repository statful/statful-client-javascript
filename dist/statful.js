/**
* statful-client-javascript 2.1.2
* Copyright 2018 Statful <https://www.statful.com/>
*/

var statful = (function () {
'use strict';

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

            //Inject preconnect link
            var linkElement = document.createElement('link');
            linkElement.rel = 'preconnect';
            linkElement.href = this.config.apiAddress;

            document.getElementsByTagName('head')[0].appendChild(linkElement);
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
