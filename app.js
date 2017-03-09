import express from 'express'
import bodyParser from 'body-parser'
import request from 'request'

const app = express()

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

app.route('/')
  // .all(requireAuthentication)
  // .get((req, res) => {
  //   res.send('This is Dooray Hooker!')
  // })
  .post([checkHookType], (req, res) => {
    handleSendMessage(req.body, res)
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
})

function checkHookType (req, res, next) {
  if (req.body.hookType === 'dooray-message') {
    next()
  } else {
    res.send('not message.')
  }
}

function handleSendMessage (body, res) {
  const hookId = body.hookId
  const data = body.data
  const botName = body.name
  const botIconImage = body.image

  sendMessage(hookId, botName, botIconImage, data, res)
}

function sendMessage (hookId, botName, botIconImage, data, res) {
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
      res.send('success')
    }
  })
}
