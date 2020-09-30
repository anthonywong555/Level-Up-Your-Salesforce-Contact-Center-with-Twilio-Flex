'use strict';

/**
 * SERVERLESS FILE BOLIER PLATE
 */
const SERVERLESS_FILE_PATH = '/sfdc/helpers/sfdc/action/index';

/*
 * Load Action Helper Methods
 */
const functions = Runtime.getFunctions();
const actionHelpersPath = functions['sfdc/helpers/sfdc/action/helpers/index'].path;
const actionHelpers = require(actionHelpersPath);

const SFDC_ERROR_INVALID_SESSION_ID = 'INVALID_SESSION_ID';

const execute = async(serverlessHelper, sfdcConnection, action) => {
  try {
    const {type, payload} = action;
    const {query, sobject, ids, records, extIdField} = payload;

    switch(type) {
      case serverlessHelper.sfdc.constants.ACTION_QUERY:
        return await sfdcConnection.query(query);
      case serverlessHelper.sfdc.constants.ACTION_SOBJECT_CREATE:
        return await sfdcConnection.sobject(sobject).create(records);
      case serverlessHelper.sfdc.constants.ACTION_SOBJECT_READ:
        return await sfdcConnection.sobject(sobject).retrieve(ids);
      case serverlessHelper.sfdc.constants.ACTION_SOBJECT_UPDATE:
        return await sfdcConnection.sobject(sobject).update(records);
      case serverlessHelper.sfdc.constants.ACTION_SOBJECT_DELETE:
        return await sfdcConnection.sobject(sobject).destroy(ids);
      case serverlessHelper.sfdc.constants.ACTION_SOBJECT_UPSERT:
        return await sfdcConnection.sobject(sobject).upsert(records, extIdField);
      default:
        return null;
    }
  } catch(e) {
    throw e;
  }
}

const driver = async(serverlessContext, serverlessEvent, serverlessHelper, sfdcConnection, actionType) => {
  const SFDC_NUM_API_RETRY = parseInt(serverlessContext.SFDC_NUM_API_RETRY) ? 
    parseInt(serverlessContext.SFDC_NUM_API_RETRY) : 
    2;
  
  const action = actionHelpers.generator.generateAction(
    serverlessContext, 
    serverlessEvent, 
    serverlessHelper,
    actionType
  );
  
  let isErrorThrown;
  let result;

  for(let i = 0; i < SFDC_NUM_API_RETRY; i++) {
    try {
      isErrorThrown = false;
      result = await execute(serverlessHelper, sfdcConnection, action);
      break;
    } catch (e) {
      isErrorThrown = true;
      result = e;
      const {name} = e;
      if(name === SFDC_ERROR_INVALID_SESSION_ID) {
        sfdcConnection = await serverlessHelper.sfdc.cache.getSFDCConnection(serverlessContext, serverlessHelper, twilioClient, true);
      }
    }
  }

  if(isErrorThrown) {
    throw serverlessHelper.devtools.formatErrorMsg(serverlessContext, SERVERLESS_FILE_PATH, 'driver', result); 
  }

  return result;
}

module.exports = {driver};