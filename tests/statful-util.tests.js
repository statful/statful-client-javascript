describe('Statful Util Unit testing', function () {
    var statfulUtil;

    beforeEach(function () {
        statfulUtil= new StatfulUtil({
            apiAddress: '//beacon.statful.com',
            flushInterval: 30000
        });
    });

    it('should not send request', function () {
        spyOn(XMLHttpRequest.prototype, 'send');


        statfulUtil.sendRequest('endpoint', 'GET2', '?id=1');

        expect(XMLHttpRequest.prototype.send.calls.count()).toEqual(0);
    });


    it('should to send GET request', function () {
        jasmine.Ajax.install();

        statfulUtil.sendRequest('endpoint', 'GET', '?id=1');

        var request = jasmine.Ajax.requests.mostRecent();

        expect(request.method).toBe('GET');
        expect(request.url).toBe('//beacon.statful.com/endpoint/?id=1');

        jasmine.Ajax.uninstall();
    });

    it('should to send POST request', function () {
        jasmine.Ajax.install();

        statfulUtil.sendRequest('endpoint', 'POST', {
            id: 1
        });

        var request = jasmine.Ajax.requests.mostRecent();

        request.respondWith({
            status: 200,
            responseText: ''
        });

        expect(request.method).toBe('POST');
        expect(request.url).toBe('//beacon.statful.com/endpoint');

        jasmine.Ajax.uninstall();
    });

    it("should register a new Queue and send data", function () {
        jasmine.clock().install();
        spyOn(statfulUtil, 'sendRequest');

        expect(statfulUtil.registerQueue('metrics', 'endpoint', 5000)).toEqual(true);

        statfulUtil.addItemToQueue('metrics', {
            name: 'test',
            type: 'counter',
            value: 1
        });
        jasmine.clock().tick(5001);

        expect(statfulUtil.sendRequest).toHaveBeenCalledWith('endpoint', 'POST', '[{"name":"test","type":"counter","value":1}]');

        jasmine.clock().uninstall();
    });

    it("should register a new Queue without interval expect default timer 30000", function () {
        expect(statfulUtil.registerQueue('metrics', 'endpoint')).toEqual(true);
    });

    it("should not register a new Queue invalid inputs", function () {
        expect(statfulUtil.registerQueue([], 'endpoint')).toEqual(false);
    });

    it("should register a new Queue and not send data", function () {
        jasmine.clock().install();

        statfulUtil= new StatfulUtil({
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

    it("should unregister queue", function () {
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


    it('should not unregister queue', function () {
        expect(statfulUtil.listQueues.length).toEqual(0);

        statfulUtil.unregisterQueue('metrics');

        expect(statfulUtil.listQueues.length).toEqual(0);
    });

    it('should not add item to queue', function () {
        expect(statfulUtil.listQueues.length).toEqual(0);

        statfulUtil.addItemToQueue('metrics', {
            name: 'test',
            type: 'counter',
            value: 1
        });

        expect(statfulUtil.listQueues.length).toEqual(0);
    });

});
