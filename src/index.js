
const path = require('path');
const envfile = `${process.cwd()}${path.sep}.env`;
require('dotenv').config({
    path: envfile
});
const ChipChat = require('chipchat');
const log = require('debug')('tourguide')
const get = require('lodash/get');
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
    if (message.text === "/assign" && message.meta.users[0] === '5f42534edf6aa7001d0e7f1b') {
        try {
            await conversation.say({
                contentType: 'text/html',
                text: "Hey there! Support Chip here! You have called me to report a bug, isn't that right?",
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
                text: "Alright! So can you describe the issue you're having?",
            })
            await conversation.set('bugreportstatus', 'Bug')
        } else if (message.text === "Cancel") {
            await conversation.set('bugreportstatus', 'Off')
            await conversation.say([{
                text: "Ok then! Have a good day!",
            },
                {
                    type: 'command',
                    text: "/leave"
                }
            ])
        } else if (message.text === "ContinueReport") {
            const botty = await bot.users.get('5f42534edf6aa7001d0e7f1b')
            const channelname = botty.meta.bugreportchannel
            const channel = await bot.channels.list({name: "Bug Reports", limit:1})
            log(channel[0])
            if (channel[0].id) {
                await conversation.set('bugreportstatus', 'Off')
                await conversation.say([{
                    text: "Report submitted! Thanks for your help!",
                },
                    {
                        type: 'command',
                        text: "/leave"
                    },
                    {
                        type: 'command',
                        text: "/notify",
                        meta: {
                            channels: [
                                channel[0].id
                            ]
                        }
                    }
                ])
            } else {
                await conversation.say([{
                    text: "Could not find 'Bug Reports' channel. Unable to submit report to an admin. Is the bot set up correctly?",
                },
                    {
                        type: 'command',
                        text: "/leave",
                    }
                ])
            }
        } else if (message.text === "CancelReport") {
            await conversation.set('bugreportstatus', 'Off')
            await conversation.say([{
                text: "Alright, call me again when you want to remake the report.",
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
    try {
        const status = conversation.get('bugreportstatus')
        if (status === 'Bug') {
            bugString = message.text
            await conversation.set('bugreportstatus', 'Replication')
            status === 'Replication'
            await conversation.set('bugString', message.text)
            await conversation.say({
                contentType: 'text/html',
                text: "Can you give a quick description on how to reconstruct the issue? This is a pretty important step so describe it in detail.",
            })
        } else if (status === 'Replication' === true) {
            await conversation.set('replicationString', message.text)
            await conversation.set('bugreportstatus', 'Image')
            await conversation.say({
                contentType: 'text/html',
                text: "And do you happen to have an image of the bug? If you have one, upload it in the main channel. If you don't have one, just say anything else and I'll skip ahead.",
            })
        } else if (status === 'Image') {
            let imageURL = message.text
            const match = imageURL.match('http')
            if (match === null) {
                imageURL = "N/A"
            }
            await conversation.set('imageString', imageURL)
            await conversation.set('bugreportstatus', 'Off')
            const buggyString = conversation.get('bugString')
            const replicativeString = conversation.get('replicationString')
            const imageUrlString = conversation.get('imageString')
            await conversation.say(
                {
                    contentType: 'text/html',
                    text: `Is this the bug report you want to submit? <i></br></br><b>Issue description</b>:</br>${buggyString}</br></br><b>Steps to replicate:</b></br>${replicativeString}</br></br><b>Image of the issue</b>:</br>${imageUrlString}</i>`,
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
                }
            )
        }
    } catch(e) {
        errorCatch(e)
    }
})


// Start Express.js webhook server to start listening
bot.start();
