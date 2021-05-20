const { IncomingWebhook } = require('@slack/webhook');

const config = require('../config.js');

// Initialize
const signalsWebHook = new IncomingWebhook(config.slackAPI.apeBotSignalsChannelURI);
const tradingWebHook = new IncomingWebhook(config.slackAPI.apeBotTradesChannelURI);

const postToSignalsChannel = async (messageText) => {
    await signalsWebHook.send({
        text: messageText,
    });
}

module.exports = postToSignalsChannel