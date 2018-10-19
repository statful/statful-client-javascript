const aggregationList = [
    'avg',
    'count',
    'sum',
    'first',
    'last',
    'p90',
    'p95',
    'min',
    'max'
];
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

        this.tags = this.buildTags(
            options.tags,
            config.tags,
            typeTags,
            config.app
        );
        this.aggregations = this.buildAggregations(
            options.aggregations,
            config.aggregations,
            typeAggregations
        );
        this.aggregationFrequency = this.buildAggregationFrequency(
            options.aggregationFrequency,
            config.aggregationFrequency,
            typeAggregationFrequency
        );
        this.namespace = options.namespace || config.namespace;
        this.sampleRate = options.sampleRate || config.sampleRate;
    }

    /**
     * Build tags for a metric type
     * @param {object} methodTags - list of method tags
     * @param {object} globalTags - list of global tags
     * @param {object} typeTags - list of type tags
     * @param {string} app - app tag value
     * @returns {*}
     */
    buildTags(methodTags = {}, globalTags = {}, typeTags = {}, app) {
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
     * Build aggregations for a metric type
     * @param {Array} methodAggregations - list of method aggregations
     * @param {Array} globalAggregations - list of global aggregations
     * @param {Array} typeAggregations - list of type aggregations
     * @returns {*|Array}
     */
    buildAggregations(
        methodAggregations = [],
        globalAggregations = [],
        typeAggregations = []
    ) {
        let aggregations = [];

        aggregations = aggregations.concat(globalAggregations);
        aggregations = aggregations.concat(typeAggregations).filter(this.uniq);
        aggregations = aggregations
            .concat(methodAggregations)
            .filter(this.uniq);

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
     * Build aggregation frequency
     * @param {number} methodFrequency - method aggregation frequency
     * @param {number} globalFrequency - global aggregation frequency
     * @param {number} typeFrequency - type aggregation frequency
     */
    buildAggregationFrequency(methodFrequency, globalFrequency, typeFrequency) {
        let frequency = methodFrequency || typeFrequency || globalFrequency;

        return this.filterAggregationFrequency(frequency);
    }

    /**
     * Filter unsupported aggregations
     * @param {Array} aggregations - list of aggregations
     * @returns {Array}
     */
    filterAggregations(aggregations = []) {
        return aggregations.filter(item => aggregationList.includes(item));
    }

    /**
     * Filter unsupported frequencies
     * @param {number} frequency - aggregation frequency
     * @returns {*}
     */
    filterAggregationFrequency(frequency) {
        return aggregationFrequencyList.includes(frequency) ? frequency : 10;
    }

    /**
     * Validates metric model
     * @returns {Boolean}
     */
    isValid() {
        return !!(!isNaN(this.value) && this.name);
    }
}
