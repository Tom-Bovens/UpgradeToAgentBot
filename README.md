# Chipchat Bug report bot (W.I.P)

This bot will allow admins from an organisation to see a list of colleagues of the contact they are talking to.

## Development

To run this bot as a Chatshipper developer, follow this guide.

1. Log in on development.chatshipper.com

2. Make a bot and write down / copy the bot token for later.

3. Go to the project folder and edit the .env file with your bot TOKEN. You don't have to change the HOST

4. Start an Ngrok server in a different terminal window directed to your localhost and copy the https address it gives.

5. Paste you Ngrok address in your Webhook URL on development.chatshipper.com

6. After following the above steps, run 'npm run dev' in the project directory and turn on your webhook. You should see a GET request coming in on Ngrok and being passed over to your application.

7. Your application should now be running.

