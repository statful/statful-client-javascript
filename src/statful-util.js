(function (window) {
    'use strict';

    function StatfulUtil(config) {
        config = config || {};
        var self = this;

        //Merge configs
        Object.keys(config).forEach(function (key) {
            self[key] = config[key];
        });

        this.listQueues = [];

        /**
         * Sends HTTP request to the api
         * @param {string} endpoint - action
         * @param {string} type - GET /POST
         * @param {string} requestData - request data
         */
        this.sendRequest = function (endpoint, type, requestData) {
            try {
                var requestArr = [this.apiAddress, endpoint];
                var urlParams = type == 'GET' ? requestData : null;
                urlParams ? requestArr.push(urlParams) : null;
                var requestUrl = requestArr.join('/');

                console.log('Request: ' + requestUrl);


                var xmlHttp = new XMLHttpRequest();

                xmlHttp.open(type, requestUrl, true);

                switch (type) {
                    case 'POST':
                        //Send the proper header information along with the request
                        xmlHttp.setRequestHeader('Content-type', 'application/json');
                        xmlHttp.send(requestData);
                        break;
                    case 'GET':
                        xmlHttp.send(null);
                        break;
                }
            }
            catch (ex) {
                console.log(ex);
            }
        };

        /**
         * Register a new queue
         * @param {string} queueName - queue name
         * @param {string} endpoint - endpoint to send requests
         * @param {int} timeInterval - interval in milliseconds, default 30000 ms
         */
        this.registerQueue = function (queueName, endpoint, timeInterval) {
            timeInterval = timeInterval || this.flushInterval;

            if (typeof queueName === 'string' && typeof timeInterval === 'number') {
                var self = this;

                this.listQueues[queueName] = {
                    data: [],
                    endpoint: endpoint
                };

                this.listQueues[queueName].timer = setInterval(function () {
                    var queue = self.listQueues[queueName];

                    if (!self.dryrun && queue.data.length > 0) {
                        self.sendRequest(queue.endpoint, 'POST', JSON.stringify(queue.data));
                    } else {
                        console.log(queue.endpoint, queue.data);
                    }

                    queue.data = [];
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
            if (this.listQueues[queueName]) {
                this.listQueues[queueName].data.push(item);
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
         * @param {string} environment - environment tag value
         * @param {string} app - app tag value
         * @returns {*}
         */
        this.setTags = function (methodTags, globalTags, typeTags, environment, app) {
            var tags = {};

            Object.keys(globalTags).forEach(function (key) {
                tags[key] = globalTags[key];
            });

            Object.keys(typeTags).forEach(function (key) {
                tags[key] = typeTags[key];
            });


            if (!methodTags) {
                tags = tags || {};

                if (environment) {
                    tags.env = environment;
                }
            } else {
                Object.keys(methodTags).forEach(function (key) {
                    tags[key] = methodTags[key];
                });

                if (!tags.env && environment) {
                    tags.env = environment;
                }

                if (!tags.app && app) {
                    tags.app = app;
                }
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
            var agg = ['avg', 'count', 'sum', 'first', 'last', 'p90', 'p95', 'min', 'max', 'derivative'];

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
        this.filterAggregationFrequency = function (frequency) {
            var frequencyList = [10, 30, 60, 120, 180, 300];
            var freq = 10;

            if (frequencyList.indexOf(frequency) > -1) {
                freq = frequency;
            }

            return freq;
        };

        /**
         * Validates if the browser support the resource timing specification
         * @returns {boolean}
         */
        this.isResourceTimingSupported = function () {
            return !!(window.performance && window.performance.clearResourceTimings);
        };

        /**
         * Validates if the resource is considered a DNS/TCP/TLS failure
         * @param domainLookupStart {number}
         * @param connectStart {number}
         * @param requestStart {number}
         * @param responseStart {number}
         * @returns {boolean}
         */
        this.isResourceFailure = function (domainLookupStart, connectStart, requestStart, responseStart) {
            return domainLookupStart === 0 || connectStart === 0 || requestStart === 0 || responseStart === 0;
        };

        /**
         * Validate if the resource originated from a cross origin request
         * @param duration {number}
         * @param fetchStart {number}
         * @param responseEnd {number}
         * @returns {boolean}
         */
        this.isResourceCrossOrigin = function (duration, fetchStart, responseEnd) {
            return duration !== 0 && fetchStart !== 0 && responseEnd !== 0;
        };

        /**
         * Validate the resource metrics calculated are all valid
         * @param domainLookup {number}
         * @param connect {number}
         * @param ssl {number}
         * @param request {number}
         * @param response {number}
         * @returns {boolean}
         */
        this.isResourceTimingComplete = function (domainLookup, connect, ssl, request, response) {
            return domainLookup !== undefined && connect !== undefined && ssl !== undefined && request !== undefined && response !== undefined;
        };

        /**
         * Filter desired resources only
         * @param typeBlacklist
         * @param pathFilter
         * @param resources
         * @returns {*|Array.<T>}
         */
        this.filterResources = function (typeBlacklist, pathFilter, resources) {
            var filteredResources;

            filteredResources = resources.filter(function filter(entry) {
                // Exclude blacklisted types
                if (typeBlacklist.indexOf(entry.initiatorType) === -1) {
                    // Apply user defined filtering function
                    try {
                        return pathFilter(entry.name);
                    } catch (ex) {
                        console.log(ex);
                        return false;
                    }
                } else {
                    return false;
                }
            });

            return filteredResources;
        };

        /**
         * Calculate measures based on the resource attribute timers
         * @param resource
         * @returns {{}}
         */
        this.measureResource = function (resource) {
            var attributes = {};

            /**
             * DNS/TCP/TLS failures are represented in IE/Firefox with zero values in most attributes
             * Chrome does not create a ResourceTiming entry for failures
             */
            if (this.isResourceFailure(resource.domainLookupStart, resource.connectStart, resource.requestStart, resource.responseStart)) {
                if (this.isResourceCrossOrigin(resource.duration, resource.fetchStart, resource.responseEnd)) {
                    attributes.fetch = resource.responseEnd - resource.fetchStart;
                    attributes.load = resource.duration;
                }
            } else {
                attributes.fetch = resource.responseEnd - resource.fetchStart;
                attributes.domainLookup = resource.domainLookupEnd - resource.domainLookupStart;
                attributes.connect = resource.connectEnd - resource.connectStart;
                attributes.ssl = resource.secureConnectionStart ? (resource.connectEnd - resource.secureConnectionStart) : 0;
                attributes.request = resource.responseStart - resource.requestStart;
                attributes.response = resource.responseEnd - resource.responseStart;
                attributes.load = resource.duration;
            }

            return attributes;
        };

        /**
         * Builds a tags object based on the resource attributes
         * @param resource
         * @param trackResourceName

         * @returns {{}}
         */
        this.tagResource = function (resource, trackResourceName) {
            var tags = {};

            try {
                tags.initiator = resource.initiatorType;

                if (trackResourceName.hasOwnProperty(tags.initiator)) {
                    tags.resource = trackResourceName[tags.initiator](resource.name);
                }
            } catch (ex) {
                console.log(ex);
            }

            return tags;
        };
    }

    window.StatfulUtil = StatfulUtil;

})(window);
