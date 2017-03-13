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
        console.log(`setting time[ ${count++} ] : ${res[data].hookTime}, hook term: ${(Number(res[data].hookTerm === 0) ? 'no term' : res[data].hookTerm)}`)
        if (currentTime === res[data].hookTime || checkHookTerm(currentTime, res[data].hookTime, res[data].hookTerm)) {
          sendMessage(res[data].id, res[data].name, res[data].image, res[data].data)
        }
      }
      console.log('\n=========================\n')
    }
  })
}

function checkHookTerm (currentTime, hookTime, hookTerm) {
  const term0 = Number(hookTime.split(':')[1])
  const term1 = Number(hookTime.split(':')[1]) % 10
  const term2 = (Number(hookTime.split(':')[1]) + 5) % 10
  const term3 = (Number(hookTime.split(':')[1]) + 15) % 60
  const term4 = (Number(hookTime.split(':')[1]) + 30) % 60
  const term5 = (Number(hookTime.split(':')[1]) + 45) % 60

  if (Number(hookTerm) === 5) {
    if (Number(currentTime.split(':')[1]) % 10 === term1 || Number(currentTime.split(':')[1]) % 10 === term2) {
      return true
    }
  } else if (Number(hookTerm) === 10) {
    if (Number(currentTime.split(':')[1]) % 10 === term1) {
      return true
    }
  } else if (Number(hookTerm) === 15) {
    if (Number(currentTime.split(':')[1]) === term0 || Number(currentTime.split(':')[1]) === term3 ||
        Number(currentTime.split(':')[1]) === term4 || Number(currentTime.split(':')[1]) === term5) {
      return true
    }
  } else if (Number(hookTerm) === 30) {
    if (Number(currentTime.split(':')[1]) === term0 || Number(currentTime.split(':')[1]) === term4) {
      return true
    }
  } else if (Number(hookTerm) === 60) {
    if (Number(currentTime.split(':')[1]) === term0) {
      return true
    }
  }
  return false
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
