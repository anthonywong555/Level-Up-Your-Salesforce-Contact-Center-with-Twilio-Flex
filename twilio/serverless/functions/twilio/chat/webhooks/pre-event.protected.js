'use strict';

/**
 * This function gets called by Twilio Programmable Chat Webhooks
 * Reference: https://www.twilio.com/docs/chat/webhook-events#webhook-bodie-pre-event
 */

const SERVERLESS_FILE_PATH = '/twilio/chat/webhooks/pre-event';

/**
 * Twilio calls this method
 * @param {Object} context 
 * @param {Object} event 
 * @param {Function} callback
 * @returns {Object} 
 */
exports.handler = async (context, event, callback) => {
  try {
    const twilioClient = context.getTwilioClient();
    const serverlessHelper = loadServerlessModules();
    const result = await driver(context, event, serverlessHelper, twilioClient);
    return callback(null, result);
  } catch(e) {
    return callback(e);
  }
};

/**
 * Loads up related helper methods.
 */
const loadServerlessModules = () => {
  try {
    const functions = Runtime.getFunctions();
    const serverlessHelperPath = functions['helpers/devtools/index'].path;
    const serverlessHelper = require(serverlessHelperPath);
    return serverlessHelper;
  } catch (e) {
    throw e;
  }
}

/**
 * Main Driver of the Twilio Serverless Function
 * @param {Object} serverlessContext 
 * @param {Object} serverlessEvent 
 * @param {Object} serverlessHelper 
 * @param {Object} twilioClient 
 * @returns {Object}
 */
const driver = async (serverlessContext, serverlessEvent, serverlessHelper, twilioClient) => {
  try {
    const {EventType} = serverlessEvent;
    let result = {};

    switch(EventType) {
      case 'onMessageSend':
        result = await onMessageSendHandler(serverlessContext, serverlessEvent, serverlessHelper, twilioClient);
        break;
      default:
        break;
    }

    return result;
  } catch (e) {
    throw serverlessHelper.formatErrorMsg(serverlessContext, SERVERLESS_FILE_PATH, 'driver', e);
  }
}

const onMessageSendHandler = async(serverlessContext, serverlessEvent, serverlessHelper, twilioClient) => {
  try {
    const {AUTH_TOKEN, DOMAIN_NAME} = serverlessContext;
    const {InstanceSid, Body, From, ChannelSid} = serverlessEvent;
    
    // Get user
    const user = await twilioClient.chat.services(InstanceSid).users(From).fetch();
    
    // Get user's role
    const {roleSid} = user;
    const userRole = await twilioClient.chat.services(InstanceSid).roles(roleSid).fetch();

    // Check to see if the user roles is a customer.
    const customerRoles = ['service user', 'guest'];
    const author = customerRoles.includes(userRole.friendlyName) ? 'Customer' : 'Agent';

    // Query the record in Salesforce.
    let query = `SELECT Id FROM Twilio_Session__c WHERE Twilio_Chat_Channel_SID__c = '${ChannelSid}'`;
    const queryURL = `https://${DOMAIN_NAME}/sfdc/query/soql`;
    let twilioSessions = await serverlessHelper.twilioFunctionAPICallout(AUTH_TOKEN, queryURL, {query});

    let twilioSession;
    if(twilioSessions.totalSize > 0) {
      // Assume it's the first record.
      twilioSession = twilioSessions.records[0];
    } else {
      // Upsert the parent record in Salesforce.
      const upsertURL = `https://${DOMAIN_NAME}/sfdc/crud/upsert`;
      twilioSession = await serverlessHelper.twilioFunctionAPICallout(AUTH_TOKEN, upsertURL, {
        sobject: 'Twilio_Session__c',
        records: JSON.stringify({
          Twilio_Chat_Channel_SID__c: ChannelSid
        }),
        extIdField: 'Twilio_Chat_Channel_SID__c'
      });

      // Requery the record to get Id
      twilioSessions = await serverlessHelper.twilioFunctionAPICallout(AUTH_TOKEN, queryURL, {query});
      twilioSession = twilioSessions.records[0];
    }

    const createURL = `https://${DOMAIN_NAME}/sfdc/crud/create`;
    const transcription = await serverlessHelper.twilioFunctionAPICallout(AUTH_TOKEN, createURL, {
      sobject: 'Twilio_Transcription__c',
      records: JSON.stringify({
        Name__c: author,
        Content__c: Body,
        Twilio_Session__c: twilioSession.Id
      })
    });
    // Create the transcription record in Salesforce.
    return transcription;
  } catch(e) {
    throw serverlessHelper.formatErrorMsg(serverlessContext, SERVERLESS_FILE_PATH, 'onMessageSendHandler', e);
  }
}