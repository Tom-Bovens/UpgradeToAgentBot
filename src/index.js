

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

const depositQuote = async () => {
    let quote = (Math.floor((Math.random() * 100)))
    let conversation
    const oldConvFinder = await bot.conversations.list({ name:'Need for inspiration?', participants:{ user: userId } })
    if (oldConvFinder.length > 0) {
        conversation = oldConvFinder[0]
        await bot.send(conversation.id, [
            {
                text: quote,
                isBackchannel: false,
                role: 'bot',
                delay: incrementor.set(3)
            }
        ])
    } else {
        conversation = await bot.conversations.create(
            { name: 'Need some inspiration?', messages: [{ text: `Hey there. I couldn't find a conversation to drop your quote in. So i made a new one. Here's your quote.` }] }
        )
        await bot.send(conversation.id, [
            {
                text: quote,
                isBackchannel: false,
                role: 'bot',
                delay: incrementor.set(3)
            }
        ])
    }
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

// Use any REST resource
// bot.users.get(bot.auth.user).then((botUser) => {
// log(`Hello ${botUser.role}`);
//});

// Logs any error produced to the console
bot.on('error', log);

bot.on('user.login', async (loginUser) => {
    try {
        const user = await bot.users.get(get(loginUser, 'data.user.id'))
        const userId = user.id
        const hasSubscribed = get(user, 'meta.subscribedToQuotes', 'false')
        log(`User status: ${hasSubscribed}`)
        if (hasSubscribed === "false") {
            log("User has not seen the guide on result comments yet.")
            if (user.role == 'agent') {
                if (userId) {
                    let conversation
                    const oldConvFinder = await bot.conversations.list({ name:'Need for inspiration?', participants:{ user: userId } })
                    if (oldConvFinder.length > 0) {
                        conversation = oldConvFinder[0]
                        await bot.send(conversation.id, [
                            {
                                text: `Hey there. Zen Chip here.`,
                                isBackchannel: false,
                                role: 'bot',
                                delay: incrementor.set(3),
                                actions: [
                                    {
                                        type: "reply",
                                        text: "Continue",
                                        payload: "userReturned"
                                    }
                                ]
                            }
                        ])
                    } else {
                        conversation = await bot.conversations.create(
                            { name: 'Need some inspiration?', messages: [{ text: `Hey there. Zen Chip here.` }] }
                        )
                    }
                    await bot.send(conversation.id, [
                        {
                            type: 'command',
                            text: '/assign',
                            meta: {
                                "users": [
                                    userId
                                ]
                            }
                        },
                        {
                            text: 'I was created to serve you an inspirational quote on a daily basis.',
                            role: 'bot',
                            delay: incrementor.increment(4)
                        },
                        {
                            text: 'Something like: "You must do the things you think you cannot do."',
                            role: 'bot',
                            delay: incrementor.increment(4)
                        },
                        {
                            text: 'Cool right? I guess we can always use an inspirational quote.',
                            role: 'bot',
                            delay: incrementor.increment(4)
                        },
                        {
                            text: 'Does a daily fresh quote sound good to you?',
                            role: 'bot',
                            delay: incrementor.increment(4),
                            actions: [
                                {
                                    type: "reply",
                                    text: "Yeah, surprise me daily.",
                                    payload: "userAccepted"
                                },
                                {
                                    type: "reply",
                                    text: "No thanks.",
                                    payload: "userDenied"
                                }
                            ]
                        }
                    ])
                }
            } else {
                log(`User is not an agent. Role is : ${user.role}`)
            }
        } else if (hasSubscribed === "true") {
            depositQuote()

        }
    } catch (e){
        errorCatch(e)
    }
});

bot.on('message.create.bot.postback.agent', async (message, conversation) => {
    try {
        const userId = message.user
        if (message.text == "userAccepted") {
            await bot.send(conversation.id, [
                {
                    text: `Great, i'll be back with a new quote tomorrow.`,
                    isBackchannel: false,
                    role: 'bot',
                    delay: incrementor.increment(3)
                }
            ])
            await bot.users.update(userId, { meta: { subscribedToQuotes: 'true' }})
        } else if (message.text == "userDenied") {
            await bot.send(conversation.id, [
                {
                    text: `Ok, i won't bother you again. If you change your mind you can activate me with the >zen command.`,
                    isBackchannel: false,
                    role: 'bot',
                    delay: incrementor.increment(3)
                }
            ])
            await bot.users.update(userId, { meta: { subscribedToQuotes: 'disabled' }})
        } else if (message.text == "KeepQuotes") {
            await bot.send(conversation.id, [
                {
                    text: `Alright then, see you tomorrow.`,
                    isBackchannel: false,
                    role: 'bot',
                    delay: incrementor.increment(3)
                }
            ])
            await bot.users.update(userId, { meta: { subscribedToQuotes: 'true' }})
        } else if (message.text == "StopQuotes") {
            await bot.send(conversation.id, [
                {
                    text: `Alright then. I won't bother you anymore.`,
                    isBackchannel: false,
                    role: 'bot',
                    delay: incrementor.increment(3)
                }
            ])
            await bot.users.update(userId, { meta: { subscribedToQuotes: 'disabled' }})
        } else if (message.text == "StartQuotes") {
            await bot.send(conversation.id, [
                {
                    text: `Alright then, I'll see you tomorrow.`,
                    isBackchannel: false,
                    role: 'bot',
                    delay: incrementor.increment(3)
                }
            ])
            await bot.users.update(userId, { meta: { subscribedToQuotes: 'true' }})
        } else if (message.text == "KeepQuotesOff") {
            await bot.send(conversation.id, [
                {
                    text: `Alright then, call me when you want to get daily quotes.`,
                    isBackchannel: false,
                    role: 'bot',
                    delay: incrementor.increment(3)
                }
            ])
            await bot.users.update(userId, { meta: { subscribedToQuotes: 'disabled' }})
        }
    } catch (e) { errorCatch(e) }
});

bot.on('message.create.agent.command', (message, conversation) => {
    if (message.type === 'command' && message.text === ">zen") {
        const userId = message.user
        bot.users.get(userId).then((user) => {i
            const userPreference = get(user, 'meta.subscribedToQuotes', 'false')
            if (userPreference === 'true') {
                conversation.say([
                    {
                        text: "Hey there. You are currently receiving daily quotes.",
                        role: 'bot',
                        delay: incrementor.set(2)
                    },
                    {
                        text: "Do you want to change this?",
                        role: 'bot',
                        delay: incrementor.increment(3),
                        actions: [
                            {
                                type: "reply",
                                text: `Keep receiving quotes.`,
                                payload: `KeepQuotes`
                            },
                            {
                                type: "reply",
                                text: "Stop receiving quotes.",
                                payload: `StopQuotes`
                            }
                        ]
                    }
                ]).catch(errorCatch)
            } else if (userPreference === 'disabled') {
                conversation.say([
                    {
                        text: "Hey there. You are currently not receiving daily quotes.",
                        role: 'bot',
                        delay: incrementor.set(2)
                    },
                    {
                        text: "Do you want to receive quotes?",
                        role: 'bot',
                        delay: incrementor.increment(3),
                        actions: [
                            {
                                type: "reply",
                                text: `Start receiving quotes.`,
                                payload: `StartQuotes`
                            },
                            {
                                type: "reply",
                                text: "Keep not receiving quotes.",
                                payload: `KeepQuotesOff`
                            }
                        ]
                    }
                ]).catch(errorCatch)
            }
        }).catch(errorCatch);
    }
})


// Start Express.js webhook server to start listening
bot.start();
