'use strict';

/**
 * SERVERLESS FILE BOLIER PLATE
 */
const SERVERLESS_FILE_PATH = '/sfdc/helpers/sfdc/validator/index';

/**
 * Load Modules
 */
const Ajv = require('ajv');

/*
 * Load Validator Helper Methods
 */
const functions = Runtime.getFunctions();
const validatorHelpersPath = functions['sfdc/helpers/sfdc/validator/helpers/index'].path;
const validatorHelpers = require(validatorHelpersPath);

/**
 * 
 * @param {String} actionType 
 */
const loadValidator = (serverlessContext, serverlessHelper, actionType) => {
  const ajv = new Ajv({allErrors: true, jsonPointers: true});
  require('ajv-errors')(ajv);
  ajv.addKeyword('arrayOfStringsChecker', validatorHelpers.keyword.ARRAY_OF_STRINGS_CHECKER);
  ajv.addKeyword('recordKeywordChecker', validatorHelpers.keyword.RECORDS_KEYWORD_CHECKER);
  const targetSchema = validatorHelpers.schema.actionTypeToSchema(serverlessContext, serverlessHelper, actionType);
  const validator = ajv.compile(targetSchema);
  return validator;
}

/**
 * Checks to see if target payload is valid for JS Force.
 * @param {Object} serverlessContext 
 * @param {Object} serverlessHelper 
 * @param {Object} targetPayload 
 * @param {String} actionType See salesforce/helpers/sfdc/constants
 * @returns {Object} 
 */
const isValidPayload = (serverlessContext, serverlessEvent, serverlessHelper, actionType) => {
  try {
    const validator = loadValidator(serverlessContext, serverlessHelper, actionType);
    const isValid = validator(serverlessEvent);
    const errors = validator.errors;
    const errorMsg = errors ? 
    errors.reduce((acum, anError) => {
      return acum + anError.message + '\n'
    }, '') : 
    '';

    const result = {
      isValid,
      errorMsg
    };
    return result;
  } catch(e) {
    throw serverlessHelper.devtools.formatErrorMsg(serverlessContext, SERVERLESS_FILE_PATH, 'isValidPayload', e);
  }
}

module.exports = {isValidPayload};