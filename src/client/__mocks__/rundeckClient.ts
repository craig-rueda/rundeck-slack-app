import { RundeckClient } from "../rundeckClient";

export default {
    getRunningExecutionsForJob: jest.fn(),
    getExecutionById: jest.fn(),
    triggerJobExecution: jest.fn()
} as RundeckClient;