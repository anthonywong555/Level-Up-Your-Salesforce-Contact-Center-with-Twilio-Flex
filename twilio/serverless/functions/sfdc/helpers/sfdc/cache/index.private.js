'use strict';

/**
 * This file is responsible for fetching, updating, and storing the SFDC OAuth Response in a Cache.
 * The cache in this case will be Serverless Environment Variable.
 */

/**
 * Load Modules
 */
const jsforce = require('jsforce');

/**
 * This will be the key for serverless environment variable that will hold
 * Salesforce oauth response.
 */
const SFDC_OAUTH_RESPONSE = 'SFDC_OAUTH_RESPONSE';

/**
 * SERVERLESS FILE BOLIER PLATE
 */
const SERVERLESS_FILE_PATH = '/sfdc/helpers/sfdc/connection/index';

/**
 * This method will fetch a new SFDC OAuth Response and save it in Serverless Environment Variable.
 * @param {Object} serverlessContext Instance of Serverless Context
 * @param {Object} serverlessHelper Instance of this Function Template Helpers
 * @param {Object} twilioClient Instance of Twilio Node Module
 * @returns {Object} {accessToken, instanceUrl}
 */
const updateSFDCOAuthCache = async(serverlessContext, serverlessHelper, twilioClient) => {
  try {
    const {TWILIO_SERVERLESS_SERVICE_SID, TWILIO_SERVERLESS_ENVIRONMENT_SID} = serverlessContext;
    const sfdcOauthFromEnv = await serverlessHelper
      .twilio
      .serverless
      .variable
      .fetchByKey(twilioClient, TWILIO_SERVERLESS_SERVICE_SID, TWILIO_SERVERLESS_ENVIRONMENT_SID, SFDC_OAUTH_RESPONSE);
    
    const envSid = sfdcOauthFromEnv ? sfdcOauthFromEnv.sid : null;

    const sfdcOauthResponse = await serverlessHelper.sfdc.oauth.OAuthToSFDC(serverlessContext, serverlessHelper);
    const sfdcOauthResponseStringify = JSON.stringify(sfdcOauthResponse);

    await serverlessHelper
      .twilio
      .serverless
      .variable
      .upsert(twilioClient, TWILIO_SERVERLESS_SERVICE_SID, TWILIO_SERVERLESS_ENVIRONMENT_SID, envSid, SFDC_OAUTH_RESPONSE, sfdcOauthResponseStringify);
    return sfdcOauthResponse;
  } catch (e) {
    throw serverlessHelper.devtools.formatErrorMsg(serverlessContext, SERVERLESS_FILE_PATH, 'updateSFDCOAuthCache', e);
  }
}

/**
 * Check to see if the SFDC OAuth Response is valid in terms having 
 * the following fields:
 * - accessToken
 * - instanceUrl
 * @param {Object} sfdcOauthResponseStringify JSON Stringify of SFDC OAuth Response
 * @returns {Boolean} 
 */
const isValidOAuthResponse = (sfdcOauthResponseStringify) => {
  let result = true;
  try {
    const sfdcOauthResponse = JSON.parse(sfdcOauthResponseStringify);
    result = sfdcOauthResponse.accessToken && sfdcOauthResponse.instanceUrl;
  } catch (e) {
    result = false;
  }
  return result;
}

/**
 * This method will fetch the SFDC OAuth Response from Serverless Environment Variable.
 * It will fetch a new SFDC OAuth Response and save it in Environment
 * if the following is true:
 * - No SFDC OAuth Response in Serverless Environment.
 * - Not a valid SFDC OAuth Response in Serverless Environment. (In terms of missing fields: {accessToken, instanceUrl})
 * @param {Object} serverlessContext Instance of Serverless Context
 * @param {Object} serverlessHelper Instance of this Function Template Helpers
 * @param {Object} twilioClient Instance of Twilio Node Module
 * @returns {Object} {accessToken, instanceUrl}
 */
const getSFDCOAuthFromCache = async (serverlessContext, serverlessHelper, twilioClient) => {
  try {
    const {TWILIO_SERVERLESS_SERVICE_SID, TWILIO_SERVERLESS_ENVIRONMENT_SID} = serverlessContext;
    const sfdcOauthFromEnv = await serverlessHelper
      .twilio
      .serverless
      .variable
      .fetchByKey(twilioClient, TWILIO_SERVERLESS_SERVICE_SID, TWILIO_SERVERLESS_ENVIRONMENT_SID, SFDC_OAUTH_RESPONSE);
    let sfdcOauthResponse = null;

    if(sfdcOauthFromEnv && isValidOAuthResponse(sfdcOauthFromEnv.value)) {
      sfdcOauthResponse = JSON.parse(sfdcOauthFromEnv.value);
    } else {
      sfdcOauthResponse = await updateSFDCOAuthCache(serverlessContext, serverlessHelper, twilioClient);
    }

    return sfdcOauthResponse;
  } catch (e) {
    throw serverlessHelper.devtools.formatErrorMsg(serverlessContext, SERVERLESS_FILE_PATH, 'getSFDCOAuthFromCache', e);
  }
}

/**
 * This method will generate JSforce Connection by using 'cache' or get a new access token
 * from Salesforce.
 * @param {Object} serverlessContext Instance of Serverless Context
 * @param {Object} serverlessHelper Instance of this Function Template Helpers
 * @param {Object} twilioClient Instance of Twilio Node Module
 * @param {Boolean} forceRefresh Should Twilio get a new access token? Default false.
 * @returns {Object} JSforce Connection
 */
const getSFDCConnection = async(serverlessContext, serverlessHelper, twilioClient, forceRefresh = false) => {
  try {
    let sfdcOauthResponse;

    if(forceRefresh) {
      sfdcOauthResponse = await updateSFDCOAuthCache(serverlessContext, serverlessHelper, twilioClient);
    } else {
      sfdcOauthResponse = await getSFDCOAuthFromCache(serverlessContext, serverlessHelper, twilioClient);
    }
    
    const {accessToken, instanceUrl} = sfdcOauthResponse;
    const sfdcConnection = new jsforce.Connection();
    sfdcConnection.initialize({
      instanceUrl,
      accessToken
    });
    return sfdcConnection;
  } catch (e) {
    throw serverlessHelper.devtools.formatErrorMsg(serverlessContext, SERVERLESS_FILE_PATH, 'getSFDCConnection', e);
  }
}

module.exports = {getSFDCConnection};