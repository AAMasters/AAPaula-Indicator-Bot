exports.newCommons = function newCommons(bot, logger, UTILITIES) {

    const FULL_LOG = true;
    const LOG_FILE_CONTENT = false;

    const MODULE_NAME = "Commons";
    const GMT_SECONDS = ':00.000 GMT+0000';
    const ONE_DAY_IN_MILISECONDS = 24 * 60 * 60 * 1000;

    let thisObject = {
        buildBandsArray: buildBandsArray,
        buildChannels: buildChannels,
        buildSubChannels: buildSubChannels,
        initializeStorage: initializeStorage
    };

    let utilities = UTILITIES.newCloudUtilities(bot, logger);

    return thisObject;

    function buildBandsArray(dataFile, bands, timePeriod, callBackFunction) {

        try {

            let lastMovingAverage = 0;
            const SIDE_TOLERANCE = 0.5 * timePeriod / ONE_DAY_IN_MILISECONDS;
            const SMALL_SLOPE = 1.0 * timePeriod / ONE_DAY_IN_MILISECONDS;
            const MEDIUM_SLOPE = 2.0 * timePeriod / ONE_DAY_IN_MILISECONDS;
            const HIGH_SLOPE = 4.0 * timePeriod / ONE_DAY_IN_MILISECONDS;

            for (let i = 0; i < dataFile.length; i++) {

                let band = {
                    begin: undefined,
                    end: undefined,
                    movingAverage: 10000000000000,
                    standardDeviation: 0,
                    deviation: undefined
                };

                band.begin = dataFile[i][0];
                band.end = dataFile[i][1];

                band.movingAverage = dataFile[i][2];
                band.standardDeviation = dataFile[i][3];
                band.deviation = dataFile[i][4];

                if (lastMovingAverage > band.movingAverage) { band.direction = 'Down'; }
                if (lastMovingAverage < band.movingAverage) { band.direction = 'Up'; }
                if (lastMovingAverage === band.movingAverage) { band.direction = 'Side'; }

                let delta = Math.abs(band.movingAverage - lastMovingAverage);

                band.slope = 'Extreme';
                if (delta < band.movingAverage * HIGH_SLOPE / 100) { band.slope = 'Steep'; }
                if (delta < band.movingAverage * MEDIUM_SLOPE / 100) { band.slope = 'Medium'; }
                if (delta < band.movingAverage * SMALL_SLOPE / 100) { band.slope = 'Gentle'; }
                if (delta < band.movingAverage * SIDE_TOLERANCE / 100) { band.slope = 'Side'; }

                bands.push(band);

                lastMovingAverage = band.movingAverage;
            }
        }
        catch (err) {
            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
        }
    }

    function buildChannels(bands, channels, callBackFunction) {

        if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] buildChannels -> Entering function."); }

        try {

            let channel;

            for (let i = 0; i < bands.length - 1; i++) {

                let currentBand = bands[i];
                let nextBand = bands[i + 1];

                if (
                    currentBand.direction === nextBand.direction) {

                    if (channel === undefined) {

                        channel = {
                            begin: undefined,
                            end: undefined,
                            direction: undefined,
                            period: 0,
                            firstMovingAverage: 0,
                            lastMovingAverage: 0,
                            firstDeviation: 0,
                            lastDeviation: 0
                        };

                        channel.direction = currentBand.direction;
                        channel.period = 2;

                        channel.begin = currentBand.begin;
                        channel.end = nextBand.end;

                        channel.firstMovingAverage = currentBand.movingAverage;
                        channel.lastMovingAverage = nextBand.movingAverage;

                        channel.firstDeviation = currentBand.deviation;
                        channel.lastDeviation = nextBand.deviation;

                    } else {

                        channel.period++;
                        channel.end = nextBand.end;
                        channel.lastMovingAverage = nextBand.movingAverage;
                        channel.lastDeviation = nextBand.deviation;

                    }
                } else {

                    if (channel !== undefined) {
                        channels.push(channel);
                        channel = undefined;
                    } else {
                        /* The channel has only one period */

                        channel = {};

                        channel.direction = currentBand.direction;
                        channel.period = 1;

                        channel.begin = currentBand.begin;
                        channel.end = currentBand.end;

                        channel.firstMovingAverage = currentBand.movingAverage;
                        channel.lastMovingAverage = currentBand.movingAverage;

                        channel.firstDeviation = currentBand.deviation;
                        channel.lastDeviation = currentBand.deviation;

                        channels.push(channel);
                        channel = undefined;
                    }
                }
            }
        }
        catch (err) {
            logger.write(MODULE_NAME, "[ERROR] buildChannels -> err = " + err.message);
            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
        }
    }

    function buildSubChannels(bands, subChannels, callBackFunction) {

        if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] buildSubChannels -> Entering function."); }

        try {

            let channel;

            for (let i = 0; i < bands.length - 1; i++) {

                let currentBand = bands[i];
                let nextBand = bands[i + 1];

                if (
                    currentBand.direction === nextBand.direction &&
                    currentBand.slope === nextBand.slope) {

                    if (channel === undefined) {

                        channel = {
                            begin: undefined,
                            end: undefined,
                            direction: undefined,
                            slope: undefined,
                            period: 0,
                            firstMovingAverage: 0,
                            lastMovingAverage: 0,
                            firstDeviation: 0,
                            lastDeviation: 0
                        };

                        channel.direction = currentBand.direction;
                        channel.slope = currentBand.slope;
                        channel.period = 2;

                        channel.begin = currentBand.begin;
                        channel.end = nextBand.end;

                        channel.firstMovingAverage = currentBand.movingAverage;
                        channel.lastMovingAverage = nextBand.movingAverage;

                        channel.firstDeviation = currentBand.deviation;
                        channel.lastDeviation = nextBand.deviation;

                    } else {

                        channel.period++;
                        channel.end = nextBand.end;
                        channel.lastMovingAverage = nextBand.movingAverage;
                        channel.lastDeviation = nextBand.deviation;

                    }
                } else {

                    if (channel !== undefined) {
                        subChannels.push(channel);
                        channel = undefined;
                    } else {
                        /* The channel has only one period */

                        channel = {};

                        channel.direction = currentBand.direction;
                        channel.slope = currentBand.slope;
                        channel.period = 1;

                        channel.begin = currentBand.begin;
                        channel.end = currentBand.end;

                        channel.firstMovingAverage = currentBand.movingAverage;
                        channel.lastMovingAverage = currentBand.movingAverage;

                        channel.firstDeviation = currentBand.deviation;
                        channel.lastDeviation = currentBand.deviation;

                        subChannels.push(channel);
                        channel = undefined;
                    }
                }
            }
        }
        catch (err) {
            logger.write(MODULE_NAME, "[ERROR] buildSubChannels -> err = " + err.message);
            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
        }
    }

    function initializeStorage(chrisStorage, paulaStorage, callBackFunction) {

        try {

            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] initializeStorage -> Entering function."); }

            initializetomStorage();

            function initializetomStorage() {

                paulaStorage.initialize(bot.devTeam, onBruceInizialized);

                function onBruceInizialized(err) {

                    if (err.result === global.DEFAULT_OK_RESPONSE.result) {

                        initializeOliviaStorage();

                    } else {
                        logger.write(MODULE_NAME, "[ERROR] initializeStorage -> initializetomStorage -> onBruceInizialized -> err = " + err.message);
                        callBackFunction(err);
                    }
                }
            }

            function initializeOliviaStorage() {

                chrisStorage.initialize(bot.devTeam, onOliviaInizialized);

                function onOliviaInizialized(err) {

                    if (err.result === global.DEFAULT_OK_RESPONSE.result) {

                        callBackFunction(global.DEFAULT_OK_RESPONSE);

                    } else {
                        logger.write(MODULE_NAME, "[ERROR] initializeStorage -> initializeOliviaStorage -> onOliviaInizialized -> err = " + err.message);
                        callBackFunction(err);
                    }
                }
            }
        }
        catch (err) {
            logger.write(MODULE_NAME, "[ERROR] initializeStorage -> err = " + err.message);
            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
        }
    }


};