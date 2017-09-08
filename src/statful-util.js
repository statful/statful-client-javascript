import StatfulLogger from './logger';

export default class StatfulUtil {
    constructor(config) {
        this.config = {};
        this.listQueues = [];

        Object.keys(config).forEach((key) => {
            this.config[key] = config[key];
        });

        this.logger = new StatfulLogger(this.config.debug);
    }

    /**
     * Sends HTTP request to the api
     * @param {string} endpoint - action
     * @param {string} requestData - request data
     */
    sendRequest(endpoint, requestData) {
        let requestArr = [this.config.apiAddress, endpoint];
        const requestUrl = requestArr.join('/');

        this.logger.debug('Request: ' + requestUrl, requestData);

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
     * @param {string} queueName - queue name
     * @param {string} endpoint - endpoint to send requests
     * @param {int} timeInterval - interval in milliseconds, default 30000 ms
     */
    registerQueue(queueName, endpoint, timeInterval) {
        timeInterval = timeInterval || this.config.flushInterval;

        if (typeof queueName === 'string' && typeof timeInterval === 'number') {
            this.listQueues[queueName] = {
                data: [],
                endpoint: endpoint
            };

            this.listQueues[queueName].timer = setInterval(() => {
                let queue = this.listQueues[queueName];

                if (queue.data.length > 0) {
                    if (!this.config.dryrun) {
                        this.sendRequest(queue.endpoint, JSON.stringify(queue.data));
                    } else {
                        this.logger.debug('Dryrun data', queue.endpoint, queue.data);
                    }
                    queue.data = [];
                }

            }, timeInterval);

            return true;
        } else {
            return false;
        }
    }

    /**
     * Unregister queue
     * @param {string} queueName - queue name
     */
    unregisterQueue(queueName) {
        if (this.listQueues[queueName]) {
            clearInterval(this.listQueues[queueName].timer);
            this.listQueues[queueName] = undefined;
        }
    }

    /**
     * Sends an Item to a specific queue
     * @param {string} queueName - queue name
     * @param {object} item - object to be sent
     */
    addItemToQueue(queueName, item = {}) {
        let sampleRateNormalized = (item.sampleRate || this.config.sampleRate || 100) / 100;

        if (this.listQueues[queueName] && Math.random() <= sampleRateNormalized) {
            this.listQueues[queueName].data.push(item);
            return true;
        } else {
            this.logger.debug('Metric was discarded due to sample rate.');
            return false;
        }
    }
}
