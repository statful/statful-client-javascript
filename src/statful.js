import 'usertiming';
import StatfulLogger from './logger';
import StatfulUtil from './statful-util';
import Metric from './metric.model';

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

const defaultConfig = {
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

export default class Statful {
    /**
     * Initialize the Statful client settings and register events
     * @param {Object} clientConfig
     */
    static initialize(clientConfig) {
        this.config = {
            apiAddress: 'https://beacon.statful.com'
        };

        this.endpoints = {
            metrics: 'beacon/metrics'
        };

        // Set default properties
        if (typeof clientConfig !== 'object' || clientConfig === null) {
            clientConfig = {};
        }

        Object.assign(this.config, defaultConfig);
        Object.assign(this.config, clientConfig);

        // Create Logger
        this.logger = new StatfulLogger(this.config.debug);

        // Create Util
        this.util = new StatfulUtil({
            apiAddress: this.config.apiAddress,
            debug: this.config.debug,
            dryrun: this.config.dryrun,
            flushInterval: this.config.flushInterval,
            timeout: this.config.timeout
        });

        //Register queue to send metrics
        this.util.registerQueue('metrics', this.endpoints.metrics, this.config.flushInterval);
    }

    /**
     * Measure a timer using the user timing specification
     * @param {string} measureName name of the measure to create
     * @returns {number}
     */
    static measureTimeUserTiming(measureName = '') {
        let time;
        let measure = window.performance.getEntriesByName(measureName).filter((entry) => {
            return entry.entryType === 'measure';
        });

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
    static clearMarks(marks) {
        try {
            if (marks) {
                marks.forEach((mark) => {
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
    static clearResources() {
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
    static clearMeasures(measures) {
        try {
            if (measures) {
                measures.forEach((measure) => {
                    window.performance.clearMeasures(measure);
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
    static registerMark(markName = '') {
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
    static registerMeasure(measureName, metricName, options = {}) {
        try {
            this.logger.debug('Register Measure', measureName, metricName, options);
            if (measureName) {
                let defaults = {
                    clearMarks: false,
                    clearMeasures: false
                };

                options = options || {};

                Object.keys(options).forEach((key) => {
                    defaults[key] = options[key];
                });

                // Create endMark if none is set
                if (!defaults.endMark) {
                    this.registerMark(measureName);
                    defaults.endMark = measureName;
                }

                window.performance.measure(measureName, defaults.startMark, defaults.endMark);

                // Measure timer
                let time = this.measureTimeUserTiming(measureName);

                if (time) {
                    // Push metrics to queue
                    let metricItem = new Metric(metricName, 'timer', time, defaults, this.config);
                    this.util.addItemToQueue('metrics', metricItem);
                } else {
                    this.logger.error('Failed to get measure time to register as timer value');
                }

                if (defaults.clearMarks) {
                    this.clearMarks([defaults.startMark, defaults.endMark]);
                }

                if (defaults.clearMeasures) {
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
    static timer(metricName, metricValue, options = {}) {
        try {
            this.logger.debug('Register Timer', metricName, metricValue, options);
            if (metricName && metricValue >= 0) {
                options = options || {};

                // Push metrics to queue
                let item = new Metric(metricName, 'timer', metricValue, options, this.config);
                this.util.addItemToQueue('metrics', item);
            } else {
                this.logger.error('Undefined metric name or invalid value to register as a timer');
            }
        } catch (ex) {
            this.logger.error(ex);
        }
    }

    /**
     * Register counter
     * @param {string} metricName - metric name to be sent
     * @param {number} metricValue - count value to be sent
     * @param {object} options - set of option (tags, agg, aggFreq, namespace)
     */
    static counter(metricName, metricValue, options = {}) {
        try {
            this.logger.debug('Register Counter', metricName, options);
            metricValue = metricValue || 1;

            if (metricName) {
                options = options || {};

                // Push metrics to queue
                let item = new Metric(metricName, 'counter', metricValue, options, this.config);
                this.util.addItemToQueue('metrics', item);
            } else {
                this.logger.error('Undefined metric name to register as a counter');
            }
        } catch (ex) {
            this.logger.error(ex);
        }
    }

    /**
     * Register gauge
     * @param {string} metricName metric name to be sent
     * @param {number} metricValue gauge value to be sent
     * @param {object} options - set of option (tags, agg, aggFreq, namespace)
     */
    static gauge(metricName, metricValue, options = {}) {
        try {
            this.logger.debug('Register Gauge', metricName, metricValue, options);
            if (metricName && metricValue) {
                // Push metrics to queue
                let item = new Metric(metricName, 'gauge', metricValue, options, this.config);
                this.util.addItemToQueue('metrics', item);
            } else {
                this.logger.error('Undefined metric name/value to register as a gauge');
            }
        } catch (ex) {
            this.logger.error(ex);
        }
    }
}
