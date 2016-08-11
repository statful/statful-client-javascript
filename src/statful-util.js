(function (window) {
    'use strict';

    function StatfulUtil(config) {
        config = config || {};
        var self = this;
        var logger;

        //Merge configs
        this.config = {};
        Object.keys(config).forEach(function (key) {
            self.config[key] = config[key];
        });

        this.listQueues = [];

        logger = new StatfulLogger(self.config.debug);

        /**
         * Sends HTTP request to the api
         * @param {string} endpoint - action
         * @param {string} type - GET /POST
         * @param {string} requestData - request data
         */
        this.sendRequest = function (endpoint, type, requestData) {
            try {
                var requestArr = [this.config.apiAddress, endpoint];
                var urlParams = type == 'GET' ? requestData : null;
                urlParams ? requestArr.push(urlParams) : null;
                var requestUrl = requestArr.join('/');

                logger.debug('Request: ' + requestUrl);

                var xmlHttp = new XMLHttpRequest();
                xmlHttp.timeout = config.timeout;

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
                logger.error(ex);
            }
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
                            self.sendRequest(queue.endpoint, 'POST', JSON.stringify(queue.data));
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

            Object.keys(methodTags).forEach(function (key) {
                tags[key] = methodTags[key];
            });

            if (!tags.env && environment) {
                tags.env = environment;
            }

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
            var agg = ['avg', 'count', 'sum', 'first', 'last', 'p90', 'p95', 'min', 'max'];

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
            var frequencyList = [10, 30, 60, 120, 180, 300];
            var freq = 10;

            if (frequencyList.indexOf(frequency) > -1) {
                freq = frequency;
            }

            return freq;
        };
    }

    window.StatfulUtil = StatfulUtil;

})(window);
