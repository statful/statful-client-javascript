import StatfulUtil from '../src/statful-util';

describe('Statful Util Unit testing', () => {
    let statfulUtil;

    beforeEach(() => {
        statfulUtil = new StatfulUtil({
            apiAddress: '//beacon.statful.com',
            flushInterval: 30000,
            sampleRate: 100
        });
    });

    it('should to send POST request', () => {
        jasmine.Ajax.install();

        statfulUtil.sendRequest({
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
        spyOn(statfulUtil, 'sendRequest');

        expect(statfulUtil.registerQueue(5000)).toEqual(true);
        const data = {
            name: 'test',
            type: 'counter',
            value: 1
        };

        statfulUtil.addMetricToQueue(data);
        jasmine.clock().tick(5001);

        expect(statfulUtil.sendRequest).toHaveBeenCalledWith([data]);

        jasmine.clock().uninstall();
    });

    it('should not register a new Queue invalid inputs', () => {
        expect(statfulUtil.registerQueue([], 'endpoint')).toEqual(false);
    });

    it('should register a new Queue and not send data', () => {
        jasmine.clock().install();

        statfulUtil = new StatfulUtil({
            apiAddress: '//beacon.statful.com',
            dryrun: true
        });

        spyOn(statfulUtil, 'sendRequest');

        statfulUtil.registerQueue(5000);

        statfulUtil.addMetricToQueue({
            name: 'test',
            type: 'counter',
            value: 1
        });
        jasmine.clock().tick(5001);

        expect(statfulUtil.sendRequest.calls.count()).toEqual(0);

        jasmine.clock().uninstall();
    });

    it('should not add items to queue (sample rate)', () => {
        expect(statfulUtil.metricsQueue.length).toEqual(0);

        expect(statfulUtil.registerQueue(5000)).toEqual(true);

        spyOn(Math, 'random').and.returnValue(0.5);

        expect(statfulUtil.addMetricToQueue({
            name: 'test',
            type: 'counter',
            value: 1,
            sampleRate: 40
        })).toBeFalsy();
    });

    it('should add items to queue (sample rate)', () => {
        expect(statfulUtil.metricsQueue.length).toEqual(0);

        expect(statfulUtil.registerQueue(5000)).toEqual(true);

        spyOn(Math, 'random').and.returnValue(0.5);

        expect(statfulUtil.addMetricToQueue({
            name: 'test',
            type: 'counter',
            value: 1,
            sampleRate: 60
        })).toBeTruthy();
    });
});
