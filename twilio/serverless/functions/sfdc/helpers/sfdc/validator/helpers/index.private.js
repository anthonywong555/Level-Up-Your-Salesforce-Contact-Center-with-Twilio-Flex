'use strict';

const functions = Runtime.getFunctions();

/**
 * Load Keyword Helper Methods
 */
const keywordPath = functions['sfdc/helpers/sfdc/validator/helpers/keyword/index'].path;
const keyword = require(keywordPath);

/*
 * Load Schema Helper Methods
 */
const schemaPath = functions['sfdc/helpers/sfdc/validator/helpers/schema/index'].path;
const schema = require(schemaPath);

module.exports = {keyword, schema};