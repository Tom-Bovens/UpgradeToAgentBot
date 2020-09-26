const path = require('path');

const envfile = `${process.cwd()}${path.sep}.env`;
require('dotenv').config({
    path: envfile
});
const ChipChat = require('chipchat');
const log = require('debug')('tourguide');

const incrementor = {
    // This function adds delay to the message to ensure the messages are posted in the right order
    autoDelayTime: 500,
    increment(timeToIncrease = 1) {
        this.autoDelayTime += (timeToIncrease * 1000);
        return this.autoDelayTime;
    },
    set(timeToSet = 1) {
        this.autoDelayTime = (timeToSet * 1000);
        return this.autoDelayTime;
    }
};
log(process.env.HOST, process.env.TOKEN);
const errorCatch = (error) => {
    log(error);
};

// Create a new bot instance
const bot = new ChipChat({
    host: process.env.HOST,
    token: process.env.TOKEN
});

// Crashes the code if no token is found
if (!process.env.TOKEN) {
    throw new Error('No token found, please define a token with export TOKEN=(Webhook token), or use an .env file.');
}

// Logs any error produced to the console
bot.on('error', log);

bot.on('assign', async (message, conversation) => {
    if (conversation.type === 'agent') {
        try {
            const user = conversation.participants.find((p) => p.role === 'agent');
            if (user) {
                bot.send(conversation.id, [
                    {
                        text: 'Hello! Do you want to be upgraded to the Agent role?',
                        role: 'bot',
                        delay: incrementor.set(3),
                        actions: [
                            {
                                type: 'reply',
                                text: 'Yes!',
                                payload: 'AskForUpgrade'
                            },
                            {
                                type: 'reply',
                                text: 'No.',
                                payload: 'Cancel'
                            }
                        ]
                    }
                ]);
            }
        } catch (e) {
            errorCatch(e);
        }
    }
});

bot.on('message.create.*.postback', async (message, conversation) => {
    try {
        if (message.text === 'AskForUpgrade') {
            const user = conversation.participants.find((p) => p.role === 'agent');
            const adminColleagues = await bot.users.list({ organization: user.organization, role: 'admin' || 'owner', limit: 10 });
            const adminArray = [];
            for await (const adminUser of adminColleagues) {
                try {
                    if (adminUser.status === 'active') {
                        const arrayElement = {
                            type: 'reply',
                            text: adminUser.displayName,
                            payload: `adminToAsk:${adminUser.id}`
                        };
                        adminArray.push(arrayElement);
                    }
                } catch (e) {
                    errorCatch(e);
                }
            }
            await conversation.say({
                text: "Alright! I'll have to ask an admin for permission before I can upgrade you. Which admin do you want me to ask?",
                role: 'bot',
                delay: incrementor.set(3),
                actions: adminArray
            });
        } else if (message.text.match('adminToAsk')) {
            const user = conversation.participants.find((p) => p.role === 'agent');
            const getUser = await bot.users.get(user.user);
            const id = message.text.slice(11);
            const adminUser = await bot.users.get(id);
            await conversation.say({
                text: `Alright! I'll ask ${adminUser.givenName} for permission. In the mean time, you'll just have to wait.`,
                role: 'bot',
                delay: incrementor.set(3)
            });
            const adminconversation = await bot.conversations.create(
                { name: 'Upgrade guest to Agent', messages: [{ text: `Hey there ${adminUser.givenName}! I've come to forward a request from the Guest account ${getUser.displayName} to have their account upgraded to Agent status.` }, { delay: incrementor.set(5) }] }
            );
            log(adminconversation);
            await bot.send(adminconversation.id, {
                type: 'command',
                text: '/assign',
                meta: {
                    users: [
                        adminUser.id
                    ]
                }
            });
        }
    } catch (e) {
        errorCatch(e);
    }
});

bot.on('message.create.*.chat.*', async (message, conversation) => {
    try {
        const status = conversation.get('bugreportstatus');
        if (status === 'Bug') {
            await conversation.set('bugreportstatus', 'Replication');
            await conversation.set('bugString', message.text);
            await conversation.say({
                contentType: 'text/html',
                text: 'Can you give a quick description on how to reconstruct the issue? This is a pretty important step so describe it in detail.'
            });
        } else if (status === 'Replication' === true) {
            await conversation.set('replicationString', message.text);
            await conversation.set('bugreportstatus', 'Image');
            await conversation.say({
                contentType: 'text/html',
                text: "And do you happen to have an image of the bug? If you have one, upload it in the main channel. If you don't have one, just say anything else and I'll skip ahead."
            });
        } else if (status === 'Image') {
            let imageURL = message.text;
            const match = imageURL.match('http');
            if (match === null) {
                imageURL = 'N/A';
            }
            await conversation.set('imageString', imageURL);
            await conversation.set('bugreportstatus', 'Off');
            const buggyString = conversation.get('bugString');
            const replicativeString = conversation.get('replicationString');
            const imageUrlString = conversation.get('imageString');
            await conversation.say(
                {
                    contentType: 'text/html',
                    text: `Is this the bug report you want to submit? <i></br></br><b>Issue description</b>:</br>${buggyString}</br></br><b>Steps to replicate:</b></br>${replicativeString}</br></br><b>Image of the issue</b>:</br>${imageUrlString}</i>`,
                    actions: [
                        {
                            type: 'reply',
                            text: 'Yes, send it off.',
                            payload: 'ContinueReport'
                        },
                        {
                            type: 'reply',
                            text: 'No, cancel the report.',
                            payload: 'CancelReport'
                        }
                    ]
                }
            );
        }
    } catch (e) {
        errorCatch(e);
    }
});

// Start Express.js webhook server to start listening
bot.start();
