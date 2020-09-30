const nforce = require('nforce')
const EventEmitter = require('events')
require('dotenv').config()

class PublishSfdcService extends EventEmitter {
  constructor() {
    super()
    this.org = nforce.createConnection({
      clientId: process.env.SFDC_CONNECTED_APP_CONSUMER_KEY,
      clientSecret: process.env.SFDC_CONNECTED_APP_CONSUMER_SECRET,
      redirectUri: process.env.SFDC_CONNECTED_APP_CALLBACK_URL,
      apiVersion: 'v46.0',
      environment:
        process.env.SFDC_ENV === 'production' ? 'production' : 'sandbox',
      mode: 'single',
      autoRefresh: true,
    })
    this.oauth = null
    this.lastString = ''
    this.sequenceNum = 0
  }

  init = async () => {
    try {
      const response = await this.org.authenticate({
        username: process.env.SFDC_USERNAME,
        password: process.env.SFDC_PASSWORD + process.env.SFDC_SECURITY_TOKEN,
      })

      console.log(`logged into sfdc ${JSON.stringify(response)}`)
      this.oauth = response
    } catch (err) {
      console.error(`failed to login to sfdc`, err)
    }
  }

  search = async (keyword) => {
    try {
      const searchKAVs = `FIND {${keyword}} IN ALL FIELDS RETURNING Knowledge__kav(Id, Title, Answer__c, Question__c WHERE PublishStatus = \'Online\' AND Language = \'en_US\') WITH SNIPPET LIMIT 3`
      const resultKAVs = await this.org.search({ oauth, search: searchKAVs })
      const { searchRecords } = resultKAVs
      console.log(`searched and found ${JSON.stringify(searchRecords)}`)

      if (searchRecords) {
        let articles = []
        for (const aKAV of searchRecords) {
          console.log(`aKAV of searchRecords: ${JSON.stringify(aKAV)}`)
          const { Title, Answer__c, Question__c } = aKAV
          const snippet = aKAV['snippet.text']

          console.log(`snippet: ${JSON.stringify(snippet)}`)
          articles.push({
            title: Title,
            body: Answer__c,
            summary: Question__c,
          })
        }
        return articles
      }
      return []
    } catch (error) {
      console.log(`ERROR!\n ${JSON.stringify(error)}`)
    }
  }

  publish = async (data, metadata, direction) => {
    console.log('sfdc publish', data)
    let currText = data.transcript
    if (this.lastString && this.lastString === currText && !data.isFinal) {
      console.log('same value, not republishing')
    } else {
      console.log('publishing to sfdc')
      this.lastString = currText

      const { callSid, accountSid, streamSid } = metadata.start

      const event = nforce.createSObject('Twilio_Voice_Transcription__e')
      event.set('sequenceNum__c', this.sequenceNum)
      event.set('CallSid__c', callSid)
      event.set('AccountSid__c', accountSid)
      event.set('StreamSid__c', streamSid)
      event.set('Speaker__c', direction)
      let confidence = 0
      if (data.confidence && data.confidence.ToFixed) {
        confidence = data.confidence.ToFixed(6)
      }
      event.set('Confidence__c', confidence)
      event.set('text__c', currText)
      event.set('isComplete__c', data.isFinal)

      this.org.insert({ sobject: event, oauth: this.oauth }, (err) => {
        if (err) {
          console.error(err)
        } else {
          console.log('Twilio_Voice_Transcription__e published')
        }
      })
      if (data.isFinal) {
        this.sequenceNum++
      }
    }
  }
}
module.exports = PublishSfdcService
