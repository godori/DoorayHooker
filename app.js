import express from 'express'
import bodyParser from 'body-parser'
import request from 'request'

import { FIREBASE_URL } from './config'

const app = express()

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

app.route('/')
  // .all(requireAuthentication)
  // .get((req, res) => {
  //   res.send('This is Dooray Hooker!')
  // })
  .post([checkHookType], (req, res) => {
    handleSendMessage(req.body)
  })

app.use((req, res, next) => {
  res.status(404).send("Sorry can't find that!")
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Server Error!')
})

app.listen(3030, () => {
  console.log('Run to 3030 port.')
  getDataTimer()
  setInterval(() => {
    getDataTimer()
  }, 60000)
})

function getDataTimer () {
  request({
    uri: `${FIREBASE_URL}/data.json`,
    method: 'GET'
  }, (error, response, body) => {
    if (error) {
      console.error(error)
    } else {
      let count = 0
      const date = new Date()
      const currentTime = (date.getHours() <= 9 ? '0' : '') + date.getHours() + ':' + (date.getMinutes() <= 9 ? '0' : '') + date.getMinutes()
      console.log('current time : ' + currentTime)
      const res = JSON.parse(response.body)
      for (const data in res) {
        console.log('setting time[ ' + count++ + ' ] : ' + res[data].hookTime)
        if (currentTime === res[data].hookTime) {
          sendMessage(res[data].id, res[data].name, res[data].image, res[data].data)
        }
      }
      console.log('\n=========================\n')
    }
  })
}

function checkHookType (req, res, next) {
  if (req.body.hookType === 'dooray-message') {
    next()
  } else {
    res.send('not message.')
  }
}

function handleSendMessage (body) {
  const hookId = body.hookId
  const data = body.data
  const botName = body.name
  const botIconImage = body.image

  sendMessage(hookId, botName, botIconImage, data)
}

function sendMessage (hookId, botName, botIconImage, data) {
  request({
    uri: hookId,
    method: 'POST',
    json: {
      botName,
      botIconImage,
      text: data.text,
      attachments: data.attachments
    }
  }, (error, response, body) => {
    if (error) {
      console.error(error)
    } else {
      console.log('success')
    }
  })
}
