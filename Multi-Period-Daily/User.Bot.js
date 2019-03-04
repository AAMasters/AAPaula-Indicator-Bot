﻿exports.newUserBot = function newUserBot(bot, logger, COMMONS, UTILITIES, BLOB_STORAGE, FILE_STORAGE) {

    const FULL_LOG = true;
    const INTENSIVE_LOG = false;
    const LOG_FILE_CONTENT = false;

    const GMT_SECONDS = ':00.000 GMT+0000';
    const GMT_MILI_SECONDS = '.000 GMT+0000';
    const ONE_DAY_IN_MILISECONDS = 24 * 60 * 60 * 1000;

    const MODULE_NAME = "User Bot";

    const EXCHANGE_NAME = "Poloniex";

    const TRADES_FOLDER_NAME = "Trades";

    const BOLLINGER_BANDS_FOLDER_NAME = "Bollinger-Bands";
    const BOLLINGER_CHANNELS_FOLDER_NAME = "Bollinger-Channels";

    const VOLUMES_FOLDER_NAME = "Volumes";
    const VOLUME_STAIRS_FOLDER_NAME = "Volume-Stairs";

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

    /*
    
    This process is going to do the following:
    
    Read the bands and volumes from Olivia and produce for each market two files with bollinger channels respectively.
    
    */

    function start(callBackFunction) {

        try {

            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> Entering function."); }

            /* One of the challenges of this process is that each imput file contains one day of bands. So if a stair spans more than one day
            then we dont want to break the stais in two pieces. What we do is that we read to bands files at the time and record at the current
            date all channel of the day plus the ones thas spans to the second day without bigining at the second day. Then when we process the next
            day, we must remember where the last channel of each type endded, so as not to create overlapping channel in the current day. */

            let market = global.MARKET;

            /* Context Variables */

            let contextVariables = {
                lastBandFile: undefined,          // Datetime of the last file files sucessfully produced by this process.
                firstTradeFile: undefined,          // Datetime of the first trade file in the whole market history.
                maxBandFile: undefined            // Datetime of the last file available to be used as an input of this process.
            };

            let previousDay;                        // Holds the date of the previous day relative to the processing date.
            let processDate;                        // Holds the processing date.

            getContextVariables();

            function getContextVariables() {

                try {

                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> getContextVariables -> Entering function."); }

                    let thisReport;
                    let reportKey;
                    let statusReport;

                    /* We look first for Charly in order to get when the market starts. */

                    reportKey = "AAMasters" + "-" + "AACharly" + "-" + "Poloniex-Historic-Trades" + "-" + "dataSet.V1";
                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> getContextVariables -> reportKey = " + reportKey); }

                    statusReport = statusDependencies.statusReports.get(reportKey);

                    if (statusReport === undefined) { // This means the status report does not exist, that could happen for instance at the begining of a month.
                        logger.write(MODULE_NAME, "[WARN] start -> getContextVariables -> Status Report does not exist. Retrying Later. ");
                        callBackFunction(global.DEFAULT_RETRY_RESPONSE);
                        return;
                    }

                    if (statusReport.status === "Status Report is corrupt.") {
                        logger.write(MODULE_NAME, "[ERROR] start -> getContextVariables -> Can not continue because dependecy Status Report is corrupt. ");
                        callBackFunction(global.DEFAULT_RETRY_RESPONSE);
                        return;
                    }

                    thisReport = statusDependencies.statusReports.get(reportKey).file;

                    if (thisReport.lastFile === undefined) {
                        logger.write(MODULE_NAME, "[WARN] start -> getContextVariables -> Undefined Last File. -> reportKey = " + reportKey);
                        logger.write(MODULE_NAME, "[HINT] start -> getContextVariables -> It is too early too run this process since the trade history of the market is not there yet.");

                        let customOK = {
                            result: global.CUSTOM_OK_RESPONSE.result,
                            message: "Dependency does not exist."
                        }
                        logger.write(MODULE_NAME, "[WARN] start -> getContextVariables -> customOK = " + customOK.message);
                        callBackFunction(customOK);
                        return;
                    }

                    contextVariables.firstTradeFile = new Date(thisReport.lastFile.year + "-" + thisReport.lastFile.month + "-" + thisReport.lastFile.days + " " + thisReport.lastFile.hours + ":" + thisReport.lastFile.minutes + GMT_SECONDS);

                    /* Second, we get the report from Olivia, to know when the marted ends. */

                    reportKey = "AAMasters" + "-" + "AAChris" + "-" + "Multi-Period-Daily" + "-" + "dataSet.V1";
                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> getContextVariables -> reportKey = " + reportKey); }

                    statusReport = statusDependencies.statusReports.get(reportKey);

                    if (statusReport === undefined) { // This means the status report does not exist, that could happen for instance at the begining of a month.
                        logger.write(MODULE_NAME, "[WARN] start -> getContextVariables -> Status Report does not exist. Retrying Later. ");
                        callBackFunction(global.DEFAULT_RETRY_RESPONSE);
                        return;
                    }

                    if (statusReport.status === "Status Report is corrupt.") {
                        logger.write(MODULE_NAME, "[ERROR] start -> getContextVariables -> Can not continue because dependecy Status Report is corrupt. ");
                        callBackFunction(global.DEFAULT_RETRY_RESPONSE);
                        return;
                    }

                    thisReport = statusDependencies.statusReports.get(reportKey).file;

                    if (thisReport.lastFile === undefined) {
                        logger.write(MODULE_NAME, "[WARN] start -> getContextVariables -> Undefined Last File. -> reportKey = " + reportKey);

                        let customOK = {
                            result: global.CUSTOM_OK_RESPONSE.result,
                            message: "Dependency not ready."
                        }
                        logger.write(MODULE_NAME, "[WARN] start -> getContextVariables -> customOK = " + customOK.message);
                        callBackFunction(customOK);
                        return;
                    }

                    contextVariables.maxBandFile = new Date(thisReport.lastFile.valueOf());

                    /* Finally we get our own Status Report. */

                    reportKey = "AAMasters" + "-" + "AAPaula" + "-" + "Multi-Period-Daily" + "-" + "dataSet.V1";
                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> getContextVariables -> reportKey = " + reportKey); }

                    statusReport = statusDependencies.statusReports.get(reportKey);

                    if (statusReport === undefined) { // This means the status report does not exist, that could happen for instance at the begining of a month.
                        logger.write(MODULE_NAME, "[WARN] start -> getContextVariables -> Status Report does not exist. Retrying Later. ");
                        callBackFunction(global.DEFAULT_RETRY_RESPONSE);
                        return;
                    }

                    if (statusReport.status === "Status Report is corrupt.") {
                        logger.write(MODULE_NAME, "[ERROR] start -> getContextVariables -> Can not continue because self dependecy Status Report is corrupt. Aborting Process.");
                        callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                        return;
                    }

                    thisReport = statusDependencies.statusReports.get(reportKey).file;

                    if (thisReport.lastFile !== undefined) {

                        contextVariables.lastBandFile = new Date(thisReport.lastFile);

                        /*
                        The channel objects can span more than one day. In order not to cut these objects into two when this happens, this process will alsways read
                        3 files.

                        1. The first file is a channel file corresponding to processDay -2. From there we will know where the last staris ended.
                        2. The second is a band or volume file corresponding to processDay -1.
                        3. The third is a band of volume file at processDay.

                        We will recalculate 2 and 3 considering the objects already in 1, so as to make the transition between 2 and 3 smooth.
                        */

                        if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> getContextVariables -> thisReport.lastFile !== undefined"); }

                        buildBollingerChannels();
                        return;

                    } else {

                        /*
                        In the case when there is no status report, we take the date of the file with the first trades as the begining of the market. Then we will
                        go one day back in time, so that when we enter the loop, one day will be added and we will be exactly at the date where the first trades occured.
                        */

                        contextVariables.lastBandFile = new Date(contextVariables.firstTradeFile.getUTCFullYear() + "-" + (contextVariables.firstTradeFile.getUTCMonth() + 1) + "-" + contextVariables.firstTradeFile.getUTCDate() + " " + "00:00" + GMT_SECONDS);

                        if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> getContextVariables -> thisReport.lastFile === undefined"); }
                        if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> getContextVariables -> contextVariables.lastBandFile = " + contextVariables.lastBandFile); }

                        buildBollingerChannels();
                        return;
                    }

                } catch (err) {
                    logger.write(MODULE_NAME, "[ERROR] start -> getContextVariables -> err = " + err.message);
                    if (err.message === "Cannot read property 'file' of undefined") {
                        logger.write(MODULE_NAME, "[HINT] start -> getContextVariables -> Check the bot configuration to see if all of its statusDependencies declarations are correct. ");
                        logger.write(MODULE_NAME, "[HINT] start -> getContextVariables -> Dependencies loaded -> keys = " + JSON.stringify(statusDependencies.keys));
                    }
                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                }
            }

            function buildBollingerChannels() {

                try {

                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> Entering function."); }

                    let n;
                    processDate = new Date(contextVariables.lastBandFile.valueOf() - ONE_DAY_IN_MILISECONDS); // Go back one day to start well when we advance time at the begining of the loop.
                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> processDate = " + processDate); }

                    advanceTime();

                    function advanceTime() {

                        try {

                            logger.newInternalLoop(bot.codeName, bot.process);

                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> advanceTime -> Entering function."); }

                            processDate = new Date(processDate.valueOf() + ONE_DAY_IN_MILISECONDS);
                            previousDay = new Date(processDate.valueOf() - ONE_DAY_IN_MILISECONDS);

                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> advanceTime -> processDate = " + processDate); }
                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> advanceTime -> previousDay = " + previousDay); }

                            /* Validation that we are not going past the head of the market. */

                            if (processDate.valueOf() > contextVariables.maxBandFile.valueOf()) {

                                const logText = "Head of the market found @ " + previousDay.getUTCFullYear() + "/" + (previousDay.getUTCMonth() + 1) + "/" + previousDay.getUTCDate() + ".";
                                if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> advanceTime -> " + logText); }

                                callBackFunction(global.DEFAULT_OK_RESPONSE);
                                return;

                            }

                            periodsLoop();

                        } catch (err) {
                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> advanceTime -> err = " + err.message);
                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                        }
                    }

                    function periodsLoop() {

                        try {

                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> periodsLoop -> Entering function."); }

                            /*
            
                            We will iterate through all posible timePeriods.
            
                            */

                            n = 0   // loop Variable representing each possible period as defined at the periods array.

                            loopBody();

                        } catch (err) {
                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> err = " + err.message);
                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                        }
                    }

                    function loopBody() {

                        try {

                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> Entering function."); }

                            const timePeriod = global.dailyFilePeriods[n][1];

                            let endOfLastBandStair = new Date(previousDay.valueOf() - ONE_DAY_IN_MILISECONDS);
                            let endOfLastBuyVolumeStair = new Date(previousDay.valueOf() - ONE_DAY_IN_MILISECONDS);
                            let endOfLastSellVolumeStair = new Date(previousDay.valueOf() - ONE_DAY_IN_MILISECONDS);

                            /*
                            By default we set the starting date of the processDay - 2 file. If we find the file this value shoulld be overwritten by the value of the end property
                            of the last object on the file.
                            */

                            endOfLastBandStair = endOfLastBandStair.valueOf();
                            endOfLastBuyVolumeStair = endOfLastBuyVolumeStair.valueOf();
                            endOfLastSellVolumeStair = endOfLastSellVolumeStair.valueOf();

                            getEndOfLastBandStair();

                            function getEndOfLastBandStair() {

                                try {

                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> getEndOfLastBandStair -> Entering function."); }

                                    let fileDate = new Date(previousDay.valueOf() - ONE_DAY_IN_MILISECONDS);
                                    getBandStairsFile();

                                    function getBandStairsFile() {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> getEndOfLastBandStair -> getBandStairsFile -> Entering function."); }

                                            let dateForPath = fileDate.getUTCFullYear() + '/' + utilities.pad(fileDate.getUTCMonth() + 1, 2) + '/' + utilities.pad(fileDate.getUTCDate(), 2);
                                            let fileName = market.assetA + '_' + market.assetB + ".json"

                                            let filePathRoot = bot.devTeam + "/" + bot.codeName + "." + bot.version.major + "." + bot.version.minor + "/" + global.PLATFORM_CONFIG.codeName + "." + global.PLATFORM_CONFIG.version.major + "." + global.PLATFORM_CONFIG.version.minor + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                                            let filePath = filePathRoot + "/Output/" + BOLLINGER_CHANNELS_FOLDER_NAME + '/' + "Multi-Period-Daily" + "/" + timePeriod + "/" + dateForPath;

                                            paulaStorage.getTextFile(filePath, fileName, onFileReceived, true);

                                            function onFileReceived(err, text) {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> getEndOfLastBandStair -> getBandStairsFile -> onFileReceived -> Entering function."); }

                                                    if (LOG_FILE_CONTENT === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> getEndOfLastBandStair -> getBandStairsFile -> onFileReceived -> text = " + text); }

                                                    if (
                                                        err.result === global.CUSTOM_FAIL_RESPONSE.result &&
                                                        (err.message === 'Folder does not exist.' || err.message === 'File does not exist.')
                                                    ) {

                                                        getEndOfLastVolumeStair();
                                                        return;
                                                    }

                                                    let channelFile = JSON.parse(text);

                                                    if (channelFile.length > 0) {

                                                        endOfLastBandStair = channelFile[channelFile.length - 1][5]; // We get from the last regord the end value. Position 5 = Stairs.end 
                                                        getEndOfLastVolumeStair();

                                                    } else {

                                                        getEndOfLastVolumeStair();
                                                        return;

                                                    }

                                                } catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> getEndOfLastBandStair -> getBandStairsFile -> onFileReceived -> err = " + err.message);
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> getEndOfLastBandStair -> getBandStairsFile -> onFileReceived -> filePath = " + filePath);
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> getEndOfLastBandStair -> getBandStairsFile -> onFileReceived -> market = " + market.assetA + '_' + market.assetB);

                                                    callBackFunction(global.DEFAULT_RETRY_RESPONSE);
                                                }
                                            }

                                        } catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> getEndOfLastBandStair -> getBandStairsFile -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                        }
                                    }

                                } catch (err) {
                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> getEndOfLastBandStair -> err = " + err.message);
                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                }
                            }

                            function getEndOfLastVolumeStair() {

                                try {


                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> getEndOfLastVolumeStair -> Entering function."); }

                                    let fileDate = new Date(previousDay.valueOf() - ONE_DAY_IN_MILISECONDS);
                                    getBandStairsFile();

                                    function getBandStairsFile() {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> getEndOfLastVolumeStair -> getBandStairsFile -> Entering function."); }

                                            let dateForPath = fileDate.getUTCFullYear() + '/' + utilities.pad(fileDate.getUTCMonth() + 1, 2) + '/' + utilities.pad(fileDate.getUTCDate(), 2);
                                            let fileName = market.assetA + '_' + market.assetB + ".json"

                                            let filePathRoot = bot.devTeam + "/" + bot.codeName + "." + bot.version.major + "." + bot.version.minor + "/" + global.PLATFORM_CONFIG.codeName + "." + global.PLATFORM_CONFIG.version.major + "." + global.PLATFORM_CONFIG.version.minor + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                                            let filePath = filePathRoot + "/Output/" + VOLUME_STAIRS_FOLDER_NAME + '/' + "Multi-Period-Daily" + "/" + timePeriod + "/" + dateForPath;

                                            paulaStorage.getTextFile(filePath, fileName, onFileReceived, true);

                                            function onFileReceived(err, text) {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> getEndOfLastVolumeStair -> getBandStairsFile -> onFileReceived -> Entering function."); }
                                                    if (LOG_FILE_CONTENT === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> getEndOfLastVolumeStair -> getBandStairsFile -> onFileReceived -> text = " + text); }

                                                    if (
                                                        err.result === global.CUSTOM_FAIL_RESPONSE.result &&
                                                        (err.message === 'Folder does not exist.' || err.message === 'File does not exist.')
                                                    ) {

                                                        processBands();
                                                        return;
                                                    }

                                                    let channelFile = JSON.parse(text);

                                                    if (channelFile.length > 0) {

                                                        for (let i = 0; i < channelFile.length; i++) {

                                                            let channel = {
                                                                type: channelFile[i][0],
                                                                begin: channelFile[i][1],
                                                                end: channelFile[i][2],
                                                                direction: channelFile[i][3],
                                                                barsCount: channelFile[i][4],
                                                                firstAmount: channelFile[i][5],
                                                                lastAmount: channelFile[i][6]
                                                            };

                                                            if (channel.type === 'buy') {

                                                                endOfLastBuyVolumeStair = channel.end;

                                                            } else {

                                                                endOfLastSellVolumeStair = channel.end;

                                                            }
                                                        }

                                                        processBands();

                                                    } else {

                                                        processBands();
                                                        return;

                                                    }

                                                } catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> getEndOfLastVolumeStair -> getBandStairsFile -> onFileReceived -> err = " + err.message);
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> getEndOfLastVolumeStair -> getBandStairsFile -> onFileReceived -> filePath = " + filePath);
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> getEndOfLastVolumeStair -> getBandStairsFile -> onFileReceived -> market = " + market.assetA + '_' + market.assetB);

                                                    callBackFunction(global.DEFAULT_RETRY_RESPONSE);
                                                }
                                            }
                                        } catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> getEndOfLastVolumeStair -> getBandStairsFile -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                        }
                                    }

                                } catch (err) {
                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> getEndOfLastVolumeStair -> err = " + err.message);
                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                }
                            }

                            function processBands() {

                                try {

                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> Entering function."); }

                                    let bands = [];                   // Here we will put all the bands of the 2 files read.

                                    let previousDayStairsArray = [];    // Here All the channel of the previous day. 
                                    let processDayStairsArray = [];     // Here All the channel of the process day. 

                                    let previousDayFile;
                                    let processDayFile;

                                    getBandStairsFile();

                                    function getBandStairsFile() {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> getBandStairsFile -> Entering function."); }

                                            let dateForPath = previousDay.getUTCFullYear() + '/' + utilities.pad(previousDay.getUTCMonth() + 1, 2) + '/' + utilities.pad(previousDay.getUTCDate(), 2);
                                            let fileName = market.assetA + '_' + market.assetB + ".json"

                                            let filePathRoot = bot.devTeam + "/" + "AAChris" + "." + bot.version.major + "." + bot.version.minor + "/" + global.PLATFORM_CONFIG.codeName + "." + global.PLATFORM_CONFIG.version.major + "." + global.PLATFORM_CONFIG.version.minor + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                                            let filePath = filePathRoot + "/Output/" + BOLLINGER_BANDS_FOLDER_NAME + '/' + "Multi-Period-Daily" + "/" + timePeriod + "/" + dateForPath;

                                            chrisStorage.getTextFile(filePath, fileName, onCurrentDayFileReceived, true);

                                            function onCurrentDayFileReceived(err, text) {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> getBandStairsFile -> onCurrentDayFileReceived -> Entering function."); }
                                                    if (LOG_FILE_CONTENT === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> getBandStairsFile -> onCurrentDayFileReceived -> text = " + text); }

                                                    previousDayFile = JSON.parse(text);
                                                    getProcessDayFile()

                                                } catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> getBandStairsFile -> onCurrentDayFileReceived -> err = " + err.message);
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> getBandStairsFile -> onCurrentDayFileReceived -> filePath = " + filePath);
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> getBandStairsFile -> onCurrentDayFileReceived -> market = " + market.assetA + '_' + market.assetB);

                                                    callBackFunction(global.DEFAULT_RETRY_RESPONSE);
                                                }
                                            }

                                        } catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> getBandStairsFile -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                        }
                                    }

                                    function getProcessDayFile() {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> getProcessDayFile -> Entering function."); }

                                            let dateForPath = processDate.getUTCFullYear() + '/' + utilities.pad(processDate.getUTCMonth() + 1, 2) + '/' + utilities.pad(processDate.getUTCDate(), 2);
                                            let fileName = market.assetA + '_' + market.assetB + ".json"

                                            let filePathRoot = bot.devTeam + "/" + "AAChris" + "." + bot.version.major + "." + bot.version.minor + "/" + global.PLATFORM_CONFIG.codeName + "." + global.PLATFORM_CONFIG.version.major + "." + global.PLATFORM_CONFIG.version.minor + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                                            let filePath = filePathRoot + "/Output/" + BOLLINGER_BANDS_FOLDER_NAME + '/' + "Multi-Period-Daily" + "/" + timePeriod + "/" + dateForPath;

                                            chrisStorage.getTextFile(filePath, fileName, onCurrentDayFileReceived, true);

                                            function onCurrentDayFileReceived(err, text) {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> getProcessDayFile -> onCurrentDayFileReceived -> Entering function."); }
                                                    if (LOG_FILE_CONTENT === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> getProcessDayFile -> onCurrentDayFileReceived -> text = " + text); }

                                                    processDayFile = JSON.parse(text);
                                                    buildBandsArray();

                                                } catch (err) {

                                                    if (processDate.valueOf() > contextVariables.maxBandFile.valueOf()) {

                                                        processDayFile = [];  // we are past the head of the market, then no worries if this file is non existent.
                                                        buildBandsArray();

                                                    } else {

                                                        logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> getProcessDayFile -> onCurrentDayFileReceived -> err = " + err.message);
                                                        logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> getProcessDayFile -> onCurrentDayFileReceived -> filePath = " + filePath);
                                                        logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> getProcessDayFile -> onCurrentDayFileReceived -> market = " + market.assetA + '_' + market.assetB);

                                                        callBackFunction(global.DEFAULT_RETRY_RESPONSE);
                                                        return;
                                                    }
                                                }
                                            }

                                        } catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> getProcessDayFile -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                        }
                                    }

                                    function buildBandsArray() {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> buildBandsArray -> Entering function."); }

                                            pushBands(previousDayFile);
                                            pushBands(processDayFile);
                                            findChannels();

                                            function pushBands(bandsFile) {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> buildBandsArray -> pushBands -> Entering function."); }

                                                    for (let i = 0; i < bandsFile.length; i++) {

                                                        let band = {
                                                            open: undefined,
                                                            close: undefined,
                                                            min: 10000000000000,
                                                            max: 0,
                                                            begin: undefined,
                                                            end: undefined,
                                                            direction: undefined
                                                        };

                                                        band.min = bandsFile[i][0];
                                                        band.max = bandsFile[i][1];

                                                        band.open = bandsFile[i][2];
                                                        band.close = bandsFile[i][3];

                                                        band.begin = bandsFile[i][4];
                                                        band.end = bandsFile[i][5];

                                                        if (band.open > band.close) { band.direction = 'down'; }
                                                        if (band.open < band.close) { band.direction = 'up'; }
                                                        if (band.open === band.close) { band.direction = 'side'; }

                                                        bands.push(band);
                                                    }

                                                } catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> buildBandsArray -> pushBands -> err = " + err.message);
                                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                    return;
                                                }
                                            }

                                        } catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> buildBandsArray -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                            return;
                                        }
                                    }

                                    function findChannels() {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> findChannels -> Entering function."); }

                                            /* Finding channel */

                                            let channel;

                                            for (let i = 0; i < bands.length - 1; i++) {

                                                let currentBand = bands[i];
                                                let nextBand = bands[i + 1];

                                                if (currentBand.direction === nextBand.direction && currentBand.direction !== 'side') {

                                                    if (channel === undefined) {

                                                        channel = {
                                                            open: undefined,
                                                            close: undefined,
                                                            min: 10000000000000,
                                                            max: 0,
                                                            begin: undefined,
                                                            end: undefined,
                                                            direction: undefined,
                                                            periodCount: 0,
                                                            firstMin: 0,
                                                            firstMax: 0,
                                                            lastMin: 0,
                                                            lastMax: 0
                                                        };

                                                        channel.direction = currentBand.direction;
                                                        channel.periodCount = 2;

                                                        channel.begin = currentBand.begin;
                                                        channel.end = nextBand.end;

                                                        channel.open = currentBand.open;
                                                        channel.close = nextBand.close;

                                                        if (currentBand.min < nextBand.min) { channel.min = currentBand.min; } else { channel.min = nextBand.min; }
                                                        if (currentBand.max > nextBand.max) { channel.max = currentBand.max; } else { channel.max = nextBand.max; }

                                                        if (channel.direction === 'up') {

                                                            channel.firstMin = currentBand.open;
                                                            channel.firstMax = currentBand.close;

                                                            channel.lastMin = nextBand.open;
                                                            channel.lastMax = nextBand.close;

                                                        } else {

                                                            channel.firstMin = currentBand.close;
                                                            channel.firstMax = currentBand.open;

                                                            channel.lastMin = nextBand.close;
                                                            channel.lastMax = nextBand.open;

                                                        }


                                                    } else {

                                                        channel.periodCount++;
                                                        channel.end = nextBand.end;
                                                        channel.close = nextBand.close;

                                                        if (channel.min < nextBand.min) { channel.min = currentBand.min; }
                                                        if (channel.max > nextBand.max) { channel.max = currentBand.max; }

                                                        if (channel.direction === 'up') {

                                                            channel.lastMin = nextBand.open;
                                                            channel.lastMax = nextBand.close;

                                                        } else {

                                                            channel.lastMin = nextBand.close;
                                                            channel.lastMax = nextBand.open;

                                                        }

                                                    }

                                                } else {

                                                    if (channel !== undefined) {

                                                        /*
                                                        Here we detect channel that started at process day - 2. 
                                                        */

                                                        if (channel.begin > endOfLastBandStair) {

                                                            if (channel.begin >= processDate.valueOf()) {

                                                                processDayStairsArray.push(channel);

                                                            } else {

                                                                previousDayStairsArray.push(channel);

                                                            }
                                                        }

                                                        channel = undefined;
                                                    }
                                                }
                                            }

                                            writeChannelsFile();

                                        } catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> findChannels -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                            return;
                                        }
                                    }

                                    function writeChannelsFile() {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> writeChannelsFile -> Entering function."); }

                                            writeFile(previousDayStairsArray, previousDay, onPreviousFileWritten);

                                            function onPreviousFileWritten() {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> writeChannelsFile -> onPreviousFileWritten -> Entering function."); }

                                                    writeFile(processDayStairsArray, processDate, onProcessFileWritten);

                                                    function onProcessFileWritten() {

                                                        try {

                                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> writeChannelsFile -> onPreviousFileWritten -> onProcessFileWritten -> Entering function."); }

                                                            processVolumes();

                                                        } catch (err) {
                                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> writeChannelsFile -> onPreviousFileWritten -> onProcessFileWritten -> err = " + err.message);
                                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                        }
                                                    }

                                                } catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> writeChannelsFile -> onPreviousFileWritten -> err = " + err.message);
                                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                }
                                            }

                                            function writeFile(pStairs, pDate, callback) {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> writeChannelsFile -> writeFile -> Entering function."); }

                                                    let separator = "";
                                                    let fileRecordCounter = 0;

                                                    let fileContent = "";

                                                    for (i = 0; i < pStairs.length; i++) {

                                                        let channel = pStairs[i];

                                                        fileContent = fileContent + separator + '[' +
                                                            channel.open + "," +
                                                            channel.close + "," +
                                                            channel.min + "," +
                                                            channel.max + "," +
                                                            channel.begin + "," +
                                                            channel.end + "," +
                                                            '"' + channel.direction + '"' + "," +
                                                            channel.periodCount + "," +
                                                            channel.firstMin + "," +
                                                            channel.firstMax + "," +
                                                            channel.lastMin + "," +
                                                            channel.lastMax + "]";

                                                        if (separator === "") { separator = ","; }

                                                        fileRecordCounter++;

                                                    }

                                                    fileContent = "[" + fileContent + "]";

                                                    let dateForPath = pDate.getUTCFullYear() + '/' + utilities.pad(pDate.getUTCMonth() + 1, 2) + '/' + utilities.pad(pDate.getUTCDate(), 2);
                                                    let fileName = '' + market.assetA + '_' + market.assetB + '.json';

                                                    let filePathRoot = bot.devTeam + "/" + bot.codeName + "." + bot.version.major + "." + bot.version.minor + "/" + global.PLATFORM_CONFIG.codeName + "." + global.PLATFORM_CONFIG.version.major + "." + global.PLATFORM_CONFIG.version.minor + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                                                    let filePath = filePathRoot + "/Output/" + BOLLINGER_CHANNELS_FOLDER_NAME + "/" + bot.process + "/" + timePeriod + "/" + dateForPath;

                                                    paulaStorage.createTextFile(filePath, fileName, fileContent + '\n', onFileCreated);

                                                    function onFileCreated(err) {

                                                        try {

                                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> writeChannelsFile -> writeFile -> onFileCreated -> Entering function."); }

                                                            if (LOG_FILE_CONTENT === true) {
                                                                logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> writeChannelsFile -> writeFile -> onFileCreated ->  Content written = " + fileContent);
                                                            }

                                                            if (err.result !== global.DEFAULT_OK_RESPONSE.result) {
                                                                logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> processBands -> writeChannelsFile -> writeFile -> onFileCreated -> err = " + err.message);
                                                                callBack(err);
                                                                return;
                                                            }

                                                            const logText = "[WARN] Finished with File @ " + market.assetA + "_" + market.assetB + ", " + fileRecordCounter + " records inserted into " + filePath + "/" + fileName + "";
                                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processBands -> writeChannelsFile -> writeFile -> onFileCreated -> " + logText); }

                                                            callback();

                                                        } catch (err) {
                                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> writeChannelsFile -> writeFile -> onFileCreated -> err = " + err.message);
                                                            callBackFunction(global.DEFAULT_RETRY_RESPONSE);
                                                        }
                                                    }

                                                } catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> writeChannelsFile -> writeFile -> err = " + err.message);
                                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                }
                                            }

                                        } catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> writeChannelsFile -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                        }
                                    }

                                } catch (err) {
                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processBands -> err = " + err.message);
                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                }
                            }

                            function processVolumes() {

                                try {

                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> Entering function."); }

                                    let volumes = [];

                                    let previousDayStairsArray = [];    // Here All the channel of the previous day. 
                                    let processDayStairsArray = [];     // Here All the channel of the process day. 

                                    let previousDayFile;
                                    let processDayFile;

                                    getBandStairsFile();

                                    function getBandStairsFile() {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> getBandStairsFile -> Entering function."); }

                                            let dateForPath = previousDay.getUTCFullYear() + '/' + utilities.pad(previousDay.getUTCMonth() + 1, 2) + '/' + utilities.pad(previousDay.getUTCDate(), 2);
                                            let fileName = market.assetA + '_' + market.assetB + ".json"

                                            let filePathRoot = bot.devTeam + "/" + "AAChris" + "." + bot.version.major + "." + bot.version.minor + "/" + global.PLATFORM_CONFIG.codeName + "." + global.PLATFORM_CONFIG.version.major + "." + global.PLATFORM_CONFIG.version.minor + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                                            let filePath = filePathRoot + "/Output/" + VOLUMES_FOLDER_NAME + '/' + "Multi-Period-Daily" + "/" + timePeriod + "/" + dateForPath;

                                            chrisStorage.getTextFile(filePath, fileName, onCurrentDayFileReceived, true);

                                            function onCurrentDayFileReceived(err, text) {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> getBandStairsFile -> onCurrentDayFileReceived -> Entering function."); }
                                                    if (LOG_FILE_CONTENT === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> getBandStairsFile -> onCurrentDayFileReceived -> text = " + text); }

                                                    previousDayFile = JSON.parse(text);
                                                    getProcessDayFile()

                                                } catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> getBandStairsFile -> onCurrentDayFileReceived -> err = " + err.message);
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> getBandStairsFile -> onCurrentDayFileReceived -> filePath = " + filePath);
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> getBandStairsFile -> onCurrentDayFileReceived -> market = " + market.assetA + '_' + market.assetB);

                                                    callBackFunction(global.DEFAULT_RETRY_RESPONSE);
                                                }
                                            }

                                        } catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> getBandStairsFile -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                        }
                                    }

                                    function getProcessDayFile() {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> getProcessDayFile -> Entering function."); }

                                            let dateForPath = processDate.getUTCFullYear() + '/' + utilities.pad(processDate.getUTCMonth() + 1, 2) + '/' + utilities.pad(processDate.getUTCDate(), 2);
                                            let fileName = market.assetA + '_' + market.assetB + ".json"

                                            let filePathRoot = bot.devTeam + "/" + "AAChris" + "." + bot.version.major + "." + bot.version.minor + "/" + global.PLATFORM_CONFIG.codeName + "." + global.PLATFORM_CONFIG.version.major + "." + global.PLATFORM_CONFIG.version.minor + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                                            let filePath = filePathRoot + "/Output/" + VOLUMES_FOLDER_NAME + '/' + "Multi-Period-Daily" + "/" + timePeriod + "/" + dateForPath;

                                            chrisStorage.getTextFile(filePath, fileName, onCurrentDayFileReceived, true);

                                            function onCurrentDayFileReceived(err, text) {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> getProcessDayFile -> onCurrentDayFileReceived -> Entering function."); }
                                                    if (LOG_FILE_CONTENT === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> getProcessDayFile -> onCurrentDayFileReceived -> text = " + text); }

                                                    processDayFile = JSON.parse(text);
                                                    buildVolumes();

                                                } catch (err) {

                                                    if (processDate.valueOf() > contextVariables.maxBandFile.valueOf()) {

                                                        processDayFile = [];  // we are past the head of the market, then no worries if this file is non existent.
                                                        buildVolumes();

                                                    } else {

                                                        logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> getProcessDayFile -> onCurrentDayFileReceived -> err = " + err.message);
                                                        logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> getProcessDayFile -> onCurrentDayFileReceived -> filePath = " + filePath);
                                                        logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> getProcessDayFile -> onCurrentDayFileReceived -> market = " + market.assetA + '_' + market.assetB);

                                                        callBackFunction(global.DEFAULT_RETRY_RESPONSE);
                                                        return;
                                                    }
                                                }
                                            }

                                        } catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> getProcessDayFile -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                        }
                                    }

                                    function buildVolumes() {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> buildVolumes -> Entering function."); }

                                            pushVolumes(previousDayFile);
                                            pushVolumes(processDayFile);
                                            findVolumesStairs();

                                            function pushVolumes(volumesFile) {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> buildVolumes -> pushVolumes -> Entering function."); }

                                                    for (let i = 0; i < volumesFile.length; i++) {

                                                        let volume = {
                                                            amountBuy: 0,
                                                            amountSell: 0,
                                                            begin: undefined,
                                                            end: undefined
                                                        };

                                                        volume.amountBuy = volumesFile[i][0];
                                                        volume.amountSell = volumesFile[i][1];

                                                        volume.begin = volumesFile[i][2];
                                                        volume.end = volumesFile[i][3];

                                                        volumes.push(volume);

                                                    }

                                                } catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> buildVolumes -> pushVolumes -> err = " + err.message);
                                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                }
                                            }

                                        } catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> buildVolumes -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                        }
                                    }

                                    function findVolumesStairs() {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> findVolumesStairs -> Entering function."); }

                                            /* Finding channel */

                                            let buyUpStairs;
                                            let buyDownStairs;

                                            let sellUpStairs;
                                            let sellDownStairs;

                                            for (let i = 0; i < volumes.length - 1; i++) {

                                                let currentVolume = volumes[i];
                                                let nextVolume = volumes[i + 1];


                                                /* buy volume going up */

                                                if (currentVolume.amountBuy < nextVolume.amountBuy) {

                                                    if (buyUpStairs === undefined) {

                                                        buyUpStairs = {
                                                            type: undefined,
                                                            begin: undefined,
                                                            end: undefined,
                                                            direction: undefined,
                                                            barsCount: 0,
                                                            firstAmount: 0,
                                                            lastAmount: 0
                                                        };

                                                        buyUpStairs.type = 'buy';
                                                        buyUpStairs.direction = 'up';
                                                        buyUpStairs.barsCount = 2;

                                                        buyUpStairs.begin = currentVolume.begin;
                                                        buyUpStairs.end = nextVolume.end;

                                                        buyUpStairs.firstAmount = currentVolume.amountBuy;
                                                        buyUpStairs.lastAmount = nextVolume.amountBuy;

                                                    } else {

                                                        buyUpStairs.barsCount++;
                                                        buyUpStairs.end = nextVolume.end;
                                                        buyUpStairs.lastAmount = nextVolume.amountBuy;

                                                    }

                                                } else {

                                                    if (buyUpStairs !== undefined) {

                                                        if (buyUpStairs.barsCount > 2) {

                                                            pushToArray(buyUpStairs);
                                                        }

                                                        buyUpStairs = undefined;
                                                    }
                                                }

                                                /* buy volume going down */

                                                if (currentVolume.amountBuy > nextVolume.amountBuy) {

                                                    if (buyDownStairs === undefined) {

                                                        buyDownStairs = {
                                                            type: undefined,
                                                            begin: undefined,
                                                            end: undefined,
                                                            direction: undefined,
                                                            barsCount: 0,
                                                            firstAmount: 0,
                                                            lastAmount: 0
                                                        };

                                                        buyDownStairs.type = 'buy';
                                                        buyDownStairs.direction = 'down';
                                                        buyDownStairs.barsCount = 2;

                                                        buyDownStairs.begin = currentVolume.begin;
                                                        buyDownStairs.end = nextVolume.end;

                                                        buyDownStairs.firstAmount = currentVolume.amountBuy;
                                                        buyDownStairs.lastAmount = nextVolume.amountBuy;

                                                    } else {

                                                        buyDownStairs.barsCount++;
                                                        buyDownStairs.end = nextVolume.end;
                                                        buyDownStairs.lastAmount = nextVolume.amountBuy;

                                                    }

                                                } else {

                                                    if (buyDownStairs !== undefined) {

                                                        if (buyDownStairs.barsCount > 2) {

                                                            pushToArray(buyDownStairs);
                                                        }

                                                        buyDownStairs = undefined;
                                                    }
                                                }

                                                /* sell volume going up */

                                                if (currentVolume.amountSell < nextVolume.amountSell) {

                                                    if (sellUpStairs === undefined) {

                                                        sellUpStairs = {
                                                            type: undefined,
                                                            begin: undefined,
                                                            end: undefined,
                                                            direction: undefined,
                                                            barsCount: 0,
                                                            firstAmount: 0,
                                                            lastAmount: 0
                                                        };

                                                        sellUpStairs.type = 'sell';
                                                        sellUpStairs.direction = 'up';
                                                        sellUpStairs.barsCount = 2;

                                                        sellUpStairs.begin = currentVolume.begin;
                                                        sellUpStairs.end = nextVolume.end;

                                                        sellUpStairs.firstAmount = currentVolume.amountSell;
                                                        sellUpStairs.lastAmount = nextVolume.amountSell;

                                                    } else {

                                                        sellUpStairs.barsCount++;
                                                        sellUpStairs.end = nextVolume.end;
                                                        sellUpStairs.lastAmount = nextVolume.amountSell;

                                                    }

                                                } else {

                                                    if (sellUpStairs !== undefined) {

                                                        if (sellUpStairs.barsCount > 2) {

                                                            pushToArray(sellUpStairs);
                                                        }

                                                        sellUpStairs = undefined;
                                                    }
                                                }

                                                /* sell volume going down */

                                                if (currentVolume.amountSell > nextVolume.amountSell) {

                                                    if (sellDownStairs === undefined) {

                                                        sellDownStairs = {
                                                            type: undefined,
                                                            begin: undefined,
                                                            end: undefined,
                                                            direction: undefined,
                                                            barsCount: 0,
                                                            firstAmount: 0,
                                                            lastAmount: 0
                                                        };

                                                        sellDownStairs.type = 'sell';
                                                        sellDownStairs.direction = 'down';
                                                        sellDownStairs.barsCount = 2;

                                                        sellDownStairs.begin = currentVolume.begin;
                                                        sellDownStairs.end = nextVolume.end;

                                                        sellDownStairs.firstAmount = currentVolume.amountSell;
                                                        sellDownStairs.lastAmount = nextVolume.amountSell;

                                                    } else {

                                                        sellDownStairs.barsCount++;
                                                        sellDownStairs.end = nextVolume.end;
                                                        sellDownStairs.lastAmount = nextVolume.amountSell;

                                                    }

                                                } else {

                                                    if (sellDownStairs !== undefined) {

                                                        if (sellDownStairs.barsCount > 2) {

                                                            pushToArray(sellDownStairs);
                                                        }

                                                        sellDownStairs = undefined;
                                                    }
                                                }

                                                function pushToArray(channel) {

                                                    if (INTENSIVE_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> findVolumesStairs -> pushToArray -> Entering function."); }

                                                    try {

                                                        if (channel !== undefined) {

                                                            /*
                                                           Here we detect channel that started at process day - 2. 
                                                           */

                                                            if (channel.type === 'sell') {

                                                                if (channel.begin > endOfLastSellVolumeStair) {

                                                                    if (channel.begin >= processDate.valueOf()) {

                                                                        processDayStairsArray.push(channel);

                                                                    } else {

                                                                        previousDayStairsArray.push(channel);

                                                                    }
                                                                }
                                                            }
                                                            else {

                                                                if (channel.begin > endOfLastBuyVolumeStair) {

                                                                    if (channel.begin >= processDate.valueOf()) {

                                                                        processDayStairsArray.push(channel);

                                                                    } else {

                                                                        previousDayStairsArray.push(channel);

                                                                    }
                                                                }

                                                            }

                                                            channel = undefined;
                                                        }

                                                    } catch (err) {
                                                        logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> findVolumesStairs -> pushToArray -> err = " + err.message);
                                                        callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                    }
                                                }
                                            }

                                            writeVolumeStairsFile();

                                        } catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> findVolumesStairs -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                        }
                                    }

                                    function writeVolumeStairsFile() {

                                        try {

                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> writeVolumeStairsFile -> Entering function."); }

                                            writeFile(previousDayStairsArray, previousDay, onPreviousFileWritten);

                                            function onPreviousFileWritten() {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> writeVolumeStairsFile -> onPreviousFileWritten -> Entering function."); }

                                                    writeFile(processDayStairsArray, processDate, onProcessFileWritten);

                                                    function onProcessFileWritten() {

                                                        try {

                                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> writeVolumeStairsFile -> onPreviousFileWritten -> onProcessFileWritten -> Entering function."); }

                                                            controlLoop();

                                                        } catch (err) {
                                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> writeVolumeStairsFile -> onPreviousFileWritten -> onProcessFileWritten -> err = " + err.message);
                                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                        }
                                                    }

                                                } catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> writeVolumeStairsFile -> onPreviousFileWritten -> err = " + err.message);
                                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                }
                                            }

                                            function writeFile(pStairs, pDate, callback) {

                                                try {

                                                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> writeVolumeStairsFile -> writeFile -> Entering function."); }

                                                    let separator = "";
                                                    let fileRecordCounter = 0;

                                                    let fileContent = "";

                                                    for (i = 0; i < pStairs.length; i++) {

                                                        let channel = pStairs[i];

                                                        fileContent = fileContent + separator + '[' +
                                                            '"' + channel.type + '"' + "," +
                                                            channel.begin + "," +
                                                            channel.end + "," +
                                                            '"' + channel.direction + '"' + "," +
                                                            channel.barsCount + "," +
                                                            channel.firstAmount + "," +
                                                            channel.lastAmount + "]";

                                                        if (separator === "") { separator = ","; }

                                                        fileRecordCounter++;

                                                    }

                                                    fileContent = "[" + fileContent + "]";

                                                    let dateForPath = pDate.getUTCFullYear() + '/' + utilities.pad(pDate.getUTCMonth() + 1, 2) + '/' + utilities.pad(pDate.getUTCDate(), 2);
                                                    let fileName = '' + market.assetA + '_' + market.assetB + '.json';

                                                    let filePathRoot = bot.devTeam + "/" + bot.codeName + "." + bot.version.major + "." + bot.version.minor + "/" + global.PLATFORM_CONFIG.codeName + "." + global.PLATFORM_CONFIG.version.major + "." + global.PLATFORM_CONFIG.version.minor + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                                                    let filePath = filePathRoot + "/Output/" + VOLUME_STAIRS_FOLDER_NAME + "/" + bot.process + "/" + timePeriod + "/" + dateForPath;

                                                    paulaStorage.createTextFile(filePath, fileName, fileContent + '\n', onFileCreated);

                                                    function onFileCreated(err) {

                                                        try {

                                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> writeVolumeStairsFile -> writeFile -> onFileCreated -> Entering function."); }

                                                            if (LOG_FILE_CONTENT === true) {
                                                                logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> writeVolumeStairsFile -> writeFile -> onFileCreated ->  Content written = " + fileContent);
                                                            }

                                                            if (err.result !== global.DEFAULT_OK_RESPONSE.result) {
                                                                logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> loopBody -> processVolumes -> writeVolumeStairsFile -> writeFile -> onFileCreated -> err = " + err.message);
                                                                callBack(err);
                                                                return;
                                                            }

                                                            const logText = "[WARN] Finished with File @ " + market.assetA + "_" + market.assetB + ", " + fileRecordCounter + " records inserted into " + filePath + "/" + fileName + "";
                                                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> loopBody -> processVolumes -> writeVolumeStairsFile -> writeFile -> onFileCreated -> " + logText); }

                                                            callback();

                                                        } catch (err) {
                                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> writeVolumeStairsFile -> onPreviousFileWritten -> writeFile -> onFileCreated -> err = " + err.message);
                                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                        }
                                                    }

                                                } catch (err) {
                                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> writeVolumeStairsFile -> onPreviousFileWritten -> writeFile -> err = " + err.message);
                                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                                }
                                            }

                                        } catch (err) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> writeVolumeStairsFile -> err = " + err.message);
                                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                        }
                                    }

                                } catch (err) {
                                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> processVolumes -> err = " + err.message);
                                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                }
                            }

                        } catch (err) {
                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> loopBody -> err = " + err.message);
                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                        }
                    }

                    function controlLoop() {

                        try {

                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> controlLoop -> Entering function."); }

                            n++;

                            if (n < global.dailyFilePeriods.length) {

                                loopBody();

                            } else {

                                n = 0;

                                writeDataRanges(onWritten);

                                function onWritten(err) {

                                    try {

                                        if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> buildBollingerChannels -> controlLoop -> onWritten -> Entering function."); }

                                        if (err.result !== global.DEFAULT_OK_RESPONSE.result) {
                                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> controlLoop -> onWritten -> err = " + err.message);
                                            callBack(err);
                                            return;
                                        }

                                        writeStatusReport(processDate, advanceTime);

                                    } catch (err) {
                                        logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> controlLoop -> onWritten -> err = " + err.message);
                                        callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                                    }
                                }
                            }

                        } catch (err) {
                            logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> periodsLoop -> controlLoop -> err = " + err.message);
                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                        }
                    }
                }

                catch (err) {
                    logger.write(MODULE_NAME, "[ERROR] start -> buildBollingerChannels -> err.message = " + err.message);
                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                }
            }

            function writeDataRanges(callBack) {

                try {

                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeDataRanges -> Entering function."); }

                    writeDataRange(contextVariables.firstTradeFile, processDate, BOLLINGER_CHANNELS_FOLDER_NAME, onBandsStairsDataRangeWritten);

                    function onBandsStairsDataRangeWritten(err) {

                        if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeDataRanges -> Entering function."); }

                        if (err.result !== global.DEFAULT_OK_RESPONSE.result) {
                            logger.write(MODULE_NAME, "[ERROR] writeDataRanges -> writeDataRanges -> onBandsStairsDataRangeWritten -> err = " + err.message);
                            callBack(err);
                            return;
                        }

                        writeDataRange(contextVariables.firstTradeFile, processDate, VOLUME_STAIRS_FOLDER_NAME, onVolumeStairsDataRangeWritten);

                        function onVolumeStairsDataRangeWritten(err) {

                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] writeDataRanges -> writeDataRanges -> onVolumeStairsDataRangeWritten -> Entering function."); }

                            if (err.result !== global.DEFAULT_OK_RESPONSE.result) {
                                logger.write(MODULE_NAME, "[ERROR] writeDataRanges -> writeDataRanges -> onVolumeStairsDataRangeWritten -> err = " + err.message);
                                callBack(err);
                                return;
                            }

                            callBack(global.DEFAULT_OK_RESPONSE);
                        }
                    }
                }
                catch (err) {
                    logger.write(MODULE_NAME, "[ERROR] start -> writeDataRanges -> err = " + err.message);
                    callBack(global.DEFAULT_FAIL_RESPONSE);
                }

            }

            function writeDataRange(pBegin, pEnd, pProductFolder, callBack) {

                try {

                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeDataRange -> Entering function."); }

                    let dataRange = {
                        begin: pBegin.valueOf(),
                        end: pEnd.valueOf()
                    };

                    let fileContent = JSON.stringify(dataRange);

                    let fileName = 'Data.Range.' + market.assetA + '_' + market.assetB + '.json';
                    let filePath = bot.filePathRoot + "/Output/" + pProductFolder + "/" + bot.process;

                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeDataRange -> fileName = " + fileName); }
                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeDataRange -> filePath = " + filePath); }

                    paulaStorage.createTextFile(filePath, fileName, fileContent + '\n', onFileCreated);

                    function onFileCreated(err) {

                        if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeDataRange -> onFileCreated -> Entering function."); }

                        if (err.result !== global.DEFAULT_OK_RESPONSE.result) {
                            logger.write(MODULE_NAME, "[ERROR] start -> writeDataRange -> onFileCreated -> err = " + err.message);
                            callBack(err);
                            return;
                        }

                        if (LOG_FILE_CONTENT === true) {
                            logger.write(MODULE_NAME, "[INFO] start -> writeDataRange -> onFileCreated ->  Content written = " + fileContent);
                        }

                        callBack(global.DEFAULT_OK_RESPONSE);
                    }
                }
                catch (err) {
                    logger.write(MODULE_NAME, "[ERROR] start -> writeDataRange -> err = " + err.message);
                    callBack(global.DEFAULT_FAIL_RESPONSE);
                }
            }

            function writeStatusReport(lastFileDate, callBack) {

                if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeStatusReport -> Entering function."); }
                if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeStatusReport -> lastFileDate = " + lastFileDate); }

                try {

                    let reportKey = "AAMasters" + "-" + "AAPaula" + "-" + "Multi-Period-Daily" + "-" + "dataSet.V1";
                    let thisReport = statusDependencies.statusReports.get(reportKey);

                    thisReport.file.lastExecution = bot.processDatetime;
                    thisReport.file.lastFile = lastFileDate;
                    thisReport.save(callBack);

                }
                catch (err) {
                    logger.write(MODULE_NAME, "[ERROR] start -> writeStatusReport -> err = " + err.message);
                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                }
            }
        }
        catch (err) {
            logger.write(MODULE_NAME, "[ERROR] start -> err.message = " + err.message);
            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
        }
    }
};
