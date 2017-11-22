import StatfulUtil from '../src/statful-util';
import Metric from '../src/metric.model';

describe('Statful Util Unit testing', () => {
    let statfulUtil;

    beforeEach(() => {
        statfulUtil = new StatfulUtil({
            apiAddress: '//beacon.statful.com',
            flushInterval: 30000,
            sampleRate: 100
        });
    });

    it('should not send POST request - Dry Run', () => {
        statfulUtil = new StatfulUtil({
            dryrun: true
        });
        jasmine.Ajax.install();

        statfulUtil.sendData({
            id: 1
        });

        const request = jasmine.Ajax.requests.mostRecent();
        expect(request).toEqual(undefined);

        jasmine.Ajax.uninstall();
    });

    it('should send POST request', () => {
        jasmine.Ajax.install();

        statfulUtil.sendData({
            id: 1
        });

        let request = jasmine.Ajax.requests.mostRecent();

        request.respondWith({
            status: 200,
            responseText: ''
        });

        expect(request.method).toBe('POST');
        expect(request.url).toBe('//beacon.statful.com/beacon/metrics');

        jasmine.Ajax.uninstall();
    });

    it('should register a new Queue and send data', () => {
        jasmine.clock().install();
        spyOn(statfulUtil, 'sendData');

        expect(statfulUtil.registerQueue(5000)).toEqual(true);

        const metricModel = new Metric('name', 'counter', 2);

        statfulUtil.addMetric(metricModel, true);
        jasmine.clock().tick(5001);

        expect(statfulUtil.sendData).toHaveBeenCalledWith([metricModel]);

        jasmine.clock().uninstall();
    });

    it('should not register a new Queue invalid inputs', () => {
        expect(statfulUtil.registerQueue(0)).toEqual(false);
    });

    it('should not add metric - invalid', () => {
        const metricModel = new Metric('', 'counter', 2);

        statfulUtil.registerQueue(0);

        spyOn(statfulUtil, 'sendData');
        statfulUtil.addMetric(metricModel, true);

        expect(statfulUtil.metricsQueue).toEqual([]);
        expect(statfulUtil.sendData).not.toHaveBeenCalled();
    });

    it('should not add metric - sample Rate', () => {
        const metricModel = new Metric('name', 'counter', 2);

        statfulUtil.registerQueue(0);

        spyOn(statfulUtil, 'sendData');
        spyOn(statfulUtil, 'shouldAddMetric').and.returnValue(false);
        statfulUtil.addMetric(metricModel, true);

        expect(statfulUtil.metricsQueue).toEqual([]);
        expect(statfulUtil.sendData).not.toHaveBeenCalled();
    });

    it('should add metric to queue', () => {
        const metricModel = new Metric('name', 'counter', 2);
        statfulUtil.registerQueue(0);

        spyOn(statfulUtil, 'sendData');
        statfulUtil.addMetric(metricModel, true);

        expect(statfulUtil.metricsQueue).toEqual([metricModel]);
        expect(statfulUtil.sendData).not.toHaveBeenCalled();
    });

    it('should add metric and send to server', () => {
        const metricModel = new Metric('name', 'counter', 2);
        statfulUtil.registerQueue(0);

        spyOn(statfulUtil, 'sendData');
        statfulUtil.addMetric(metricModel, false);

        expect(statfulUtil.metricsQueue).toEqual([]);
        expect(statfulUtil.sendData).toHaveBeenCalledWith([metricModel]);
    });


    it('should not add metric - metric sample rate', () => {
        const metricModel = new Metric('name', 'counter', 2, {sampleRate: 50});

        spyOn(Math, 'random').and.returnValue(0.6);
        expect(statfulUtil.shouldAddMetric(metricModel)).toEqual(false);
    });

    it('should not add metric - metric sample rate', () => {
        statfulUtil = new StatfulUtil({
            apiAddress: '//beacon.statful.com',
            flushInterval: 30000,
            sampleRate: 50
        });
        const metricModel = new Metric('name', 'counter', 2, {});

        spyOn(Math, 'random').and.returnValue(0.6);
        expect(statfulUtil.shouldAddMetric(metricModel)).toEqual(false);
    });

    it('should add metric - without specifying sample rate', () => {
        statfulUtil = new StatfulUtil({
            apiAddress: '//beacon.statful.com',
            flushInterval: 30000
        });
        const metricModel = new Metric('name', 'counter', 2, {});

        spyOn(Math, 'random').and.returnValue(0.6);
        expect(statfulUtil.shouldAddMetric(metricModel)).toEqual(true);
    });
});
