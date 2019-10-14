const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});
const cool = require('cool-ascii-faces');
const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const line = require("@line/bot-sdk");
const WavEncoder = require('wav-encoder');
const fs = require('fs')
const gdrive = require('./GDrive')
const slack = require('./slack_api')

const config = {
  channelAccessToken: process.env.ACCESS_TOKEN,
  channelSecret: process.env.SECRET_KEY
};
const client = new line.Client(config);
var content = [];
express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/cool', (req, res) => res.send(cool()))
  .get('/times', (req, res) => res.send(showTimes()))
  .get('/db', async (req, res) => {
    try {
      const poolClient = await pool.connect()
      const result = await poolClient.query('SELECT * FROM test_table');
      const results = { 'results': (result) ? result.rows : null };
      res.render('pages/db', results);
      poolClient.release();
    } catch (err) {
      reject(err);
      res.send("Error " + err);
    }
  })
  .post("/hook/", line.middleware(config), (req, res) => lineBot(req, res))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

showTimes = () => {
  let result = ''
  const times = process.env.TIMES || 5
  for (i = 0; i < times; i++) {
    result += i + ' '
  }
  return result;
}

function lineBot(req, res) {
  res.status(200).end();
  const events = req.body.events;
  const promises = [];
  for (let i = 0, l = events.length; i < l; i++) {
    const ev = events[i];
    promises.push(
      passAudioFile(ev)
    );
  }
  Promise.all(promises).then(console.log("pass"));
}

async function passAudioFile(ev) {
  console.log(`ev.type:${ev.message.type}`);
  if (ev.message.type === 'file') {
    let fileName = ev.message.fileName;
    const id = ev.message.id
    console.log(`ID: ${fileName}`);
    const ret = new Promise((resolve, reject) => {
      client.getMessageContent(id)
        .then((stream) => {
          stream
            .on('data', (chunk) => {
              content.push(new Buffer(chunk));
            })
            .on('error', (err) => {
              reject(err);
            })
            .on('end', function () {
              resolve(Buffer.concat(content));
            });
        });
    });
    ret.then((data)=>{
      outputAudio(fileName,data);
      console.log(ret);
    })
    return ret;
  }
  else if(ev.message.type === 'audio')
  {
    const id = ev.message.id;
    let fileName = id+".wav";
    console.log(fileName);
    const ret = new Promise((resolve, reject) => {
      client.getMessageContent(id)
        .then((stream) => {
          stream
            .on('data', (chunk) => {
              content.push(new Buffer(chunk));
            })
            .on('error', (err) => {
              reject(err);
            })
            .on('end', function () {
              resolve(Buffer.concat(content));
            });
        });
    });
    ret.then((data)=>{
      outputAudio(fileName,data);
      console.log(ret);
    })
    return ret;
  }
  else { return null; }
}
function outputAudio(fileName,target)
{
  console.log("wowowow");
  fs.writeFile(fileName, target, (e) => {
    if (e) {
      console.log(e)
    } else {
      slack.sendFile(fileName);
      console.log(`Successfully saved ${fileName}`);
    }
  })
}
//pending バイトサイズの計算がめんどい
// byte to Float32Array
function toF32Array(buf) {
  const buffer = new ArrayBuffer(buf.length);
  const view = new Uint32Array(buffer);
  for (let i = 0; i < buf.length; i++) {
    view[i] = buf[i];
  }
  return new Float32Array(buffer);
}

function ConvertToWave(data, sampleRate, filename) {
  const audioData = {
    sampleRate: sampleRate,
    channelData: [data]
  }
  WavEncoder.encode(audioData).then((buffer) => {
    fs.writeFile(filename, Buffer.from(buffer), (e) => {
      if (e) {
        console.log(e)
      } else {
        console.log(`Successfully saved ${filename}`);
      }
    })
  }).then(()=>{
    slack.sendFile(filename);
  })
  

}

async function echoman(ev) {
  const pro = await client.getProfile(ev.source.userId);
  return client.replyMessage(ev.replyToken, {
    type: "text",
    text: `${pro.displayName}さん、今「${ev.message.text}」って言いました？`
  })
}