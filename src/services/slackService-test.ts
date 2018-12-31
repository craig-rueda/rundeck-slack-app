
import { service, TargetEnv } from "./slackService";
import { ActionPayload } from "../models/slack";
import rundeckClient from "../client/rundeckClient";
import slackClient from "../client/slackClient";

jest.mock("../client/rundeckClient");
jest.mock("../client/slackClient");

beforeEach(() => {
    jest.resetAllMocks();
});

test("Test empty actions", () => {
    const payload: ActionPayload = {
        actions: [],
        callback_id: "id_here",
        response_url: "url_here"
    };

    service.handleAction(payload);
    expect(slackClient.sendMessageToCallback).toHaveBeenLastCalledWith("url_here", { text: "Aborted...", replace_original: true });
});

test("Test Abort action", () => {
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

test("Test submit already running", () => {
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

test("Test submit prod", () => {
    const payload: ActionPayload = {
        actions: [
            {
                name: "proceed",
                value: "proceed",
                type: "proceed"
            }
        ],
        callback_id: "deploy_production",
        response_url: "url_here"
    };

    rundeckClient.getRunningExecutionsForJob = jest.fn((jobId) => {
        return Promise.resolve({ executions: [] });
    });
    rundeckClient.triggerJobExecution = jest.fn((jobId) => {
        expect(jobId).toEqual("PROD_JOB_GUID");
        return Promise.resolve();
    });

    return service.handleAction(payload)
        .then(() => {
            expect(slackClient.sendMessageToCallback).toHaveBeenLastCalledWith(
                "url_here",
                { text: "Triggering deployment job for production. Updates will be posted to #deployments", replace_original: true }
            );
        });
});

test("Test submit staging", () => {
    const payload: ActionPayload = {
        actions: [
            {
                name: "proceed",
                value: "proceed",
                type: "proceed"
            }
        ],
        callback_id: "deploy_staging",
        response_url: "url_here"
    };

    rundeckClient.getRunningExecutionsForJob = jest.fn((jobId) => {
        return Promise.resolve({ executions: [] });
    });
    rundeckClient.triggerJobExecution = jest.fn((jobId) => {
        expect(jobId).toEqual("STAGING_JOB_GUID");
        return Promise.resolve();
    });

    return service.handleAction(payload)
        .then(() => {
            expect(slackClient.sendMessageToCallback).toHaveBeenLastCalledWith(
                "url_here",
                { text: "Triggering deployment job for staging. Updates will be posted to #deployments", replace_original: true }
            );
        });
});

test("Test submit trigger error", () => {
    const payload: ActionPayload = {
        actions: [
            {
                name: "proceed",
                value: "proceed",
                type: "proceed"
            }
        ],
        callback_id: "deploy_production",
        response_url: "url_here"
    };

    rundeckClient.getRunningExecutionsForJob = jest.fn((jobId) => {
        return Promise.resolve({ executions: [] });
    });
    rundeckClient.triggerJobExecution = jest.fn((jobId) => {
        return Promise.reject();
    });

    return service.handleAction(payload)
        .then(() => {
            expect(slackClient.sendMessageToCallback).toHaveBeenLastCalledWith(
                "url_here",
                { text: "Failed to submit deployment job to production", replace_original: true }
            );
        });
});

test("Test check running jobs - empty", () => {
    rundeckClient.getRunningExecutionsForJob = jest.fn((jobId) => {
        return Promise.resolve({executions: []});
    });

    return service.checkRunningJobs();
});

test("Test check running jobs - error: running executions", () => {
    // expect.assertions(1);
    rundeckClient.getRunningExecutionsForJob = jest.fn((jobId) => {
        return Promise.reject("error");
    });

    return expect(service.checkRunningJobs()).rejects.toBe("error");
});

test("Test send buttons", () => {
    service.sendDeployResponse(TargetEnv.PROD, "http://test.com");
    expect(slackClient.sendMessageToCallback).toHaveBeenLastCalledWith("http://test.com", expect.anything());
});
