import StatfulLogger from './logger';

export default class StatfulUtil {
    constructor(config) {
        this.config = {};
        Object.assign(this.config, config);

        this.logger = new StatfulLogger(this.config.debug);
        if (this.config && this.config.flushInterval) {
            this.registerQueue(this.config.flushInterval);
        }
    }

    /**
     * Sends HTTP request to the api
     * @param {object} requestData - request data
     */
    sendRequest(requestData) {
        const requestUrl = `${this.config.apiAddress}/beacon/metrics`;
        requestData = JSON.stringify(requestData);

        this.logger.debug('Request: ${requestUrl}', requestData);

        let xmlHttp = new XMLHttpRequest();
        xmlHttp.open('POST', requestUrl, true);
        xmlHttp.timeout = this.config.timeout;

        //Send the proper header information along with the request
        xmlHttp.setRequestHeader('Content-type', 'application/json');
        xmlHttp.send(requestData);

        xmlHttp.onreadystatechange = () => {
            if (xmlHttp.status == 200 || xmlHttp.status == 201) {
                this.logger.debug('Successfully send metric');
            } else {
                this.logger.debug('Error send metric', requestUrl, xmlHttp.status);
            }
        };
    }

    /**
     * Register a new queue
     * @param {number} flushInterval
     */
    registerQueue(flushInterval) {
        let metricsTimer;

        this.metricsQueue = [];

        if (typeof this.config.flushInterval === 'number' && flushInterval > 0) {
            metricsTimer = setInterval(() => {
                if (this.metricsQueue.length > 0) {
                    if (!this.config.dryrun) {
                        this.sendRequest(this.metricsQueue);
                    } else {
                        this.logger.debug('Dryrun data', this.metricsQueue);
                    }
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
     * Sends a metric to the queue
     * @param {object} metric - object to be sent
     */
    addMetricToQueue(metric = {}) {
        const sampleRateNormalized = (metric.sampleRate || this.config.sampleRate || 100) / 100;

        if (Math.random() <= sampleRateNormalized) {
            this.metricsQueue.push(metric);
            return true;
        } else {
            this.logger.debug('Metric was discarded due to sample rate.');
            return false;
        }
    }
}
