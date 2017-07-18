import StatfulLogger from '../src/logger';

describe('Statful Logger Unit testing', function () {
    var logger;

    it('should log info', function () {
        logger = new StatfulLogger(true);
        spyOn(console, 'info');

        logger.info('info');

        expect(console.info).toHaveBeenCalledWith('info');
    });

    it('should not log info', function () {
        logger = new StatfulLogger(false);
        spyOn(console, 'info');

        logger.info('info');

        expect(console.info).not.toHaveBeenCalled();
    });

    it('should log debug', function () {
        logger = new StatfulLogger(true);
        spyOn(console, 'debug');

        logger.debug('debug');

        expect(console.debug).toHaveBeenCalledWith('debug');
    });

    it('should not log debug', function () {
        logger = new StatfulLogger(false);
        spyOn(console, 'debug');

        logger.debug('debug');

        expect(console.debug).not.toHaveBeenCalled();
    });

    it('should log error', function () {
        logger = new StatfulLogger(true);
        spyOn(console, 'error');

        logger.error('error');

        expect(console.error).toHaveBeenCalledWith('error');
    });

    it('should not log error', function () {
        logger = new StatfulLogger(false);
        spyOn(console, 'error');

        logger.error('error');

        expect(console.error).not.toHaveBeenCalled();
    });
});
