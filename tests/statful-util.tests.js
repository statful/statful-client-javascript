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

        statfulUtil.sendRequest('endpoint', {
            id: 1
        });

        let request = jasmine.Ajax.requests.mostRecent();

        request.respondWith({
            status: 200,
            responseText: ''
        });

        expect(request.method).toBe('POST');
        expect(request.url).toBe('//beacon.statful.com/endpoint');

        jasmine.Ajax.uninstall();
    });

    it('should register a new Queue and send data', () => {
        jasmine.clock().install();
        spyOn(statfulUtil, 'sendRequest');

        expect(statfulUtil.registerQueue('metrics', 'endpoint', 5000)).toEqual(true);

        statfulUtil.addItemToQueue('metrics', {
            name: 'test',
            type: 'counter',
            value: 1
        });
        jasmine.clock().tick(5001);

        expect(statfulUtil.sendRequest).toHaveBeenCalledWith('endpoint', '[{"name":"test","type":"counter","value":1}]');

        jasmine.clock().uninstall();
    });

    it('should register a new Queue without interval expect default timer 30000', () => {
        expect(statfulUtil.registerQueue('metrics', 'endpoint')).toEqual(true);
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

        statfulUtil.registerQueue('metrics', 'endpoint', 5000);

        statfulUtil.addItemToQueue('metrics', {
            name: 'test',
            type: 'counter',
            value: 1
        });
        jasmine.clock().tick(5001);

        expect(statfulUtil.sendRequest.calls.count()).toEqual(0);

        jasmine.clock().uninstall();
    });

    it('should unregister queue', () => {
        jasmine.clock().install();
        spyOn(statfulUtil, 'sendRequest');

        statfulUtil.registerQueue('metrics', 'endpoint', 5000);

        jasmine.clock().tick(5001);

        expect(statfulUtil.sendRequest.calls.count()).toEqual(0);

        statfulUtil.addItemToQueue('metrics', {
            name: 'test',
            type: 'counter',
            value: 1
        });

        statfulUtil.unregisterQueue('metrics');

        jasmine.clock().tick(10001);

        expect(statfulUtil.sendRequest.calls.count()).toEqual(0);

        jasmine.clock().uninstall();
    });


    it('should not unregister queue', () => {
        expect(statfulUtil.listQueues.length).toEqual(0);

        statfulUtil.unregisterQueue('metrics');

        expect(statfulUtil.listQueues.length).toEqual(0);
    });

    it('should not add item to queue', () => {
        expect(statfulUtil.listQueues.length).toEqual(0);

        statfulUtil.addItemToQueue('metrics', {
            name: 'test',
            type: 'counter',
            value: 1
        });

        expect(statfulUtil.listQueues.length).toEqual(0);
    });

    it('should not add items to queue (sample rate)', () => {
        expect(statfulUtil.listQueues.length).toEqual(0);

        expect(statfulUtil.registerQueue('metrics', 'endpoint', 5000)).toEqual(true);

        spyOn(Math, 'random').and.returnValue(0.5);

        expect(statfulUtil.addItemToQueue('metrics', {
            name: 'test',
            type: 'counter',
            value: 1,
            sampleRate: 40
        })).toBeFalsy();
    });

    it('should add items to queue (sample rate)', () => {
        expect(statfulUtil.listQueues.length).toEqual(0);

        expect(statfulUtil.registerQueue('metrics', 'endpoint', 5000)).toEqual(true);

        spyOn(Math, 'random').and.returnValue(0.5);

        expect(statfulUtil.addItemToQueue('metrics', {
            name: 'test',
            type: 'counter',
            value: 1,
            sampleRate: 60
        })).toBeTruthy();
    });
});
