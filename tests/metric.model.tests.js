import Metric from '../src/metric.model';

describe('Metric Model Unit testing', () => {
    it('should should have defaults', () => {
        let model = new Metric();

        expect(model).toEqual(jasmine.objectContaining({
            name: '',
            type: '',
            value: '',
            tags: {},
            aggregations: [],
            aggregationFrequency: 10,
            namespace: undefined,
            sampleRate: undefined
        }));
    });

    it('should create metric with name, type and value', () => {
        let model = new Metric('metric', 'gauge', 1234);

        expect(model).toEqual(jasmine.objectContaining({
            name: 'metric',
            type: 'gauge',
            value: 1234
        }));
    });

    it('should create metric global tags, type tags and metric tags', () => {
        let options = {
            tags: {
                metricTag: 'metricTag'
            }
        };
        let config = {
            tags: {
                globalTag: 'globalTag'
            },
            gauge: {
                tags: {
                    typeTag: 'typeTag'
                }
            }
        };
        let model = new Metric('metric', 'gauge', 1234, options, config);

        expect(model).toEqual(jasmine.objectContaining({
            name: 'metric',
            type: 'gauge',
            value: 1234,
            tags: {
                globalTag: 'globalTag',
                typeTag: 'typeTag',
                metricTag: 'metricTag'
            }
        }));
    });

    it('should use global app tag', () => {
        let config = {
            app: 'app'
        };
        let model = new Metric('metric', 'gauge', 1234, {}, config);

        expect(model).toEqual(jasmine.objectContaining({
            name: 'metric',
            type: 'gauge',
            value: 1234,
            tags: {
                app: 'app'
            }
        }));
    });

    it('should not use global app tag', () => {
        let options = {
            tags: {
                app: 'metricApp'
            }
        };
        let config = {
            app: 'globalApp'
        };
        let model = new Metric('metric', 'gauge', 1234, options, config);

        expect(model).toEqual(jasmine.objectContaining({
            name: 'metric',
            type: 'gauge',
            value: 1234,
            tags: {
                app: 'metricApp'
            }
        }));
    });
});
