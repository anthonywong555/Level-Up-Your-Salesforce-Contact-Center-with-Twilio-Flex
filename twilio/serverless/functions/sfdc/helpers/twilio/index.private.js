'use strict';

const functions = Runtime.getFunctions();

/*
 * Load Serverless Helper Methods
 */
const serverlessPath = functions['sfdc/helpers/twilio/serverless/index'].path;
const serverless = require(serverlessPath);

module.exports = {serverless};