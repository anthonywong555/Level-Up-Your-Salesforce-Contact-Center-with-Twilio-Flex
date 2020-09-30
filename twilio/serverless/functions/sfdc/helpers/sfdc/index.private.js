'use strict';

const SERVERLESS_FILE_PATH = '/sfdc/helpers/sfdc/index';

const functions = Runtime.getFunctions();

/*
 * Load Cache Helper Methods
 */
const cachePath = functions['sfdc/helpers/sfdc/cache/index'].path;
const cache = require(cachePath);

/**
 * Load Constants Helper Methods
 */
const constantsPath = functions['sfdc/helpers/sfdc/constants/index'].path;
const constants = require(constantsPath);

/*
 * Load Ouath Helper Methods
 */
const oauthPath = functions['sfdc/helpers/sfdc/oauth/index'].path;
const oauth = require(oauthPath);

/*
 * Load Action Helper Methods
 */
const actionPath = functions['sfdc/helpers/sfdc/action/index'].path;
const action = require(actionPath);

/**
 * Load Validator Helper Methods
 */
const validatorPath = functions['sfdc/helpers/sfdc/validator/index'].path;
const validator = require(validatorPath);

/**
 * Main Salesforce Driver
 * @param {Object} serverlessContext 
 * @param {Object} serverlessEvent 
 * @param {Object} serverlessHelper 
 * @param {Object} twilioClient 
 * @param {String} actionType 
 * @returns {Object}
 */
const driver = async (serverlessContext, serverlessEvent, serverlessHelper, twilioClient, actionType) => {
  try {
    const valid = serverlessHelper.sfdc.validator.isValidPayload(
      serverlessContext,
      serverlessEvent,
      serverlessHelper,
      actionType
    );
    
    if(!valid.isValid) {
      throw new Error(valid.errorMsg);
    }

    const sfdcConnection = await serverlessHelper.sfdc.cache.getSFDCConnection(
      serverlessContext, 
      serverlessHelper, 
      twilioClient
    );

    const result = await serverlessHelper.sfdc.action.driver(
      serverlessContext, 
      serverlessEvent, 
      serverlessHelper,
      sfdcConnection,
      actionType
    );
    
    return result;
  } catch(e) {
    throw serverlessHelper.devtools.formatErrorMsg(serverlessContext, SERVERLESS_FILE_PATH, 'driver', e);
  }
}

module.exports = {
  cache,
  constants,
  oauth,
  action,
  validator,
  driver
};