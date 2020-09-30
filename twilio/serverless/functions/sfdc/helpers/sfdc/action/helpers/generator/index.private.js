'use strict';

/**
 * SERVERLESS FILE BOLIER PLATE
 */
const SERVERLESS_FILE_PATH = '/sfdc/helpers/sfdc/action/helpers/generator/index';

const getJSON = (targetString) => {
  let result;
  try {
    result = JSON.parse(targetString);
  } catch (e) {
    result = targetString;
  }
  return result;
}

const generatePayload = (serverlessContext, serverlessEvent, serverlessHelper, actionType) => {
  try {
    let payload = null;
    switch(actionType) {
      case serverlessHelper.sfdc.constants.ACTION_QUERY:
        payload = {
          query: serverlessEvent.query
        };
        break;
      case serverlessHelper.sfdc.constants.ACTION_SOBJECT_CREATE:
      case serverlessHelper.sfdc.constants.ACTION_SOBJECT_UPDATE:
        payload = {
          sobject: serverlessEvent.sobject,
          records: getJSON(serverlessEvent.records)
        }
        break;
      case serverlessHelper.sfdc.constants.ACTION_SOBJECT_READ:
      case serverlessHelper.sfdc.constants.ACTION_SOBJECT_DELETE:
        payload = {
          sobject: serverlessEvent.sobject,
          ids: getJSON(serverlessEvent.ids)
        };
        break;
      case serverlessHelper.sfdc.constants.ACTION_SOBJECT_UPSERT:
        payload = {
          sobject: serverlessEvent.sobject,
          records: getJSON(serverlessEvent.records),
          extIdField: serverlessEvent.extIdField
        };
        break;
      default:
        throw new Error(`Unknown Action Type: ${actionType}`);
    }
    const action = {
      payload,
      type: actionType
    };

    return action;
  } catch (e) {
    throw serverlessHelper.devtools.formatErrorMsg(serverlessContext, SERVERLESS_FILE_PATH, 'generatePayload', e);
  }
}

const generateAction = (serverlessContext, serverlessEvent, serverlessHelper, actionType) => {
  try {
    const payload = generatePayload(serverlessContext, serverlessEvent, serverlessHelper, actionType);
    return payload;
  } catch(e) {
    throw serverlessHelper.devtools.formatErrorMsg(serverlessContext, SERVERLESS_FILE_PATH, 'generateAction', e);
  }
}

module.exports = {generateAction};