
import { service, TargetEnv } from "./slackService";
import { ActionPayload } from "../models/slack";
import rundeckClient from "../client/rundeckClient";
import slackClient from "../client/slackClient";

jest.mock("../client/rundeckClient");
jest.mock("../client/slackClient");

beforeEach(() => {
    process.env = Object.assign(process.env, { JOB_EXEC_SYNC_INTERVAL_MS: "0" });
    jest.resetAllMocks();
});

it("Test empty actions", () => {
    const payload: ActionPayload = {
        actions: [],
        callback_id: "id_here",
        response_url: "url_here"
    };

    service.handleAction(payload);
    expect(slackClient.sendMessageToCallback).toHaveBeenLastCalledWith("url_here", { text: "Aborted...", replace_original: true });
});

it("Test Abort action", () => {
    const payload: ActionPayload = {
        actions: [
            {
                name: "abort",
                value: "abort",
                type: "button"
            }
        ],
        callback_id: "id_here",
        response_url: "url_here"
    };

    service.handleAction(payload);
    expect(slackClient.sendMessageToCallback).toHaveBeenLastCalledWith("url_here", { text: "Aborted...", replace_original: true });
});

it("Test submit already running", () => {
    const payload: ActionPayload = {
        actions: [
            {
                name: "proceed",
                value: "proceed",
                type: "proceed"
            }
        ],
        callback_id: "deploy_prod",
        response_url: "url_here"
    };

    rundeckClient.getRunningExecutionsForJob = jest.fn((jobId) => {
        return Promise.resolve({ executions: [
            {
                permalink: "http://already.running"
            }
        ] });
    });

    return service.handleAction(payload)
        .then(() => {
            expect(slackClient.sendMessageToCallback).toHaveBeenLastCalledWith(
                "url_here",
                { text: "The requested deployment job is already running: http://already.running", replace_original: true }
            );
        });
});

it("Test send buttons", () => {
    service.sendDeployResponse(TargetEnv.PROD, "http://test.com");
    expect(slackClient.sendMessageToCallback).toHaveBeenLastCalledWith("http://test.com", expect.anything());
});
