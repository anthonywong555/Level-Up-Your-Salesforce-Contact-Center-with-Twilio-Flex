'use strict';

const functions = Runtime.getFunctions();

/*
 * Load Variables Helper Methods
 */
const variablePath = functions['sfdc/helpers/twilio/serverless/variable/index'].path;
const variable = require(variablePath);

/**
 * Return the timeout in milliseconds from serverless context.
 * @param {Object} serverlessContext 
 * @returns {Integer}
 */
const getTimeoutTimeInMillSecs = (serverlessContext) => {
  const {TWILIO_SERVERLESS_USE_TIMEOUT, TWILIO_SERVERLESS_SET_TIMEOUT} = serverlessContext;
  let timerInSecs = 0;
  if(TWILIO_SERVERLESS_USE_TIMEOUT === 'true') {
    const posInt = new RegExp('^[1-9]\d*$');
    if(posInt.test(TWILIO_SERVERLESS_SET_TIMEOUT)) {
      timerInSecs = TWILIO_SERVERLESS_SET_TIMEOUT;
    } else {
      throw new Error(`TWILIO_SERVERLESS_SET_TIMEOUT must be a positive integer and less than 10.`);
    }
  }
  const timerInMillSecs = timerInSecs * 1000;
  return timerInMillSecs;
}

module.exports = {variable, getTimeoutTimeInMillSecs};