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
        const user = conversation.participants.find((p) => p.role === 'agent').catch((err) => { errorCatch(err, console.trace()); });
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
            ]).catch((err) => { errorCatch(err, console.trace()); });
        }
    }
});

bot.on('message.create.*.postback', async (message, conversation) => {
    if (message.text === 'AskForUpgrade') {
        const user = conversation.participants.find((p) => p.role === 'agent').catch((err) => { errorCatch(err, console.trace()); });
        const adminColleagues = await bot.users.list({ organization: user.organization, role: 'admin' || 'owner', limit: 10 }).catch((err) => { errorCatch(err, console.trace()); });
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
        }).catch((err) => { errorCatch(err, console.trace()); });
    } else if (message.text.match('adminToAsk')) {
        const user = conversation.participants.find((p) => p.role === 'agent').catch((err) => { errorCatch(err, console.trace()); });
        const id = message.text.slice(11);
        const adminUser = await bot.users.get(id).catch((e) => { errorCatch(e, console.trace()); });
        await conversation.say({
            text: `Alright! I'll ask ${adminUser.givenName} for permission. In the mean time, you'll just have to wait.`,
            role: 'bot',
            delay: incrementor.set(3)
        }).catch((err) => { errorCatch(err, console.trace()); });
        const adminconversation = await bot.conversations.create(
            { name: 'Upgrade guest to Agent', messages: [{ text: `Hey ${adminUser.givenName}!` }] }
        ).catch((err) => { errorCatch(err, console.trace()); });
        conversation.set('adminConvUrl', adminconversation.id).catch((err) => { errorCatch(err, console.trace()); });
        await bot.send(adminconversation.id, [{
            text: `I've come to forward a request from the Guest account ${user.name} to have their account upgraded to Agent stats.`,
            delay: incrementor.set(4),
            actions: [
                {
                    type: 'reply',
                    text: 'Accept upgrade.',
                    payload: `accepted-${conversation.id}`
                },
                {
                    type: 'reply',
                    text: 'Deny upgrade.',
                    payload: `denied-${conversation.id}`
                }
            ]
        },
        {
            type: 'command',
            text: '/assign',
            meta: {
                users: [
                    adminUser.id
                ]
            }
        }]).catch((err) => { errorCatch(err, console.trace()); });
    } else if (message.text.match('accepted-')) {
        await bot.send(conversation.id, [{
            text: "Great! I'll inform him of your decision and will upgrade them to an agent account.",
            delay: incrementor.set(4)
        }]).catch((err) => { errorCatch(err, console.trace()); });
        const guestConvId = parseInt(message.text.slice(9), 10);
        await bot.send(guestConvId, [{
            text: 'Hi there! Person has approved your upgrade to an Agent account! You now have access to all the magical features that ChatShipper has to offer!',
            delay: incrementor.set(3)
        }]).catch((err) => { errorCatch(err, console.trace()); });
    } else if (message.text.match('denied-')) {
        await bot.send(conversation.id, [{
            text: 'Too bad then. What reason should I convey to them?',
            delay: incrementor.set(4)
        }]).catch((err) => { errorCatch(err, console.trace()); });
        const guestConvId = parseInt(message.text.slice(9), 10);
        conversation.set('guestConvId', guestConvId).catch((err) => { errorCatch(err, console.trace()); });
    }
});

bot.on('message.create.*.chat.*', async (message, conversation) => {
    const ID = await conversation.get('guestConvId').catch((err) => { errorCatch(err, console.trace()); });
    if (ID) {
        const reasonToGive = message.text;
        await bot.send(ID, [{
            text: 'Hey. Person has declined your upgrade to the Agent role.',
            delay: incrementor.set(3)
        },
        {
            text: "Here's the reason he gave for declining:",
            delay: incrementor.delay(3)
        },
        {
            text: reasonToGive,
            delay: incrementor.delay(5)
        },
        {
            text: 'Take it up with Person if you have any gripes, maybe you can convince him. Have a nice day!',
            delay: incrementor.delay(3)
        }
        ]).catch((err) => { errorCatch(err, console.trace()); });
    }
});

// Start Express.js webhook server to start listening
bot.start();
