describe('Statful Client Unit testing', function () {
    'use strict';

    afterEach(function () {
        statful.perf.clearMarks();
        statful.perf.clearMeasures();
    });

    it('should exist the module statful and have configs', function () {
        expect(statful).not.toBeNull();
        expect(statful.config.apiAddress).toEqual('https://beacon.statful.com');
        expect(statful.endpoints.metrics).toEqual('beacon/metrics');

    });

    it('should should have defaults', function () {
        statful.initialize();

        expect(statful.config.dryrun).toEqual(false);
        expect(statful.config.debug).toEqual(false);
        expect(statful.config.app).toEqual(undefined);
        expect(statful.config.tags).toEqual({});
        expect(statful.config.aggregations).toEqual([]);
        expect(statful.config.aggregationFrequency).toEqual(10);
        expect(statful.config.flushInterval).toEqual(10000);

        expect(statful.config.timer.tags).toEqual({ unit: 'ms'});
        expect(statful.config.timer.aggregations).toEqual(['avg', 'p90', 'count']);

        expect(statful.config.counter.tags).toEqual({});
        expect(statful.config.counter.aggregations).toEqual(['avg', 'p90']);

        expect(statful.config.gauge.tags).toEqual({});
        expect(statful.config.gauge.aggregations).toEqual(['last']);
    });

    it('should merge global, method, type tags and aggregations and override aggregation frequency', function() {
        statful.initialize({
            tags: {},
            aggregations: ['last'],
            timer: {tags: {foo: 'bar'}},
            gauge: {tags: {meh: 'yep'}, aggregations: ['derivative']}
        });

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'gauge'},
            agg: [],
            aggFreq: 300
        };

        statful.gauge('test', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalledWith('metrics', {
            name: 'test',
            type: 'gauge',
            value:  1234,
            tags: {mark: 'gauge', meh: 'yep'},
            aggregations: ['last'],
            aggregationFrequency: 300,
            namespace: 'web',
            sampleRate: 100
        });
    });

    it('should override aggregation frequency by type over global', function() {
        statful.initialize({
            tags: {},
            aggregations: ['last'],
            timer: {tags: {foo: 'bar'}},
            gauge: {tags: {meh: 'yep'}, aggregations: [], aggregationFrequency: 60}
        });

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'gauge'},
            agg: []
        };

        statful.gauge('test', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalledWith('metrics', {
            name: 'test',
            type: 'gauge',
            value:  1234,
            tags: {mark: 'gauge', meh: 'yep'},
            aggregations: ['last'],
            aggregationFrequency: 60,
            namespace: 'web',
            sampleRate: 100
        });
    });

    it('should override sample rate by type over global', function() {
        statful.initialize({
            tags: {},
            aggregations: ['last'],
            timer: {tags: {foo: 'bar'}},
            gauge: {tags: {meh: 'yep'}, aggregations: [], aggregationFrequency: 60}
        });

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'gauge'},
            agg: [],
            sampleRate: 50
        };

        statful.gauge('test', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalledWith('metrics', {
            name: 'test',
            type: 'gauge',
            value:  1234,
            tags: {mark: 'gauge', meh: 'yep'},
            aggregations: ['last'],
            aggregationFrequency: 60,
            namespace: 'web',
            sampleRate: 50
        });
    });

    it('should discard invalid aggregations', function() {
        statful.initialize({
            tags: {},
            aggregations: ['last', 'invalid'],
            timer: {tags: {foo: 'bar'}},
            gauge: {tags: {meh: 'yep'}, aggregations: []}
        });

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'gauge'},
            agg: ['fail'],
            aggFreq: 300
        };

        statful.gauge('test', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalledWith('metrics', {
            name: 'test',
            type: 'gauge',
            value:  1234,
            tags: {mark: 'gauge', meh: 'yep'},
            aggregations: ['last'],
            aggregationFrequency: 300,
            namespace: 'web',
            sampleRate: 100
        });
    });

    it('should discard invalid aggregation frequency', function() {
        statful.initialize({
            tags: {},
            aggregations: [],
            gauge: {tags: {meh: 'yep'}, aggregations: []}
        });

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'gauge'},
            aggFreq: 1234
        };

        statful.gauge('test', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalledWith('metrics', {
            name: 'test',
            type: 'gauge',
            value:  1234,
            tags: {mark: 'gauge', meh: 'yep'},
            aggregations: [],
            aggregationFrequency: 10,
            namespace: 'web',
            sampleRate: 100
        });
    });

    it('should have an instance of StatfulUtil', function() {
        statful.initialize();
        var utilInstance = statful.util instanceof StatfulUtil;
        expect(utilInstance).toEqual(true);
    });

    it('should override default config', function () {
        statful.initialize({
            dryrun: true
        });

        expect(statful.config.dryrun).toEqual(true);
    });

    it('should return the duration of a measure when calling measureTimeUserTiming', function () {
        statful.initialize();

        statful.registerMark('start_test');
        statful.registerMark('end_test');

        var options = {
            startMark: 'start_test',
            endMark: 'end_test',
            clearMarks: false,
            clearMeasures: false
        };
        statful.registerMeasure('measure', 'metric', options);

        expect(statful.measureTimeUserTiming('measure')).toEqual(jasmine.any(Number));

        statful.clearMarks();
        statful.clearMeasures();
    });

    it('should clear all performance marks when calling clearMarks without arguments', function () {
        statful.initialize();

        statful.registerMark('start_test');

        spyOn(statful.perf, 'clearMarks');

        statful.clearMarks();

        expect(statful.perf.clearMarks).toHaveBeenCalled();
    });

    it('should clear performance marks when calling clearMarks with an Array of marks', function () {
        statful.initialize();

        statful.registerMark('start_test');

        spyOn(statful.perf, 'clearMarks');

        statful.clearMarks(['start_test']);

        expect(statful.perf.clearMarks).toHaveBeenCalledWith('start_test');
    });

    it('should clear all performance measures when calling clearMeasures without arguments', function () {
        statful.initialize();

        spyOn(statful.perf, 'clearMeasures');

        statful.clearMeasures();

        expect(statful.perf.clearMeasures).toHaveBeenCalled();
    });

    it('should clear performance measures when calling clearMeasures with an Array of measures', function () {
        statful.initialize();

        statful.registerMeasure('measure', 'metric');

        spyOn(statful.perf, 'clearMarks');

        statful.clearMarks(['measure']);

        expect(statful.perf.clearMarks).toHaveBeenCalledWith('measure');
    });

    it('should add a performance mark when calling registerMark', function () {
        statful.initialize();

        spyOn(statful.perf, 'mark');

        statful.registerMark('mark_test');

        expect(statful.perf.mark).toHaveBeenCalledWith('mark_test');
    });

    it('should add a performance measure when calling registerMeasure', function () {
        statful.initialize();

        spyOn(statful.perf, 'measure');

        statful.registerMeasure('measure_test', 'metric_test');

        expect(statful.perf.measure).toHaveBeenCalledWith('measure_test', undefined, jasmine.any(String));
    });

    it('should call addItemToQueue when registerMeasure', function() {
        statful.initialize();

        statful.registerMark('start_test');

        setTimeout(function() {
            statful.registerMark('end_test');

            var util = statful.util;
            spyOn(util, 'addItemToQueue');

            var options = {
                startMark: 'start_test',
                endMark: 'end_test',
                tags: {mark: 'measure'},
                aggregations: [],
                clearMarks: true,
                clearMeasures: true
            };
            statful.registerMeasure('measure_test', 'metric_test', options);

            expect(util.addItemToQueue).toHaveBeenCalled();
        }, 50);
    });

    it('should call addItemToQueue when registerMeasure with valid metric and default tags/aggregations', function() {
        statful.initialize();

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'measure'},
            aggregations: []
        };

        statful.registerMeasure('measure_test', 'metric_test', options);

        expect(util.addItemToQueue).toHaveBeenCalledWith('metrics', {
            name: 'metric_test',
            type: 'timer',
            value: jasmine.any(Number),
            tags: {mark: 'measure', unit: 'ms'},
            aggregations: ['avg', 'p90', 'count'],
            aggregationFrequency: 10,
            namespace: 'web',
            sampleRate: 100
        });
    });

    it('should call addItemToQueue when timer', function() {
        statful.initialize();

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'foo'},
            agg: []
        };

        statful.timer('load', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalled();
    });

    it('should not call addItemToQueue when invalid timer', function() {
        statful.initialize();

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        statful.timer();

        expect(util.addItemToQueue.calls.count()).toEqual(0);
    });


    it('should call addItemToQueue when counter', function() {
        statful.initialize();

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'foo'},
            agg: []
        };

        statful.counter('load', 1, options);

        expect(util.addItemToQueue).toHaveBeenCalled();
    });

    it('should call addItemToQueue when counter without value', function() {
        statful.initialize();

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        statful.counter('load');

        expect(util.addItemToQueue).toHaveBeenCalled();
    });

    it('should not call addItemToQueue when invalid counter', function() {
        statful.initialize();

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        statful.counter();

        expect(util.addItemToQueue.calls.count()).toEqual(0);
    });

    it('should call addItemToQueue when gauge with valid metric and default tags/aggregations', function() {
        statful.initialize();

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'gauge'},
            agg: [],
            aggFreq: 30
        };

        statful.gauge('test', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalledWith('metrics', {
            name: 'test',
            type: 'gauge',
            value:  1234,
            tags: {mark: 'gauge'},
            aggregations: ['last'],
            aggregationFrequency: 30,
            namespace: 'web',
            sampleRate: 100
        });
    });
});
