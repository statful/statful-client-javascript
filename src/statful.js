import StatfulLogger from './logger';
import StatfulUtil from './statful-util';

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
    initialize: function (clientConfig) {
        var self = this;

        //Private functions
        self.mergeConfigs = function (clientConfig) {
            if (typeof clientConfig !== 'object' || clientConfig === null) {
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
        self.util.registerQueue('metrics', this.endpoints.metrics, this.config.flushInterval);
    },

    /**
     * Measure a timer using the user timing specification
     * @param {string} measureName name of the measure to create
     * @returns {number}
     */
    measureTimeUserTiming: function (measureName) {
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
    clearMarks: function (marks) {
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
    clearResources: function () {
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
    clearMeasures: function (measures) {
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
    registerMark: function (markName) {
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
    registerMeasure: function (measureName, metricName, options) {
        try {
            logger.debug('Register Measure', measureName, metricName, options);
            if (measureName) {
                var defaults = {
                    clearMarks: false,
                    clearMeasures: false
                };

                options = options || {};


                Object.keys(options).forEach(function (key) {
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
                    this.util.addItemToQueue('metrics', new this.metricsData(metricName, 'timer', time,
                        defaults.tags, defaults.aggregations, defaults.aggregationFrequency, defaults.namespace, defaults.sampleRate));
                } else {
                    logger.error('Failed to get measure time to register as timer value');
                }

                if (defaults.clearMarks) {
                    this.clearMarks([defaults.startMark, defaults.endMark]);
                }

                if (defaults.clearMeasures) {
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
    timer: function (metricName, metricValue, options) {
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
    counter: function (metricName, metricValue, options) {
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
    gauge: function (metricName, metricValue, options) {
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

export default statful;
