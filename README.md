# Rundeck Slack App Backend
This is a Slack app backend which triggers Rundeck pipelines in response to [slash commands](https://api.slack.com/slash-commands).
You define the command names, along with their targets via Slack's UI. There's a pretty good walkthrough [here](https://api.slack.com/tutorials/your-first-slash-command).

## Rundeck Setup
I'm assuming that you've already got a Rundeck instance setup and are likely using it for deploying stuff, otherwise you probably wouldn't be reading this guide.

1. `Rundeck API Token` - You can create tokens under the API Token section of your user's profile screen in the Rundeck UI. After you create a token, take note of it for use later on.
2. `Production`/`Staging` deployment jobs. Each job in Rundeck is assigned a GUID which this backend will use to trigger and monitor running jobs. Job GUIDs can be found at the bottom of each job's configuration screen. Again, take note of your jobs' IDs so that you can use them to configure the backend.

## Slack App Setup
1. You'll need to setup a new Slack app for your team. You can name it whatever you like, and assign it a custom icon, color, etc. to match your team's look/feel. Apps are managed [here](https://api.slack.com/apps)

2. Take note of the `Verification Token` found under your app's general settings section for use in later configuration.

3. Now that you have a new app, you'll need to create an incoming webhook which will allow this backend to post progress updates to your `#deployments` channel, or whatever you'd like to call it. After creating a webhook, be sure to make note of its URL.

4. Enable interactivity for your app. Under the `Interactive Components` tab, switch the `interactivity` toggle `on`. After you've enabled interactivity, input the following URL that Slack will use to callback to your app whenever users click buttons generated by this backend: `https://your.host.here/slack/actions`
    - **Note**: Slack app backends MUST be served over TLS using a `VALID` certificate. 
 
 5. Finally, create two new slash commands. This backend currently only supports the triggering of two Rundeck pipelines - deployment to staging/production (support for more can be added easily).
    - Each command can be named whatever you like. i.e. `/do-something-cool`, but MUST point at the following URLs: 
        - `https://your.host.here/slack/commands/deploy-latest-production`
        - `https://your.host.here/slack/commands/deploy-latest-staging`

## Backend Setup
Now that you've created and set everything up, you'll need to provide the following settings to the backend. However you end up running things (`Docker`, or just build & `npm`), configuration is done via env vars. A complete set of available variables is listed below. 

| Var Name  | Description  | Required  |
|---|---|---|
|DEPLOYMENT_CHANNEL_NAME|The name of the channel that updates will be posted to (omit the #)|yes|
|DEPLOYMENT_CHANNEL_WEBHOOK|The webhook URL created above|yes|
|NODE_ENV|Set to `production` for prod|no|
|RUNDECK_API_KEY|The API key used to coomunicate with Rundeck|yes|
|RUNDECK_API_BASE_URL|The base url of your Rundeck server|yes|
|RUNDECK_JOB_ID_PRODUCTION|The production deployment job ID|no|
|RUNDECK_JOB_ID_STAGING|The staging deployment job ID|no|
|JOB_EXEC_SYNC_INTERVAL_MS|The interval, in MS between synchronizations of running Rundeck pipelines|no|
|SLACK_VERIFICATION_TOKEN|The API verification token that Slack uses in their requests|yes|

## Deployment Methods
1. **Docker** - We've provided a pre-built Docker image which is ready to go.

    ```bash
    $ docker run -d -e "DEPLOYMENT_CHANNEL_NAME=deployments"...<all required vars here> -p "8080:8080" craigrueda/rundeck-slack-app:latest
    ```
2. **Docker-Compose** - There is a sample `docker-compose.yaml` provided in this repo. In order to use it:

    - Create a file named `.env` whose format should follow [.env.example](.env.example)
    - Fire up `docker-compose`
    ```bash
    $ docker-compose up
    ```
3. **NPM** - Just build/start the backend using npm

    ```bash
    # Install
    $ npm install

    # Build
    $ npm run build

    # Start the server
    $ npm run serve
    ```
