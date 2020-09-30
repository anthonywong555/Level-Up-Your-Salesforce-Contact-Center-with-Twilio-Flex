'use strict';

const functions = Runtime.getFunctions();

/*
 * Load Generator Helper Methods
 */
const generatorPath = functions['sfdc/helpers/sfdc/action/helpers/generator/index'].path;
const generator = require(generatorPath);

module.exports = {generator};