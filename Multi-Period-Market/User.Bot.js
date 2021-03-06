﻿exports.newUserBot = function newUserBot(bot, logger, COMMONS, UTILITIES, BLOB_STORAGE, FILE_STORAGE) {

    const FULL_LOG = true;
    const LOG_FILE_CONTENT = false;
    const ONE_DAY_IN_MILISECONDS = 24 * 60 * 60 * 1000;

    const MODULE_NAME = "User Bot";

    const BOLLINGER_CHANNELS_FOLDER_NAME = "Bollinger-Channels";
    const BOLLINGER_SUB_CHANNELS_FOLDER_NAME = "Bollinger-Sub-Channels";

    const commons = COMMONS.newCommons(bot, logger, UTILITIES);

    thisObject = {
        initialize: initialize,
        start: start
    };

    let dataDependencies;

    return thisObject;

    function initialize(pDataDependencies, callBackFunction) {

        try {

            logger.fileName = MODULE_NAME;
            logger.initialize();

            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] initialize -> Entering function."); }

            dataDependencies = pDataDependencies;
            callBackFunction(global.DEFAULT_OK_RESPONSE);

        } catch (err) {
            logger.write(MODULE_NAME, "[ERROR] initialize -> err = " + err.message);
            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
        }
    }

    function start(dataFiles, timePeriod, outputPeriodLabel, startDate, endDate, callBackFunction) {

        try {

            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> Entering function."); }

            let market = global.MARKET;
            let dataFile;

            let bands = [];
            let channels = [];
            let subChannels = [];

            dataFile = dataFiles[0]; // We only need the bollinger bands.

            commons.buildBandsArray(dataFile, bands, timePeriod, callBackFunction);
            commons.buildChannels(bands, channels, callBackFunction);
            commons.buildSubChannels(bands, subChannels, callBackFunction);

            writeChannelsFile();

            function writeChannelsFile() {

                try {

                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeChannelsFile -> Entering function."); }

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

                    let filePathRoot = bot.devTeam + "/" + bot.codeName + "." + bot.version.major + "." + bot.version.minor + "/" + global.CLONE_EXECUTOR.codeName + "." + global.CLONE_EXECUTOR.version + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                    let filePath = filePathRoot + "/Output/" + BOLLINGER_CHANNELS_FOLDER_NAME + "/" + "Multi-Period-Market" + "/" + outputPeriodLabel;
                    filePath += '/' + fileName

                    fileStorage.createTextFile(bot.devTeam, filePath, fileContent + '\n', onFileCreated);

                    function onFileCreated(err) {

                        try {

                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeChannelsFile -> onFileCreated -> Entering function."); }
                            if (LOG_FILE_CONTENT === true) { logger.write(MODULE_NAME, "[INFO] start -> writeChannelsFile -> onFileCreated -> fileContent = " + fileContent); }

                            if (err.result !== global.DEFAULT_OK_RESPONSE.result) {

                                logger.write(MODULE_NAME, "[ERROR] start -> writeChannelsFile -> onFileCreated -> err = " + err.message);
                                logger.write(MODULE_NAME, "[ERROR] start -> writeChannelsFile -> onFileCreated -> filePath = " + filePath);
                                logger.write(MODULE_NAME, "[ERROR] start -> writeChannelsFile -> onFileCreated -> market = " + market.assetA + "_" + market.assetB);

                                callBackFunction(err);
                                return;

                            }

                            writeSubChannelsFile();

                        }
                        catch (err) {
                            logger.write(MODULE_NAME, "[ERROR] start -> writeChannelsFile -> onFileCreated -> err = " + err.message);
                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                        }
                    }
                }
                catch (err) {
                    logger.write(MODULE_NAME, "[ERROR] start -> writeChannelsFile -> err = " + err.message);
                    callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                }
            }

            function writeSubChannelsFile() {

                try {

                    if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeSubChannelsFile -> Entering function."); }

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

                    let filePathRoot = bot.devTeam + "/" + bot.codeName + "." + bot.version.major + "." + bot.version.minor + "/" + global.CLONE_EXECUTOR.codeName + "." + global.CLONE_EXECUTOR.version + "/" + global.EXCHANGE_NAME + "/" + bot.dataSetVersion;
                    let filePath = filePathRoot + "/Output/" + BOLLINGER_SUB_CHANNELS_FOLDER_NAME + "/" + "Multi-Period-Market" + "/" + outputPeriodLabel;
                    filePath += '/' + fileName

                    fileStorage.createTextFile(bot.devTeam, filePath, fileContent + '\n', onFileCreated);

                    function onFileCreated(err) {

                        try {

                            if (FULL_LOG === true) { logger.write(MODULE_NAME, "[INFO] start -> writeSubChannelsFile -> onFileCreated -> Entering function."); }
                            if (LOG_FILE_CONTENT === true) { logger.write(MODULE_NAME, "[INFO] start -> writeSubChannelsFile -> onFileCreated -> fileContent = " + fileContent); }

                            if (err.result !== global.DEFAULT_OK_RESPONSE.result) {

                                logger.write(MODULE_NAME, "[ERROR] start -> writeSubChannelsFile -> onFileCreated -> err = " + err.message);
                                logger.write(MODULE_NAME, "[ERROR] start -> writeSubChannelsFile -> onFileCreated -> filePath = " + filePath);
                                logger.write(MODULE_NAME, "[ERROR] start -> writeSubChannelsFile -> onFileCreated -> market = " + market.assetA + "_" + market.assetB);

                                callBackFunction(err);
                                return;

                            }

                            callBackFunction(global.DEFAULT_OK_RESPONSE);

                        }
                        catch (err) {
                            logger.write(MODULE_NAME, "[ERROR] start -> writeSubChannelsFile -> onFileCreated -> err = " + err.message);
                            callBackFunction(global.DEFAULT_FAIL_RESPONSE);
                        }
                    }
                }
                catch (err) {
                    logger.write(MODULE_NAME, "[ERROR] start -> writeSubChannelsFile -> err = " + err.message);
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
