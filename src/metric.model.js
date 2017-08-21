const aggregationList = ['avg', 'count', 'sum', 'first', 'last', 'p90', 'p95', 'min', 'max'];
const aggregationFrequencyList = [10, 30, 60, 120, 180, 300];

export default class Metric {
    constructor(name = '', type = '', value = '', options = {}, config = {}) {
        this.name = name;
        this.type = type;
        this.value = value;

        let typeTags = [];
        let typeAggregations = [];
        let typeAggregationFrequency = 0;

        if (config[type]) {
            typeTags = config[type].tags;
            typeAggregations = config[type].aggregations;
            typeAggregationFrequency = config[type].aggregationFrequency;
        }

        this.tags = this.setTags(options.tags, config.tags, typeTags, config.app);
        this.aggregations = this.setAggregations(options.aggregations, config.aggregations, typeAggregations);
        this.aggregationFrequency = this.setAggregationFrequency(options.aggregationFrequency, config.aggregationFrequency, typeAggregationFrequency);
        this.namespace = options.namespace || config.namespace;
        this.sampleRate = options.sampleRate || config.sampleRate;
    }

    /**
     * Define tags for a metric type
     * @param {object} methodTags - list of method tags
     * @param {object} globalTags - list of global tags
     * @param {object} typeTags - list of type tags
     * @param {string} app - app tag value
     * @returns {*}
     */
    setTags(methodTags = {}, globalTags = {}, typeTags = {}, app) {
        let tags = {};

        Object.assign(tags, globalTags);
        Object.assign(tags, typeTags);
        Object.assign(tags, methodTags);

        if (!tags.app && app) {
            tags.app = app;
        }

        return tags;
    }

    /**
     * Define aggregations for a metric type
     * @param {Array} methodAggregations - list of method aggregations
     * @param {Array} globalAggregations - list of global aggregations
     * @param {Array} typeAggregations - list of type aggregations
     * @returns {*|Array}
     */
    setAggregations(methodAggregations = [], globalAggregations = [], typeAggregations = []) {
        let aggregations = globalAggregations;

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
    uniq(item, index, array) {
        return item && array.indexOf(item) === index;
    }

    /**
     * Define aggregation frequency
     * @param {number} methodFrequency - method aggregation frequency
     * @param {number} globalFrequency - global aggregation frequency
     * @param {number} typeFrequency - type aggregation frequency
     */
    setAggregationFrequency(methodFrequency, globalFrequency, typeFrequency) {
        let frequency = methodFrequency || typeFrequency || globalFrequency;

        return this.filterAggregationFrequency(frequency);
    }

    /**
     * Filter unsupported aggregations
     * @param {Array} aggregations - list of aggregations
     * @returns {Array}
     */
    filterAggregations(aggregations = []) {
        return aggregations.filter((item) => {
            return aggregationList.includes(item);
        });
    }

    /**
     * Filter unsupported frequencies
     * @param {number} frequency - aggregation frequency
     * @returns {*}
     */
    filterAggregationFrequency(frequency) {
        let freq = 10;

        if (aggregationFrequencyList.includes(frequency)) {
            freq = frequency;
        }

        return freq;
    }
}
