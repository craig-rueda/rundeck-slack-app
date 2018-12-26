
import { service, TargetEnv } from "./slackService";
import rundeckClient from "../client/rundeckClient";
import slackClient from "../client/slackClient";

jest.mock("../client/rundeckClient");
jest.mock("../client/slackClient");

beforeEach(() => {
    process.env = Object.assign(process.env, { JOB_EXEC_SYNC_INTERVAL_MS: "0" });
    jest.resetAllMocks();
});

it("Test send buttons", async () => {
    service.sendDeployResponse(TargetEnv.PROD, "http://test.com");
    expect(slackClient.sendMessageToCallback).toHaveBeenLastCalledWith("http://test.com", expect.anything());
});
