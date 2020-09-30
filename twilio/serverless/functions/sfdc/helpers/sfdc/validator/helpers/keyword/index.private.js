const SFDC_ID_REGEX = /^[0-9a-zA-Z]{15}([0-9a-zA-Z]{3})?$/;

const ARRAY_OF_STRINGS_CHECKER = {
  errors: true,
  schema: false,
  validate: function validator(data) {
    validator.errors = [{
      keyword: 'validateMaxPoints',
      message: 'ids field is required. It can be either string, array of strings, or a string that can be JSON.parse()',
      params: {
        keyword: 'validateMaxPoints'
      }
    }];

    let result = false;
    if(typeof data === 'string') {
      if(isJSON(data)) {
        const parseData = JSON.parse(data);
        if(Array.isArray(parseData)) {
          result = parseData.every((current) => {
            return typeof current === 'string' && SFDC_ID_REGEX.test(current)
          });
        }
      } else {
        result = SFDC_ID_REGEX.test(data);
      }
    } else if(Array.isArray(data)) {
      result = data.every((current) => {
        return typeof current === 'string' && SFDC_ID_REGEX.test(current)
      });
    }
    return result;
  }
};

const RECORDS_KEYWORD_CHECKER = {
  schema: false,
  validate: function validator(data) {
    validator.errors = [{
      keyword: 'recordKeywordChecker',
      message: 'If the records value is a string, then it must be able to be JSON.parse()',
      params: {
        keyword: 'recordKeywordChecker'
      }
    }];
    const result = 
      (typeof data === 'string') ? 
      isJSON(data) : 
      true;
    return result;
  }
};

const isJSON = (jsonStringify) => {
  let result = false;
  try {
    JSON.parse(jsonStringify);
    result = true;
  } catch(e) {
    
  }
  return result;
}

module.exports = {ARRAY_OF_STRINGS_CHECKER, RECORDS_KEYWORD_CHECKER};