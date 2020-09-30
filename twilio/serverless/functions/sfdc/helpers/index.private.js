'use strict';

const functions = Runtime.getFunctions();

/*
 * Load Salesforce Helper Methods
 */
const sfdcPath = functions['sfdc/helpers/sfdc/index'].path;
const sfdc = require(sfdcPath);

/*
 * Load Serverless Dev Tools Helper Methods
 */
const devtoolsPath = functions['sfdc/helpers/devtools/index'].path;
const devtools = require(devtoolsPath);

/*
 * Load Custom Twilio Helper Methods
 */
const twilioPath = functions['sfdc/helpers/twilio/index'].path;
const twilio = require(twilioPath);

module.exports = {sfdc, devtools, twilio};