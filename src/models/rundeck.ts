
export interface JobExecutions {
    executions: JobExecution[];
}

export interface JobExecution {
    "date-started": RundeckDate;
    id: string;
    href: string;
    job: Job;
    permalink: string;
    status: string;
    customStatus: string;
    project: string;
    user: string;
    serverUUID: string;
}

export interface Job {
    id: string;
    averageDuration: number;
    name: string;
    group: string;
    project: string;
    description: string;
    href: string;
    permalink: string;
}

export interface RundeckDate {
    date: string;
    unixtime: number;
}