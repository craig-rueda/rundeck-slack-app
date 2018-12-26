import { SlackClient } from "../slackClient";

export default {
    sendMessageToCallback: jest.fn(),
    sendMessageToDeploymentWebhook: jest.fn()
} as SlackClient;