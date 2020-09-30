require('dotenv').config()

const url = require('url')
const WebSocket = require('ws')
const express = require('express')
const app = express()
const server = require('http').createServer(app)
const wss = new WebSocket.Server({ noServer: true })

const TranscriptionService = require('./services/transcription')
const SfdcService = require('./services/publishSfdc')

const publishSfdc = process.env.PUBLISH_SFDC === 'true' || false

let subscriptions = []

const log = function (message, ...args) {
  console.log(new Date(), message, ...args)
}

const sfdcService = new SfdcService()
sfdcService.init()

wss.on('connection', function connection(ws) {
  log('New Connection Initiated')

  let tracks = {}
  let metadata = null

  ws.on('message', async function incoming(message) {
    const msg = JSON.parse(message)
    const callSid = metadata ? metadata.start.callSid : null
    const trackName =
      callSid && msg.media ? callSid + '-' + msg.media.track : null
    if (trackName && tracks[trackName] === undefined) {
      log(`initializing services for ${callSid} and track ${msg.media.track}`)
      const transcriptService = new TranscriptionService()
      const direction = msg.media.track
      transcriptService.on('transcription', (transcription) => {
        transcription.isFinal = true
        log(`Transcription (${trackName}): ${transcription}`)
        if (publishSfdc) {
          //HACK - should pull this from crm
          const speaker = direction === 'outbound' ? 'Agent' : 'Customer'
          sfdcService.publish(transcription, metadata, speaker)
        }
      })
      transcriptService.on('interim-transcription', (transcription) => {
        log(`Transcription (${trackName}): ${transcription}`)
        if (publishSfdc) {
          //HACK - should pull this from crm
          const speaker = direction === 'outbound' ? 'Agent' : 'Customer'
          sfdcService.publish(transcription, metadata, speaker)
        }
      })
      const name = callSid + '-' + direction
      tracks[name] = {}
      tracks[name].transcript = transcriptService
    }
    switch (msg.event) {
      case 'start':
        log(
          `Starting Media Stream ${msg.streamSid} for call ${msg.start.callSid}`,
        )
        metadata = msg

        break
      case 'media':
        // Write Media Packets to the recognize stream
        try {
          tracks[trackName].transcript.send(msg.media.payload)
        } catch (err) {
          log(`error sending media to stt stream ${JSON.stringify(err)}`)
        }
        break
      case 'stop':
        log(`Call Has Ended`)
        for (let track of Object.keys(tracks)) {
          log(`Closing ${track} handler`)
          tracks[track].transcript.close()
        }
        delete tracks
        break
      default:
        log('unhandled message event', msg.event)
        break
    }
  })
})

wss.on('close', () => {
  log('disconnected')
  log(this)
})

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})

app.use(express.static('public'))

app.post('/', (req, res) => {
  res.set('Content-Type', 'text/xml')

  res.send(`
    <Response>
      <Start>
        <Stream url="wss://${req.headers.host}/"/>
      </Start>
      <Say>I will stream the next 60 seconds of audio through your websocket</Say>
      <Pause length="60" />
    </Response>
  `)
})

const port = process.env.PORT
log('Listening on Port', port)
server.listen(port)
