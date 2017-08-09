/**
* statful-client-javascript 2.0.2
* Copyright 2017 Statful <https://www.statful.com/>
*/

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.statful = factory());
}(this, (function () { 'use strict';

/* eslint-disable no-console */

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

function StatfulUtil(config) {
    config = config || {};
    var self = this;
    var logger;

    //Merge configs
    this.config = {};

    this.constants = {
        aggregationList: ['avg', 'count', 'sum', 'first', 'last', 'p90', 'p95', 'min', 'max'],
        aggregationFrequencyList: [10, 30, 60, 120, 180, 300]
    };

    Object.keys(config).forEach(function (key) {
        self.config[key] = config[key];
    });

    this.listQueues = [];

    logger = new Logger(self.config.debug);

    /**
     * Sends HTTP request to the api
     * @param {string} endpoint - action
     * @param {string} requestData - request data
     */
    this.sendRequest = function (endpoint, requestData) {
        var requestArr = [this.config.apiAddress, endpoint];
        var requestUrl = requestArr.join('/');

        logger.debug('Request: ' + requestUrl, requestData);

        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open('POST', requestUrl, true);
        xmlHttp.timeout = config.timeout;

        //Send the proper header information along with the request
        xmlHttp.setRequestHeader('Content-type', 'application/json');
        xmlHttp.send(requestData);

        xmlHttp.onreadystatechange = function () {
            if (xmlHttp.status == 200 || xmlHttp.status == 201) {
                logger.debug('Successfully send metric');
            } else {
                logger.debug('Error send metric', requestUrl, xmlHttp.status);
            }
        };
    };

    /**
     * Register a new queue
     * @param {string} queueName - queue name
     * @param {string} endpoint - endpoint to send requests
     * @param {int} timeInterval - interval in milliseconds, default 30000 ms
     */
    this.registerQueue = function (queueName, endpoint, timeInterval) {
        timeInterval = timeInterval || this.config.flushInterval;

        if (typeof queueName === 'string' && typeof timeInterval === 'number') {
            var self = this;

            this.listQueues[queueName] = {
                data: [],
                endpoint: endpoint
            };

            this.listQueues[queueName].timer = setInterval(function () {
                var queue = self.listQueues[queueName];

                if (queue.data.length > 0) {
                    if (!self.config.dryrun) {
                        self.sendRequest(queue.endpoint, JSON.stringify(queue.data));
                    } else {
                        logger.debug('Dryrun data', queue.endpoint, queue.data);
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
    this.unregisterQueue = function (queueName) {
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
    this.addItemToQueue = function (queueName, item) {
        var sampleRateNormalized = (item.sampleRate || this.config.sampleRate || 100) / 100;

        if (this.listQueues[queueName] && Math.random() <= sampleRateNormalized) {
            this.listQueues[queueName].data.push(item);
            return true;
        } else {
            logger.debug('Metric was discarded due to sample rate.');
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
    this.setAggregations = function (methodAggregations, globalAggregations, typeAggregations) {
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
    this.setTags = function (methodTags, globalTags, typeTags, app) {
        var tags = {};

        Object.keys(globalTags).forEach(function (key) {
            tags[key] = globalTags[key];
        });

        Object.keys(typeTags).forEach(function (key) {
            tags[key] = typeTags[key];
        });

        Object.keys(methodTags).forEach(function (key) {
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
    this.setAggregationFrequency = function (methodFrequency, globalFrequency, typeFrequency) {
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
    this.filterAggregations = function (aggregations) {
        var agg = this.constants.aggregationList;

        aggregations = aggregations || [];

        return aggregations.filter(function (item) {
            return agg.indexOf(item) !== -1;
        });
    };

    /**
     * Filter unsupported frequencies
     * @param {number} frequency - aggregation frequency
     * @returns {*}
     */
    this.filterAggregationFrequency = function (frequency) {
        var frequencyList = this.constants.aggregationFrequencyList;
        var freq = 10;

        if (frequencyList.indexOf(frequency) > -1) {
            freq = frequency;
        }

        return freq;
    };
}

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

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

var logger;

var statful = {
    config: {
        apiAddress: 'https://beacon.statful.com'
    },
    endpoints: {
        metrics: 'beacon/metrics'
    },
    perf: window.performance,

    /**
     * Initialize the Statful client settings and register events
     */
    initialize: function initialize(clientConfig) {
        var self = this;

        //Private functions
        self.mergeConfigs = function (clientConfig) {
            if ((typeof clientConfig === 'undefined' ? 'undefined' : _typeof(clientConfig)) !== 'object' || clientConfig === null) {
                clientConfig = {};
            }

            // Set default properties
            Object.keys(defaultConfig).forEach(function (key) {
                self.config[key] = defaultConfig[key];
            });

            Object.keys(clientConfig).forEach(function (key) {
                self.config[key] = clientConfig[key];
            });
        };

        self.metricsData = function (name, type, value, tags, aggregations, aggregationFrequency, namespace, sampleRate) {
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
        logger = new Logger(self.config.debug);

        // Create Util
        self.util = new StatfulUtil({
            apiAddress: this.config.apiAddress,
            debug: this.config.debug,
            dryrun: this.config.dryrun,
            flushInterval: this.config.flushInterval,
            timeout: this.config.timeout
        });

        //Register queue to send metrics
        self.util.registerQueue('metrics', this.endpoints.metrics, this.config.flushInterval);
    },

    /**
     * Measure a timer using the user timing specification
     * @param {string} measureName name of the measure to create
     * @returns {number}
     */
    measureTimeUserTiming: function measureTimeUserTiming(measureName) {
        var time;
        var measure = statful.perf.getEntriesByName(measureName).filter(function filterMeasures(entry) {
            return entry.entryType === 'measure';
        });

        if (measure.length > 0) {
            // Always use the most recent measure if more exist
            time = measure[measure.length - 1].duration;
        } else {
            logger.debug('Measure ' + measureName + ' not found');
        }

        return time;
    },

    /**
     * Clear marks
     * @param {Array} marks - list of marks to clear (optional)
     */
    clearMarks: function clearMarks(marks) {
        try {
            if (marks) {
                marks.forEach(function (mark) {
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
    clearResources: function clearResources() {
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
    clearMeasures: function clearMeasures(measures) {
        try {
            if (measures) {
                measures.forEach(function (measure) {
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
    registerMark: function registerMark(markName) {
        try {
            logger.debug('Register Mark', markName);
            if (markName) {
                statful.perf.mark(markName);
            } else {
                logger.error('Undefined resource name to register as a mark');
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
    registerMeasure: function registerMeasure(measureName, metricName, options) {
        try {
            logger.debug('Register Measure', measureName, metricName, options);
            if (measureName) {
                var defaults$$1 = {
                    clearMarks: false,
                    clearMeasures: false
                };

                options = options || {};

                Object.keys(options).forEach(function (key) {
                    defaults$$1[key] = options[key];
                });

                // Create endMark if none is set
                if (!defaults$$1.endMark) {
                    this.registerMark(measureName);
                    defaults$$1.endMark = measureName;
                }

                statful.perf.measure(measureName, defaults$$1.startMark, defaults$$1.endMark);

                // Measure timer
                var time = this.measureTimeUserTiming(measureName);

                if (time) {
                    // Push metrics to queue
                    this.util.addItemToQueue('metrics', new this.metricsData(metricName, 'timer', time, defaults$$1.tags, defaults$$1.aggregations, defaults$$1.aggregationFrequency, defaults$$1.namespace, defaults$$1.sampleRate));
                } else {
                    logger.error('Failed to get measure time to register as timer value');
                }

                if (defaults$$1.clearMarks) {
                    this.clearMarks([defaults$$1.startMark, defaults$$1.endMark]);
                }

                if (defaults$$1.clearMeasures) {
                    this.clearMeasures([measureName]);
                }
            } else {
                logger.error('Undefined resource name to register as a measure');
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
    timer: function timer(metricName, metricValue, options) {
        try {
            logger.debug('Register Timer', metricName, metricValue, options);
            if (metricName && metricValue >= 0) {
                options = options || {};

                // Push metrics to queue
                var item = new this.metricsData(metricName, 'timer', metricValue, options.tags, options.agg, options.aggFreq, options.namespace, options.sampleRate);
                this.util.addItemToQueue('metrics', item);
            } else {
                logger.error('Undefined metric name or invalid value to register as a timer');
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
    counter: function counter(metricName, metricValue, options) {
        try {
            logger.debug('Register Counter', metricName, options);
            metricValue = metricValue || 1;

            if (metricName) {
                options = options || {};

                // Push metrics to queue
                var item = new this.metricsData(metricName, 'counter', metricValue, options.tags, options.agg, options.aggFreq, options.namespace, options.sampleRate);
                this.util.addItemToQueue('metrics', item);
            } else {
                logger.error('Undefined metric name to register as a counter');
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
    gauge: function gauge(metricName, metricValue, options) {
        try {
            logger.debug('Register Gauge', metricName, metricValue, options);
            if (metricName && metricValue) {
                options = options || {};

                // Push metrics to queue
                var item = new this.metricsData(metricName, 'gauge', metricValue, options.tags, options.agg, options.aggFreq, options.namespace, options.sampleRate);
                this.util.addItemToQueue('metrics', item);
            } else {
                logger.error('Undefined metric name/value to register as a gauge');
            }
        } catch (ex) {
            logger.error(ex);
        }
    }
};

return statful;

})));
