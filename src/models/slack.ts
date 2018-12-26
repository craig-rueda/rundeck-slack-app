
export interface ActionPayload {
    actions: SlackAction[];
    action_ts?: string;
    attachment_id?: string;
    callback_id: string;
    channel?: SlackChannel;
    is_app_unfurl?: boolean;
    message_ts?: string;
    response_url: string;
    team?: SlackTeam;
    token?: string;
    trigger_id?: string;
    type?: string;
    user?: SlackUser;
}

export interface SlackTeam {
    id: string;
    domain: string;
}

export interface SlackChannel {
    id: string;
    name: string;
}

export interface SlackUser {
    id: string;
    name: string;
}

export interface SlashPayload {
    channel_id: string;
    channel_name: string;
    command: string;
    response_url: string;
    team_domain: string;
    team_id: string;
    token: string;
    trigger_id: string;
    user_id: string;
}

export interface ButtonsRequest {
    text: string;
    attachments: ButtonAttachment[];
}

export interface ButtonAttachment {
    actions: SlackAction[];
    attachment_type: string;
    callback_id: string;
    color: string;
    fallback: string;
    text: string;
}

export interface SlackAction {
    name: string;
    style?: string;
    text?: string;
    type: string;
    value: string;
}