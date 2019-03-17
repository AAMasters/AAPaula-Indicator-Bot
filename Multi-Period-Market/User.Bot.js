exports.newUserBot = function newUserBot(bot, logger, COMMONS, UTILITIES, BLOB_STORAGE, FILE_STORAGE) {

    const FULL_LOG = true;
    const LOG_FILE_CONTENT = false;

    const GMT_SECONDS = ':00.000 GMT+0000';
    const GMT_MILI_SECONDS = '.000 GMT+0000';
    const ONE_DAY_IN_MILISECONDS = 24 * 60 * 60 * 1000;

    const MODULE_NAME = "User Bot";

    const EXCHANGE_NAME = "Poloniex";

    const TRADES_FOLDER_NAME = "Trades";

    const BOLLINGER_BANDS_FOLDER_NAME = "Bollinger-Bands";
    const BOLLINGER_CHANNELS_FOLDER_NAME = "Bollinger-Channels";
    const BOLLINGER_SUB_CHANNELS_FOLDER_NAME = "Bollinger-Sub-Channels";

    const commons = COMMONS.newCommons(bot, logger, UTILITIES);

    thisObject = {
        initialize: initialize,
        start: start
    };

    let chrisStorage = BLOB_STORAGE.newBlobStorage(bot, logger);
    let paulaStorage = BLOB_STORAGE.newBlobStorage(bot, logger);

    let utilities = UTILITIES.newCloudUtilities(bot, logger);

    let statusDependencies;

    return thisObject;

    function initialize(pStatusDependencies, pMonth, pYear, callBackFunction) {

        try {

            logger.fileName = MODULE_NAME;
            logger.initialize();

            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] initialize -> Entering function."); }

            statusDependencies = pStatusDependencies;

            commons.initializeStorage(chrisStorage, paulaStorage, onInizialized);

            function onInizialized(err) {

                if (err.result === global.DEFAULT_OK_RESPONSE.result) {

                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] initialize -> onInizialized -> Initialization Succeed."); }
                    callBackFunction(global.DEFAULT_OK_RESPONSE);

                } else {
                    logger.write(MODULE_NAME, "[ERROR] initialize -> onInizialized -> err = " + err.message);
                    callBackFunction(err);
                }
            }

        } catch (err) {
            logger.write(MODULE_NAME, "[ERROR] initialize -> err = " + err.message);
            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
        }
    }


    function start(callBackFunction) {

        try {

            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> Entering function."); }

            let market = global.MARKET;

            buildBollingerChannels();

            function buildBollingerChannels() {

                if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> Entering function."); }

                try {

                    let n;

                    periodsLoop();

                    function periodsLoop() {

                        try {

                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> periodsLoop -> Entering function."); }

                            /*
            
                            We will iterate through all posible periods.
            
                            */

                            n = 0   // loop Variable representing each possible period as defined at the periods array.

                            loopBody();

                        }
                        catch (err) {
                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> err = " + err.message);
                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                        }
                    }

                    function loopBody() {

                        try {

                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> Entering function."); }

                            const timePeriod = global.marketFilesPeriods[n][0];
                            const outputPeriodLabel = global.marketFilesPeriods[n][1];

                            nextBandFile();

                            function nextBandFile() {

                                try {

                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> nextBandFile -> Entering function."); }

                                    let fileName = market.assetA + '_' + market.assetB + ".json";

                                    let filePathRoot = bot.devTeam + "/" + "AAChris" + "." + bot.version.major + "." + bot.version.minor + "/" + global.PLATFORM_CONFIG.codeName + "." + global.PLATFORM_CONFIG.version.major + "." + global.PLATFORM_CONFIG.version.minor + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                                    let filePath = filePathRoot + "/Output/" + BOLLINGER_BANDS_FOLDER_NAME + "/" + "Multi-Period-Market" + "/" + outputPeriodLabel;

                                    chrisStorage.getTextFile(filePath, fileName, onFileReceived, true);

                                    function onFileReceived(err, text) {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> Entering function."); }
                                            if (LOG_FILE_CONTENT === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> text = " + text); }

                                            if (err.result !== global.DEFAULT_OK_RESPONSE.result) {

                                                logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> err = " + err.message);
                                                callBackFunction(err);
                                                return;

                                            }

                                            let marketFile = JSON.parse(text);

                                            let bands = [];
                                            let channels = [];
                                            let subChannels = [];

                                            buildBandsArray();

                                            function buildBandsArray() {

                                                if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> buildBandsArray -> Entering function."); }

                                                try {

                                                    let lastMovingAverage = 0;
                                                    const SIDE_TOLERANCE = 0.5 * timePeriod / ONE_DAY_IN_MILISECONDS;
                                                    const SMALL_SLOPE = 1.0 * timePeriod / ONE_DAY_IN_MILISECONDS;
                                                    const MEDIUM_SLOPE = 2.0 * timePeriod / ONE_DAY_IN_MILISECONDS;
                                                    const HIGH_SLOPE = 4.0 * timePeriod / ONE_DAY_IN_MILISECONDS;

                                                    for (let i = 0; i < marketFile.length; i++) {

                                                        let band = {
                                                            begin: undefined,
                                                            end: undefined,
                                                            movingAverage: 10000000000000,
                                                            standardDeviation: 0,
                                                            deviation: undefined
                                                        };

                                                        band.begin = marketFile[i][0];
                                                        band.end = marketFile[i][1];

                                                        band.movingAverage = marketFile[i][2];
                                                        band.standardDeviation = marketFile[i][3];
                                                        band.deviation = marketFile[i][4];

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

                                                    findChannels();

                                                }
                                                catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> buildBandsArray -> err = " + err.message);
                                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                }
                                            }

                                            function findChannels() {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> findChannels -> Entering function."); }

                                                    /* Finding channel */

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

                                                    writeBollingerChannelsFile();
                                                }
                                                catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> findChannels -> err = " + err.message);
                                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                }
                                            }

                                            function writeBollingerChannelsFile() {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerChannelsFile -> Entering function."); }

                                                    let separator = "";
                                                    let fileRecordCounter = 0;

                                                    let fileContent = "";

                                                    for (i = 0; i < channels.length; i++) {

                                                        let channel = channels[i];

                                                        fileContent = fileContent + separator + '[' +

                                                            channel.begin + "," +
                                                            channel.end + "," +
                                                            '"' + channel.direction + '"' + "," +
                                                            channel.period + "," +
                                                            channel.firstMovingAverage + "," +
                                                            channel.lastMovingAverage + "," +
                                                            channel.firstDeviation + "," +
                                                            channel.lastDeviation + "]";

                                                        if (separator === "") { separator = ","; }

                                                        fileRecordCounter++;

                                                    }

                                                    fileContent = "[" + fileContent + "]";

                                                    let fileName = '' + market.assetA + '_' + market.assetB + '.json';

                                                    let filePathRoot = bot.devTeam + "/" + bot.codeName + "." + bot.version.major + "." + bot.version.minor + "/" + global.PLATFORM_CONFIG.codeName + "." + global.PLATFORM_CONFIG.version.major + "." + global.PLATFORM_CONFIG.version.minor + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                                                    let filePath = filePathRoot + "/Output/" + BOLLINGER_CHANNELS_FOLDER_NAME + "/" + "Multi-Period-Market" + "/" + outputPeriodLabel;

                                                    paulaStorage.createTextFile(filePath, fileName, fileContent + '\n', onFileCreated);

                                                    function onFileCreated(err) {

                                                        try {

                                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerChannelsFile -> onFileCreated -> Entering function."); }
                                                            if (LOG_FILE_CONTENT === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerChannelsFile -> onFileCreated -> fileContent = " + fileContent); }

                                                            if (err.result !== global.DEFAULT_OK_RESPONSE.result) {

                                                                logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerChannelsFile -> onFileCreated -> err = " + err.message);
                                                                logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerChannelsFile -> onFileCreated -> filePath = " + filePath);
                                                                logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerChannelsFile -> onFileCreated -> market = " + market.assetA + "_" + market.assetB);

                                                                callBackFunction(err);
                                                                return;

                                                            }

                                                            findSubChannels();

                                                        }
                                                        catch (err) {
                                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerChannelsFile -> onFileCreated -> err = " + err.message);
                                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                        }
                                                    }
                                                }
                                                catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerChannelsFile -> err = " + err.message);
                                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                }
                                            }

                                            function findSubChannels() {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> findSubChannels -> Entering function."); }

                                                    /* Finding channel */

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

                                                    writeBollingerSubChannelsFile();
                                                }
                                                catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> findSubChannels -> err = " + err.message);
                                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                }
                                            }

                                            function writeBollingerSubChannelsFile() {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerSubChannelsFile -> Entering function."); }

                                                    let separator = "";
                                                    let fileRecordCounter = 0;

                                                    let fileContent = "";

                                                    for (i = 0; i < subChannels.length; i++) {

                                                        let channel = subChannels[i];

                                                        fileContent = fileContent + separator + '[' +

                                                            channel.begin + "," +
                                                            channel.end + "," +
                                                            '"' + channel.direction + '"' + "," +
                                                            '"' + channel.slope + '"' + "," +
                                                            channel.period + "," +
                                                            channel.firstMovingAverage + "," +
                                                            channel.lastMovingAverage + "," +
                                                            channel.firstDeviation + "," +
                                                            channel.lastDeviation + "]";

                                                        if (separator === "") { separator = ","; }

                                                        fileRecordCounter++;

                                                    }

                                                    fileContent = "[" + fileContent + "]";

                                                    let fileName = '' + market.assetA + '_' + market.assetB + '.json';

                                                    let filePathRoot = bot.devTeam + "/" + bot.codeName + "." + bot.version.major + "." + bot.version.minor + "/" + global.PLATFORM_CONFIG.codeName + "." + global.PLATFORM_CONFIG.version.major + "." + global.PLATFORM_CONFIG.version.minor + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                                                    let filePath = filePathRoot + "/Output/" + BOLLINGER_SUB_CHANNELS_FOLDER_NAME + "/" + "Multi-Period-Market" + "/" + outputPeriodLabel;

                                                    paulaStorage.createTextFile(filePath, fileName, fileContent + '\n', onFileCreated);

                                                    function onFileCreated(err) {

                                                        try {

                                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerSubChannelsFile -> onFileCreated -> Entering function."); }
                                                            if (LOG_FILE_CONTENT === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerSubChannelsFile -> onFileCreated -> fileContent = " + fileContent); }

                                                            if (err.result !== global.DEFAULT_OK_RESPONSE.result) {

                                                                logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerSubChannelsFile -> onFileCreated -> err = " + err.message);
                                                                logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerSubChannelsFile -> onFileCreated -> filePath = " + filePath);
                                                                logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerSubChannelsFile -> onFileCreated -> market = " + market.assetA + "_" + market.assetB);

                                                                callBackFunction(err);
                                                                return;

                                                            }

                                                            controlLoop();

                                                        }
                                                        catch (err) {
                                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerSubChannelsFile -> onFileCreated -> err = " + err.message);
                                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                        }
                                                    }
                                                }
                                                catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> writeBollingerSubChannelsFile -> err = " + err.message);
                                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                }
                                            }


                                        }
                                        catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> onFileReceived -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                        }
                                    }
                                }
                                catch (err) {
                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> nextBandFile -> err = " + err.message);
                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                }
                            }

                        }
                        catch (err) {
                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> err = " + err.message);
                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                        }
                    }

                    function controlLoop() {

                        try {

                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> controlLoop -> Entering function."); }

                            n++;

                            if (n < global.marketFilesPeriods.length) {

                                loopBody();

                            } else {

                                writeStatusReport(callBackFunction);

                            }
                        }
                        catch (err) {
                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> controlLoop -> err = " + err.message);
                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                        }
                    }

                }
                catch (err) {
                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> err = " + err.message);
                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                }
            }

            function writeStatusReport(callBack) {

                if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeStatusReport -> Entering function."); }

                try {

                    let reportKey = "AAMasters" + "-" + "AAPaula" + "-" + "Multi-Period-Market" + "-" + "dataSet.V1";
                    let thisReport = statusDependencies.statusReports.get(reportKey);

                    thisReport.file.lastExecution = bot.processDatetime;
                    thisReport.save(callBack);

                }
                catch (err) {
                    logger.write(MODULE_NAME, "[ERROR] start -> writeStatusReport -> err = " + err.message);
                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                }
            }
        }
        catch (err) {
            logger.write(MODULE_NAME, "[ERROR] start -> err = " + err.message);
            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
        }
    }
};
