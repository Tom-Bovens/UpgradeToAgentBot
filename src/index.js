
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
let bugString = ""
let replicationString = ""
let imageURL = ""
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
                participants: [message.user],
                text: "Alright! So can you describe the issue you're having?",
                isBackchannel: true,
            })
            conversationStatus = 'ListeningForBug'
        } else if (message.text === "Cancel") {
            await conversation.say([{
                participants: [message.user],
                text: "Ok then! Have a good day!",
                isBackchannel: true,
            },
                {
                    type: 'command',
                    text: "/leave"
                }
            ])
        } else if (message.text === "ContinueReport") {
            await conversation.say([{
                participants: [message.user],
                text: "Report submitted! Thanks for your help!",
                isBackchannel: true,
            },
                {
                    type: 'command',
                    text: "/leave"
                }
            ])
        } else if (message.text === "CancelReport") {
            await conversation.say([{
                participants: [message.user],
                text: "Alright, call me again when you want to remake the report.",
                isBackchannel: true,
            },
                {
                    type: 'command',
                    text: "/leave"
                }
            ])
        }
    } catch (e) {
        errorCatch(e)
    }
})

bot.on('message.create.*.chat.*', async (message, conversation) => {
    log(message)
    if (message.isBackchannel === true) {
        if (conversationStatus === 'ListeningForBug') {
            bugString = message.text
            conversationStatus === 'ListeningForReplication'
            await conversation.say({
                contentType: 'text/html',
                participants: [message.user],
                text: "Can you give a quick description on how to reconstruct the issue? This is a pretty important step so describe it in detail.",
                isBackchannel: true,
            })
        } else if (conversationStatus === 'ListeningForReplication') {
            replicationString = message.text
            conversationStatus === 'ListeningForImage'
            await conversation.say({
                contentType: 'text/html',
                participants: [message.user],
                text: "And do you happen to have an image of the bug? If you don't have one, just say anything else and I'll skip ahead.",
                isBackchannel: true,
            })
        } else if (conversationStatus === 'ListeningForImage') {
            imageURL = message.text
            const match = string.match(message.text)
            if (match.length === 0) {
                imageURL = "N/A"
            }
            await conversation.say({
                contentType: 'text/html',
                participants: [message.user],
                text: `Alright then. That was all.</br>${bugString}</br> ${replicationString}</br>${imageURL}`,
                isBackchannel: true,
            },
                {
                    contentType: 'text/html',
                    participants: [message.user],
                    text: "Is this the bug report you want to submit?",
                    isBackchannel: true,
                    actions: [
                        {
                            type: "reply",
                            text: "Yes, send it off.",
                            payload: "ContinueReport"
                        },
                        {
                            type: "reply",
                            text: "No, cancel the report.",
                            payload: "CancelReport"
                        }
                    ]
                })
        }
    }
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
                                participants: [user.user],
                                text: string,
                                isBackchannel: true
                            })
                        }
                    }
                }
            }
            */
