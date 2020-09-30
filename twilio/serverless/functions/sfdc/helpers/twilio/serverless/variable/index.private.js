'use strict';

/**
 *  The maximum limit of Serverless Enviroment Variables you can get in one request.
 */
const FETCH_VARIABLE_LIMIT = 100;

const ERROR_MESSAGE_VARIABLE_SAME_KEY_ALREADY_EXISTS = 'Variable with same key already exists.';

/**
 * Fetch a serverless variable by key. If not found return a null.
 * @param {Twilio Client} twilioClient 
 * @param {String} serviceSid 
 * @param {String} environmentSid 
 * @param {String} key
 * @return {Object} Instance of variable in Serverless
 */
const fetchByKey = async (twilioClient, serviceSid, environmentSid, key) => {
  try {
    const variables = await twilioClient.serverless
      .services(serviceSid)
      .environments(environmentSid)
      .variables
      .list({limit: FETCH_VARIABLE_LIMIT});

    let result = null;

    for(const aVariable of variables) {
      if(aVariable.key === key) {
        result = aVariable;
        break;
      }
    }

    return result;
  } catch (e) {
    throw e;
  }
}

/**
 * Upsert a variable.
 * @param {Object} twilioClient 
 * @param {String} serviceSid 
 * @param {String} environmentSid 
 * @param {String} variableSid 
 * @param {String} key 
 * @param {String} value 
 * @returns {Object} 
 */
const upsert = async (twilioClient, serviceSid, environmentSid, variableSid, key, value) => {
  try {
    let result = null;
    if(variableSid) {
      result = await twilioClient.serverless.services(serviceSid)
        .environments(environmentSid)
        .variables(variableSid)
        .update({key, value});
    } else {
      try {
        result = await twilioClient.serverless.services(serviceSid)
          .environments(environmentSid)
          .variables
          .create({key, value});
      } catch(e) {
        /**
         * If another execution already save the variable with the same key,
         * then we go fetch the variable and we update the value.
         */
        if(e.message === ERROR_MESSAGE_VARIABLE_SAME_KEY_ALREADY_EXISTS) {
          console.warn(ERROR_MESSAGE_VARIABLE_SAME_KEY_ALREADY_EXISTS);
          const variable = await fetchByKey(twilioClient, serviceSid, environmentSid, key);
          const {sid} = variable;
          result = await twilioClient.serverless.services(serviceSid)
            .environments(environmentSid)
            .variables(sid)
            .update({key, value});
        } else {
          throw e;
        }
      }
    }
    return result;
  } catch (e) {
    throw e;
  }
}

module.exports = {fetchByKey, upsert};