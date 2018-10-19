import StatfulLogger from './logger';

export default class StatfulUtil {
    constructor(config) {
        this.config = {};
        Object.assign(this.config, config);

        this.logger = new StatfulLogger(this.config.debug);
        let flushInterval = 10000;

        if (
            this.config &&
            this.config.flushInterval &&
            typeof this.config.flushInterval === 'number' &&
            this.config.flushInterval > 0
        ) {
            flushInterval = this.config.flushInterval;
        }

        this.registerQueue(flushInterval);
    }

    /**
     * Sends data
     * @param {object} data
     */
    sendData(data) {
        const requestUrl = `${this.config.apiAddress}/beacon/metrics`;
        const requestData = JSON.stringify(data);

        if (!this.config.dryrun) {
            const xmlHttp = new XMLHttpRequest();
            xmlHttp.open('POST', requestUrl, true);
            xmlHttp.timeout = this.config.timeout;

            //Send the proper header information along with the request
            xmlHttp.setRequestHeader('Content-type', 'application/json');
            xmlHttp.send(requestData);

            xmlHttp.onreadystatechange = () => {
                if (xmlHttp.status == 200 || xmlHttp.status == 201) {
                    this.logger.debug('Successfully send metric');
                } else {
                    this.logger.debug(
                        'Error send metric',
                        requestUrl,
                        xmlHttp.status
                    );
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
    registerQueue(flushInterval) {
        let metricsTimer;

        this.metricsQueue = [];

        if (typeof flushInterval === 'number' && flushInterval > 0) {
            metricsTimer = setInterval(() => {
                if (this.metricsQueue.length > 0) {
                    this.sendData(this.metricsQueue);
                    this.metricsQueue = [];
                }
            }, flushInterval);

            window.addEventListener('beforeunload', () => {
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
    addMetric(metric = {}, usingQueue = true) {
        if (
            metric &&
            typeof metric.isValid === 'function' &&
            metric.isValid()
        ) {
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
    shouldAddMetric(metric = {}) {
        const sampleRate =
            (metric.sampleRate || this.config.sampleRate || 100) / 100;

        return Math.random() <= sampleRate;
    }
}
