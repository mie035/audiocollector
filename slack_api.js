require('dotenv').config()
const { WebClient } = require('@slack/web-api');
const token_ = process.env.SLACK_TOKEN;
const web = new WebClient(token_);
const fs = require('fs')
const request = require('request')

module.exports.sendFile = function(fileName)
{
    const api_url = 'https://slack.com/api/';
    var channel = 'general';
    options = {
        token: token_,
        filename: fileName,
        file: fs.createReadStream('./' + fileName),
        channels: channel
    };
    if(fs.existsSync(fileName)){
        //console.log(options.file);
    request.post({ url: api_url + 'files.upload', formData: options }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log('ok');
        } else {
            console.log('status code: ' + response.statusCode);
        }
    });
}
else{console.log("wav file doesn't exist")}
}

exports.postMessage = async () => {
    console.log(token_);
    console.log(web);
    // Post a message to the channel, and await the result.
    // Find more arguments and details of the response: https://api.slack.com/methods/chat.postMessage
    const result = await web.chat.postMessage({
        text: 'Hello world!',
        channel: '#general',
    });

    // The result contains an identifier for the message, `ts`.
    console.log(`Successfully send message ${result.ts}`);
}

exports.fileUpload = async () => {
    // Just use the `file` argument as the documentation suggests
    // See: https://api.slack.com/methods/files.upload
    const result = await web.files.upload({
        filename: 'test.txt',
        channels: '#general',
        content: 'aaaa',
        initial_comment: 'best',
    })

    // `res` contains information about the uploaded file
    console.log('File uploaded: ', result.file.id);
}