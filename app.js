import express from 'express'
import bodyParser from 'body-parser'
import request from 'request'
import menubot from 'menubot'
import commitbot from 'commitbot'
import culturebot from 'culturebot'

import { FIREBASE_URL, CULTURE } from './config'

const exec = require('child_process').exec
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
  setInterval(() => getDataTimer(), 60000)
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
      let res = null

      if (response && response.body) {
        res = JSON.parse(response.body)
      } else {
        console.error('Connection err!')
        return false
      }

      if (!res.status) {
        console.log('<<<    Server was off    >>>')
        return
      }

      for (const data in res) {
        if (data === 'status') {
          continue
        }
        console.log(`setting time[ ${count++} ] : ${res[data].hookTime}, hook term: ${(res[data].hookTerm === '0') ? 'no term' : res[data].hookTerm}`)
        if (checkTimeToHome(date)) {
          if (currentTime === res[data].hookTime || checkHookTerm(currentTime, res[data].hookTime, res[data].hookTerm)) {
            if (res[data].hookType === 'dooray-weeklist') {
              sendTodayEndWeeklist(res[data].id, res[data].name, res[data].image, res[data].data)
            } else if (res[data].hookType === 'dooray-message') {
              sendMessage(res[data].id, res[data].name, res[data].image, res[data].data)
            } else if (res[data].hookType === 'dooray-commit') {
              sendTodayCommit(res[data].id, res[data].name, res[data].image, res[data].data, res[data].githubIds)
            } else if (res[data].hookType === 'dooray-menu') {
              sendMenu(res[data].id, res[data].name, res[data].image, res[data].hookMenuType, res[data].data)
            } else if (res[data].hookType === 'dooray-culture') {
              sendCulture(res[data].id, res[data].name, res[data].image, res[data].data)
            }
          }
          if (currentTime === '10:00' && res[data].hookType === 'dooray-weeklist') {
            sendTodayStartWeeklist(res[data].id, res[data].name, res[data].image, res[data].data)
          }
        }
      }
      console.log('\n=========================\n')
    }
  })
}

function checkTimeToHome (date) {
  if (date.getHours() > 19 || date.getHours() < 10) { // Off work
    console.log('<<<    Today work was done.    >>>')
    return false
  }
  if (date.getDay() === 0 || date.getDay() === 6) { // weekends
    console.log('<<<    Today is weekends.    >>>')
    return false
  }
  return true
}

function checkHookTerm (currentTime, hookTime, hookTerm) {
  const currentMin = Number(currentTime.split(':')[1])
  const hookMin = Number(hookTime.split(':')[1])

  const term0 = hookMin
  const term1 = hookMin % 10
  const term2 = (hookMin + 5) % 10
  const term3 = (hookMin + 15) % 60
  const term4 = (hookMin + 30) % 60
  const term5 = (hookMin + 45) % 60

  if (Number(hookTerm) === 5) {
    if (currentMin % 10 === term1 || currentMin % 10 === term2) {
      return true
    }
  } else if (Number(hookTerm) === 10) {
    if (currentMin % 10 === term1) {
      return true
    }
  } else if (Number(hookTerm) === 15) {
    if (currentMin === term0 || currentMin === term3 ||
        currentMin === term4 || currentMin === term5) {
      return true
    }
  } else if (Number(hookTerm) === 30) {
    if (currentMin === term0 || currentMin === term4) {
      return true
    }
  } else if (Number(hookTerm) === 60) {
    if (currentMin === term0) {
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

function sendTodayStartWeeklist (hookId, botName, botIconImage, data) {
  data.text = '오늘의 할 일 : `' + data.text + '`'
  _weeklistCommonCheck(hookId, botName, botIconImage, data)
}

function sendTodayEndWeeklist (hookId, botName, botIconImage, data) {
  data.text = '오늘의 할 일 `' + data.text + '` 을(를) 다 하셨나요? 고생하셨습니다 ㅎㅎ'
  _weeklistCommonCheck(hookId, botName, botIconImage, data)
}

function _weeklistCommonCheck (hookId, botName, botIconImage, data) {
  const currentDay = new Date().getDay()
  if ((data.day === 'monday' && currentDay === 1) ||
      (data.day === 'tuesday' && currentDay === 2) ||
      (data.day === 'wednesday' && currentDay === 3) ||
      (data.day === 'thursday' && currentDay === 4) ||
      (data.day === 'friday' && currentDay === 5)) {
    sendMessage(hookId, botName, botIconImage, data)
  }
}

function sendTodayCommit (hookId, botName, botIconImage, data, githubIds) {
  let result = {}

  githubIds = githubIds.split(',')

  Promise.all(
    githubIds.map(id => {
      id = id.trim()
      return commitbot.checkTodayCommit(id).then(res => {
        result[id] = res
      })
    })
  ).then(() => {
    console.log(result)
    let committers = ''
    let nonecommitters = ''
    for (var id in result) {
      result[id] ? committers += id + ', ' : nonecommitters += id + ', '
    }

    committers = committers.trim().slice(0, -1)
    nonecommitters = nonecommitters.trim().slice(0, -1)

    if (committers) {
      if (!nonecommitters) {
        data.text += `\n\n${data.committer}\nToday commit users - ${committers}`
      } else {
        data.text += `\n\n${data.committer}\nToday commit users - ${committers}\n\n${data.nonecommitter}\nToday none commit users = ${nonecommitters}`
      }
    } else {
      data.text += `\n\n${data.nonecommitter}\nToday none commit users = EVERYONE!!!!`
    }
    sendMessage(hookId, botName, botIconImage, data)
  })
}

function sendCulture (hookId, botName, botIconImage, data) {
  data.attachments = [{
    text: data.text
  }]

  Promise.all([culturebot.korean(CULTURE), culturebot.foreign(CULTURE), culturebot.festival(CULTURE)])
    .then(result => {
      const cultureList = result[0].concat(result[1]).concat(result[2])

      data.text = ''
      cultureList.map(function (culture, count) {
        data.text += `${count + 1}번: ${culture.title}\n날짜: ${culture.date}\n장소: ${culture.place}\n이미지: ${culture.image}\n\n`
      })
      sendMessage(hookId, botName, botIconImage, data)
    })
}

function sendMenu (hookId, botName, botIconImage, menuType, data) {
  menubot.sendMenu(hookId, menuType, {
    src: './img/all_menu/menu.png',
    dst: './img/daily_menu/menu_part.png'
  }, {
    botName,
    botIconImage,
    attachments: [{
      text: data.text
    }]
  }, () => {
    setTimeout(() => {
      exec('forever stopall; npm run start;', (err, stdout, stderr) => {
        console.log('stdout: ' + stdout)
        console.log('stderr: ' + stderr)
        if (err !== null) {
          console.log('error: ' + err)
        }
      })
    }, 60000)
  })
}
