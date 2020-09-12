
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
    if (message.text === "/assign" && message.meta.users[0] === '5f5cb6fa06c7d0001dd64e0b') {
        if (conversation.type === "agent" && message.text === "/join" || conversation.type === "agent" && message.text === "/assign") {
            try {
                const user = conversation.participants.find(p => p.role === 'agent');
                if (user) {
                    bot.send(conversation.id, [
                        {
                            text: `Hello ${user.displayName}! Do you want to be upgraded to the Agent role?`,
                            role: 'bot',
                            delay: incrementor.set(3),
                            actions: [
                            {
                                type: "reply",
                                text: "Yes!",
                                payload: "AskForUpgrade"
                            },
                            {
                                type: "reply",
                                text: "No.",
                                payload: "Cancel"
                            }
                            ]
                        }
                    ]);
                }
            } catch (e) {
                errorCatch(e)
            };
        }

    }
});

bot.on('message.create.*.postback', async (message, conversation) => {
    try {
        if (message.text === "AskForUpgrade") {
            const user = conversation.participants.find(p => p.role === 'agent');
            const getUser = await bot.users.get(user.user)
            const organization = await bot.organizations.get(user.organization)
            const adminColleagues = await bot.users.list({ organization:user.organization, role:'admin' || 'owner' , limit:10 })
            const adminArray = []
            for await (const element of adminColleagues) {
                try {
                    if (element.status === "active") {
                        const arrayElement = {
                            type: "reply",
                            text: element.displayName,
                            payload: "adminToAsk"
                        }
                        adminArray.push(arrayElement)
                    }
                } catch (e) {
                    errorCatch(e)
                }
            }
            log(adminArray)
            await conversation.say({
                text: "Alright! I'll have to ask an admin for permission before I can upgrade you. Which admin do you want me to ask?",
                role: 'bot',
                delay: incrementor.set(3),
                actions: adminArray
            })
        } else if (message.text === "adminToAsk") {
            await conversation.say({
                text: "Alright! I'll ask him for permission. In the mean time, you'll just have to wait.",
                role: 'bot',
                delay: incrementor.set(3),
            })
            log(message)
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
