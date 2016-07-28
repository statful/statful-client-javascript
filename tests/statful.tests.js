describe('Statful Client Unit testing', function () {
    'use strict';

    afterEach(function () {
        statful.perf.clearMarks();
        statful.perf.clearMeasures();
    });

    it('should exist the module statful and have configs', function () {
        expect(statful).not.toBeNull();
        expect(statful.apiAddress).toEqual('//beacon.telemetron.io');
        expect(statful.endpoints.metrics).toEqual('beacon/metrics');

    });

    it('should should have defaults', function () {
        statful.initialize();

        expect(statful.dryrun).toEqual(false);
        expect(statful.environment).toEqual(undefined);
        expect(statful.tags).toEqual({});
        expect(statful.timer.tags).toEqual({});
        expect(statful.counter.tags).toEqual({});
        expect(statful.gauge.tags).toEqual({});
        expect(statful.other.tags).toEqual({});
        expect(statful.aggregations).toEqual([]);
        expect(statful.timer.aggregations).toEqual(['avg', 'p90', 'count']);
        expect(statful.counter.aggregations).toEqual(['sum', 'count']);
        expect(statful.gauge.aggregations).toEqual(['sum', 'count']);
        expect(statful.other.aggregations).toEqual(['last']);
        expect(statful.aggregationFrequency).toEqual(10);
        expect(statful.flushInterval).toEqual(30000);
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
            aggregations: [],
            aggregationFrequency: 300
        };

        statful.registerGauge('test', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalledWith('metrics', {
            name: 'test',
            type: 'gauge',
            value:  1234,
            tags: {mark: 'gauge', meh: 'yep'},
            aggregations: ['last', 'derivative'],
            aggregationFrequency: 300,
            namespace: 'web'
        });
    });

    it('should override aggregation frequency by type over global', function() {
        statful.initialize({
            tags: {},
            aggregations: ['last'],
            timer: {tags: {foo: 'bar'}},
            gauge: {tags: {meh: 'yep'}, aggregations: ['derivative'], aggregationFrequency: 60}
        });

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'gauge'},
            aggregations: []
        };

        statful.registerGauge('test', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalledWith('metrics', {
            name: 'test',
            type: 'gauge',
            value:  1234,
            tags: {mark: 'gauge', meh: 'yep'},
            aggregations: ['last', 'derivative'],
            aggregationFrequency: 60,
            namespace: 'web'
        });
    });

    it('should discard invalid aggregations', function() {
        statful.initialize({
            tags: {},
            aggregations: ['last', 'invalid'],
            timer: {tags: {foo: 'bar'}},
            gauge: {tags: {meh: 'yep'}, aggregations: ['derivative']}
        });

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'gauge'},
            aggregations: ['fail'],
            aggregationFrequency: 300
        };

        statful.registerGauge('test', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalledWith('metrics', {
            name: 'test',
            type: 'gauge',
            value:  1234,
            tags: {mark: 'gauge', meh: 'yep'},
            aggregations: ['last', 'derivative'],
            aggregationFrequency: 300,
            namespace: 'web'
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
            aggregationFrequency: 1234
        };

        statful.registerGauge('test', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalledWith('metrics', {
            name: 'test',
            type: 'gauge',
            value:  1234,
            tags: {mark: 'gauge', meh: 'yep'},
            aggregations: [],
            aggregationFrequency: 10,
            namespace: 'web'
        });
    });

    it('should have an instance of StatfulUtil', function() {
        statful.initialize();
        var utilInstance = statful.util instanceof StatfulUtil;
        expect(utilInstance).toEqual(true);
    });

    it('should override default config', function () {
        statful.initialize({
            enabled: false,
            dryrun: true
        });

        expect(statful.enabled).toEqual(false);
        expect(statful.dryrun).toEqual(true);
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
        statful.initialize({
            environment: 'production'
        });

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
            tags: {mark: 'measure', env: 'production'},
            aggregations: ['avg', 'p90', 'count'],
            aggregationFrequency: 10,
            namespace: 'web'
        });
    });

    it('should call addItemToQueue when registerTimer', function() {
        statful.initialize();

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'foo'},
            aggregations: []
        };

        statful.registerTimer('load', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalled();
    });

    it('should not call addItemToQueue when invalid registerTimer', function() {
        statful.initialize();

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        statful.registerTimer();

        expect(util.addItemToQueue.calls.count()).toEqual(0);
    });


    it('should call addItemToQueue when registerCounter', function() {
        statful.initialize();

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            metricValue: 1,
            tags: {mark: 'foo'},
            aggregations: []
        };

        statful.registerCounter('load', options);

        expect(util.addItemToQueue).toHaveBeenCalled();
    });

    it('should call addItemToQueue when registerCounter without value', function() {
        statful.initialize();

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        statful.registerCounter('load');

        expect(util.addItemToQueue).toHaveBeenCalled();
    });

    it('should not call addItemToQueue when invalid registerCounter', function() {
        statful.initialize();

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        statful.registerCounter();

        expect(util.addItemToQueue.calls.count()).toEqual(0);
    });

    it('should call addItemToQueue when registerGauge with valid metric and default tags/aggregations', function() {
        statful.initialize({
            environment: 'production'
        });

        var util = statful.util;

        spyOn(util, 'addItemToQueue');

        var options = {
            tags: {mark: 'gauge'},
            aggregations: [],
            aggregationFrequency: 30
        };

        statful.registerGauge('test', 1234, options);

        expect(util.addItemToQueue).toHaveBeenCalledWith('metrics', {
            name: 'test',
            type: 'gauge',
            value:  1234,
            tags: {mark: 'gauge', env: 'production'},
            aggregations: ['sum', 'count'],
            aggregationFrequency: 30,
            namespace: 'web'
        });
    });

    it('should have dryrun enabled with options.dryrun as true', function () {
        statful.initialize({
            dryrun: true
        });

        expect(statful.dryrun).toBeTruthy();
    });
});
