(function (window) {
    'use strict';

    /**
     * @description
     *
     * This object provides a client for the Statful service to register
     * application metrics. It can be called as follows:
     *
     * statful.initialize({
     *  environment: 'local',
     *  namespace: 'mobile'
     *  });
     * statful.registerMeasure('your.measure.name', 'your.metric.name');
     *
     */

    var defaultConfig = {
        dryrun: false,
        environment: undefined,
        namespace: 'web',
        tags: {},
        aggregations: [],
        aggregationFrequency: 10,
        timer: {
            tags: {},
            aggregations: ['avg', 'p90', 'count']
        },
        counter: {
            tags: {},
            aggregations: ['sum', 'count']
        },
        gauge: {
            tags: {},
            aggregations: ['sum', 'count']
        },
        other: {
            tags: {},
            aggregations: ['last'],
            aggregationFrequency: 10
        },
        registerResourceErrors: false,
        resourceErrorsNameTracking: {},
        resourceErrorsTypeBlacklist: [],
        registerResourceLoading: true,
        resourceLoadingTrackingInterval: 5000,
        resourceLoadingTypeBlacklist: [],
        resourceLoadingPathFilter: function (name) {
            return name;
        },
        resourceLoadingNameTracking: {},
        flushInterval: 30000
    };

    var statful = {
        apiAddress: '//beacon.telemetron.io',
        endpoints: {
            metrics: 'beacon/metrics'
        },
        perf: window.performance,

        /**
         * Initialize the Statful client settings and register events
         */
        initialize: function (settings) {
            var self = this;

            if (typeof settings !== 'object' || settings === null) {
                settings = {};
            }

            // Set default properties
            Object.keys(defaultConfig).forEach(function (key) {
                self[key] = defaultConfig[key];
            });

            Object.keys(settings).forEach(function (key) {
                self[key] = settings[key];
            });

            self.util = new StatfulUtil({
                apiAddress: this.apiAddress,
                dryrun: this.dryrun,
                flushInterval: this.flushInterval
            });

            self.util.registerQueue('metrics', this.endpoints.metrics, this.flushInterval);

            if (self.registerResourceErrors) {
                self.trackResourceErrors();
            }

            if (self.registerResourceLoading && self.util.isResourceTimingSupported()) {
                self.trackResourceLoading();
            }

            // Metrics data object
            self.metricsData = function (name, type, value, tags, aggregations, aggregationFrequency) {
                return {
                    name: name,
                    type: type,
                    value: value,
                    tags: self.util.setTags(tags, self.tags, self[type].tags, self.environment, self.app),
                    aggregations: self.util.setAggregations(aggregations, self.aggregations, self[type].aggregations),
                    aggregationFrequency: self.util.setAggregationFrequency(aggregationFrequency, self.aggregationFrequency, self[type].aggregationFrequency),
                    namespace: self.namespace
                };
            };
        },

        /**
         * Track resource load error metrics
         */
        trackResourceErrors: function () {
            var self = this;

            // Apply user defined black list filter on resources to track errors
            var allElementsToCatch = ['IMG', 'SCRIPT', 'LINK'];
            var resourceErrorsTypeBlacklistUpperCase = self.resourceErrorsTypeBlacklist.map(function (value) {
                return value.toUpperCase();
            });
            var resourceEntriesToTrackErrors = allElementsToCatch.filter(function filter(entry) {
                // Exclude blacklisted types
                return resourceErrorsTypeBlacklistUpperCase.indexOf(entry) === -1;
            });

            window.addEventListener('error', function (event) {
                var element = event.target;
                if (resourceEntriesToTrackErrors.indexOf(element.tagName) != -1) {
                    var resourceUrl = element.tagName == 'LINK' ? element.href : element.src;
                    var tags = {};
                    if (self.resourceErrorsNameTracking.hasOwnProperty(element.tagName.toLowerCase())) {
                        // Apply user defined filter to resource error name
                        tags.resource = self.resourceErrorsNameTracking[element.tagName.toLowerCase()](resourceUrl);
                    }

                    self.util.addItemToQueue('metrics', new self.metricsData('resource.error', 'counter', 1, tags));

                    // if return it's true, we avoid that error be thrown to the console too
                    return false;
                }
            }, true);
        },

        /**
         * Track resource loading metrics
         */
        trackResourceLoading: function () {
            var self = this;

            function addResourceToQueue(value, action, tags) {
                tags.action = action;
                self.util.addItemToQueue('metrics', new self.metricsData('resource', 'timer', value, tags));
            }

            setInterval(function trackResourceLoadingInterval() {
                var resourceEntries = self.util.filterResources(self.resourceLoadingTypeBlacklist,
                    self.resourceLoadingPathFilter, statful.perf.getEntriesByType('resource'));

                resourceEntries.forEach(function handleResource(resource) {
                    var tags, attrs;
                    attrs = self.util.measureResource(resource);

                    // ignore resources that have no attribute timers
                    if (Object.getOwnPropertyNames(attrs).length > 0) {
                        tags = self.util.tagResource(resource, self.resourceLoadingNameTracking);

                        if (self.util.isResourceTimingComplete(attrs.domainLookup, attrs.connect, attrs.ssl, attrs.request, attrs.response)) {
                            addResourceToQueue(attrs.fetch, 'fetch', tags);
                            addResourceToQueue(attrs.domainLookup, 'domainLookup', tags);
                            addResourceToQueue(attrs.connect, 'connect', tags);
                            addResourceToQueue(attrs.ssl, 'ssl', tags);
                            addResourceToQueue(attrs.request, 'request', tags);
                            addResourceToQueue(attrs.response, 'response', tags);
                            addResourceToQueue(attrs.load, 'load', tags);
                        } else {
                            addResourceToQueue(attrs.fetch, 'fetch', tags);
                            addResourceToQueue(attrs.load, 'load', tags);
                        }
                    }
                });

                self.clearResources();
            }, self.resourceLoadingTrackingInterval);
        },

        ////////////////////////////////////////
        // user timing spec methods

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
                console.log('Measure ' + measureName + ' not found');
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
                console.log(ex);
            }
        },

        /**
         * Clear resources
         */
        clearResources: function () {
            try {
                statful.perf.clearResourceTimings();
            } catch (ex) {
                console.log(ex);
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
                console.log(ex);
            }
        },

        /**
         * Register a mark using the user timing specification
         * @param markName - name of the mark to add
         */
        registerMark: function (markName) {
            try {
                if (markName) {
                    statful.perf.mark(markName);
                } else {
                    console.log('Undefined resource name to register as a mark');
                }
            } catch (ex) {
                console.log(ex);
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
                            defaults.tags, defaults.aggregations, defaults.aggregationFrequency));
                    } else {
                        console.log('Failed to get measure time to register as timer value');
                    }

                    if (defaults.clearMarks) {
                        this.clearMarks([defaults.startMark, defaults.endMark]);
                    }

                    if (defaults.clearMeasures) {
                        this.clearMeasures([measureName]);
                    }
                } else {
                    console.log('Undefined resource name to register as a measure');
                }
            } catch (ex) {
                console.log(ex);
            }
        },

        ////////////////////////////////////////
        // statful client access methods

        /**
         * Register timer
         * @param {string} metricName - metric name to be used as metric name (Ex: timeto.firstclick)
         * @param {number} metricValue - timer value to be sent
         * @param {object} options - set of option (tags and aggregations)
         */
        registerTimer: function (metricName, metricValue, options) {
            try {
                if (metricName && metricValue) {
                    options = options || {};

                    // Push metrics to queue
                    this.util.addItemToQueue('metrics', new this.metricsData(metricName, 'timer', metricValue,
                        options.tags, options.aggregations, options.aggregationFrequency));
                } else {
                    console.log('Undefined metric name/value to register as a timer');
                }
            } catch (ex) {
                console.log(ex);
            }
        },

        /**
         * Register counter
         * @param {string} metricName metric name to be sent (Ex: navigation.success)
         * @param {object} options - set of option (metricValue, tags and aggregations)
         */
        registerCounter: function (metricName, options) {
            try {
                console.log(metricName);

                if (metricName) {
                    options = options || {};

                    // Set counter default value if not defined
                    options.metricValue = options.metricValue || 1;

                    // Push metrics to queue
                    this.util.addItemToQueue('metrics', new this.metricsData(metricName, 'counter', options.metricValue,
                        options.tags, options.aggregations, options.aggregationFrequency));
                } else {
                    console.log('Undefined metric name to register as a counter');
                }
            } catch (ex) {
                console.log(ex);
            }
        },

        /**
         * Register gauge
         * @param {string} metricName metric name to be sent (Ex: navigation.success)
         * @param {number} metricValue gauge value to be sent
         * @param {object} options - set of option (tags and aggregations)
         */
        registerGauge: function (metricName, metricValue, options) {
            try {
                if (metricName && metricValue) {
                    options = options || {};

                    // Push metrics to queue
                    this.util.addItemToQueue('metrics', new this.metricsData(metricName, 'gauge', metricValue,
                        options.tags, options.aggregations, options.aggregationFrequency));
                } else {
                    console.log('Undefined metric name/value to register as a gauge');
                }
            } catch (ex) {
                console.log(ex);
            }
        }
    };

    //# Polyfill
    window.addEventListener = window.addEventListener || function (e, f) {
            window.attachEvent('on' + e, f);
        };

    window.statful = statful;

})(window);
