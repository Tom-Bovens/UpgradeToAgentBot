
// Add meta to the card to check if the links are the same, and make the bot not post another card.
// Make a more appropriate video.


const path = require('path');
const envfile = `${process.cwd()}${path.sep}.env`;
require('dotenv').config({
    path: envfile
});
const ChipChat = require('chipchat');
const log = require('debug')('tourguide')
const get = require('lodash/get');
let conversationStatus = "begin"
const incrementor = {
    // This function adds delay to the message to ensure the messages are posted in the right order
    autoDelayTime: 500,
    increment: function (timeToIncrease = 1) {
        this.autoDelayTime += (timeToIncrease * 1000);
        return this.autoDelayTime;
    },
    set: function (timeToSet = 1) {
        this.autoDelayTime = (timeToSet * 1000);
        return this.autoDelayTime;
    }
};
log(process.env.HOST,process.env.TOKEN)
const errorCatch = (error) => {
    log(error);
}

// Create a new bot instance
const bot = new ChipChat({
    host: process.env.HOST,
    token: process.env.TOKEN
});

// Crashes the code if no token is found
if (!process.env.TOKEN) {
    throw 'No token found, please define a token with export TOKEN=(Webhook token), or use an .env file.'
}

// Logs any error produced to the console
bot.on('error', log);

bot.on('message.create.*.command', async (message, conversation) => {
    log(message)
    if (message.text === ">bug") {
        try {
            await conversation.say({
                contentType: 'text/html',
                type: 'card',
                participants: [message.user],
                text: "Hey there! Support Chip here! You have called me to report a bug, isn't that right?",
                isBackchannel: true,
                actions: [
                    {
                        type: "reply",
                        text: "Yes, that's right.",
                        payload: "Continue"
                    },
                    {
                        type: "reply",
                        text: "No, I didn't.",
                        payload: "Cancel"
                    }
                ]
            })
        } catch (e) {
            errorCatch(e)
        }
    }
});

bot.on('message.create.*.postback', async (message, conversation) => {
    try {
        if (message.text === "Continue") {
            await conversation.say({
                contentType: 'text/html',
                type: 'card',
                participants: [message.user],
                text: "Alright! So can you describe the issue you're having?",
                isBackchannel: true,
            })
        } else if (message.text === "Cancel") {
            await conversation.say({
                contentType: 'text/html',
                type: 'card',
                participants: [message.user],
                text: "Ok then! Have a good day!",
                isBackchannel: true,
            })
        }
    } catch (e) {
        errorCatch(e)
    }
})

bot.on('message.create.*.chat.*', async (message, conversation) => {

})


// Start Express.js webhook server to start listening
bot.start();



/*
            const user = conversation.participants.find(p => p.role === 'admin' || p.role === 'owner');
            if (user) {
                const getUser = await bot.users.get(user.user)
                const domain = (getUser.email.split('@'))[1] // Splits the email address in tween, returning the domain in an array.
                    const organization = await bot.organizations.get(user.organization)
                const organizationDomain = organization.whitelist.find((whitelist) => whitelist === domain);
                if (organizationDomain) {
                    const colleagues = await bot.users.list({ organization:user.organization, role:'admin' || 'owner' , email:`~@${domain}`, limit:20 })
                    const names = colleagues.map(x => x.displayName)
                    let withURL = []
                    let withoutURL = []
                    for await (const element of names) {
                        try {
                            const conversationWithUrl = await bot.conversations.list({ participants:{name:element}, status:'active', limit:20 })
                            if (conversationWithUrl && conversationWithUrl[0].url != conversation.url) {
                                const object = {
                                    username: element,
                                    url: conversationWithUrl[0].url
                                }
                                withURL.push(object)
                            } else {
                                const object = {
                                    username: element,
                                    url: undefined
                                }
                                withoutURL.push(object)
                            }
                        } catch (e) {
                            const object = {
                                username: element,
                                url: undefined
                            }
                            withoutURL.push(object)
                        }
                    }
                    if (withURL.length > 0) {
                        let string = `<b><p style="font-size:15px">List of admins domain ${domain}. Domain is ${domain} </p></b> </br>`
                        const map1 = withURL.map((x, index) => `<a href=${x.url}><i>${x.username}</i></a>`)
                        string = string + map1.join(' </br>')
                        const map2 = withoutURL.map((x, index) => `<i>${x.username}</i>`)
                        string = string + ' </br>'
                        string = string + map2.join(' </br>')
                        olderMessage = await bot.messages.list({limit:1, type:'card', organization:conversation.organization})
                        if (olderMessage.text === string) {
                        } else {
                            await conversation.say({
                                contentType: 'text/html',
                                type: 'card',
                                participants: [user.user],
                                text: string,
                                isBackchannel: true
                            })
                        }
                    }
                }
            }
            */
