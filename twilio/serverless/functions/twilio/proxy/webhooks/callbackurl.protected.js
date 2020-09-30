'use strict';

/**
 * This function gets called by Twilio Proxy
 * Reference: https://www.twilio.com/docs/proxy/api/webhooks#callbackurl
 */

const SERVERLESS_FILE_PATH = '/twilio/proxy/webooks/callbackurl';
 
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
    const {interactionType, outboundResourceStatus} = serverlessEvent;
    let result = {};

    switch(interactionType) {
      case 'Message':
        if(outboundResourceStatus === 'delivered') {
          result = await messageHandler(serverlessContext, serverlessEvent, serverlessHelper, twilioClient);
        }
        break;
      default:
        break;
    }

    return result;
  } catch (e) {
    console.error(e);
    throw serverlessHelper.formatErrorMsg(serverlessContext, SERVERLESS_FILE_PATH, 'driver', e);
  }
}

const messageHandler = async (serverlessContext, serverlessEvent, serverlessHelper, twilioClient) => {
  try {
    const {AUTH_TOKEN, DOMAIN_NAME} = serverlessContext;
    const {interactionServiceSid, interactionSid, interactionSessionSid, inboundParticipantSid, inboundResourceSid} = serverlessEvent;
    const interactionData = JSON.parse(serverlessEvent.interactionData);
    let body = interactionData.body ? interactionData.body : 'Twilio Bot: Customer sent an attachment.';
    let result = {};
    // Check to see if the message is from agent or customer.
    const participant = await twilioClient.proxy.services(interactionServiceSid)
      .sessions(interactionSessionSid)
      .participants(inboundParticipantSid)
      .fetch();
    const {identifier} = participant;
    const phoneNumberRegExp = /^\+[1-9]\d{1,14}$/

    // Customer
    if(phoneNumberRegExp.test(identifier)) {
      const upsertURL = `https://${DOMAIN_NAME}/sfdc/crud/upsert`;

      let query = `SELECT Id FROM Twilio_Session__c WHERE Twilio_Proxy_Session_SID__c = '${interactionSessionSid}'`;
      const queryURL = `https://${DOMAIN_NAME}/sfdc/query/soql`;
      let twilioSessions = await serverlessHelper.twilioFunctionAPICallout(AUTH_TOKEN, queryURL, {query});

      let twilioSession;
      if(twilioSessions.totalSize > 0) {
        // Assume it's the first record.
        twilioSession = twilioSessions.records[0];
      } else {
        // Upsert the parent record in Salesforce.
        await serverlessHelper.twilioFunctionAPICallout(AUTH_TOKEN, upsertURL, {
          sobject: 'Twilio_Session__c',
          records: JSON.stringify({
            Twilio_Proxy_Session_SID__c: interactionSessionSid
          }),
          extIdField: 'Twilio_Proxy_Session_SID__c'
        });

        // Requery the parent record to get the Id
        twilioSessions = await serverlessHelper.twilioFunctionAPICallout(AUTH_TOKEN, queryURL, {query});
        twilioSession = twilioSessions.records[0];
      }

      const createURL = `https://${DOMAIN_NAME}/sfdc/crud/create`;
      const transcription = await serverlessHelper.twilioFunctionAPICallout(AUTH_TOKEN, createURL, {
        sobject: 'Twilio_Transcription__c',
        records: JSON.stringify({
          Name__c: 'Customer',
          Content__c: body,
          Twilio_Session__c: twilioSession.Id
        })
      });

      result = transcription;

      if(inboundResourceSid.startsWith('MM')) {
        // Get all Interaction Media URL
        const parentId = transcription.id;
        const medias = await twilioClient.messages(inboundResourceSid)
          .media
          .list();

        for(const aMedia of medias) {
          const formatURL = `https://api.twilio.com${aMedia.uri.replace('.json', '')}`;
          await serverlessHelper.twilioFunctionAPICallout(AUTH_TOKEN, upsertURL, {
            sobject: 'Twilio_Media__c',
            records: JSON.stringify({
              Content_Type__c: aMedia.contentType,
              SID__c: aMedia.sid,
              URL__c: formatURL,
              Twilio_Transcription__c: parentId
            }),
            extIdField: 'SID__c'
          });
        }
      }
    }
    return result;
  } catch(e) {
    console.error(e);
    throw serverlessHelper.formatErrorMsg(serverlessContext, SERVERLESS_FILE_PATH, 'messageHandler', e);
  }
}