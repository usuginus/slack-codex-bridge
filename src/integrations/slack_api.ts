import { WebClient } from "@slack/web-api";

type SlackMessage = {
  user?: string;
  bot_id?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
};

type SlimMessage = {
  user: string;
  text: string;
  ts: string;
  thread_ts: string;
};

function slimMessages(
  messages: SlackMessage[] | undefined,
  limit: number | null = 20
): SlimMessage[] {
  const list = messages || [];
  const sliced = limit == null ? list : list.slice(0, limit);
  return sliced.map((m) => ({
    user: m.user || m.bot_id || "unknown",
    text: m.text || "",
    ts: m.ts || "",
    thread_ts: m.thread_ts || "",
  }));
}

function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object") {
    const obj = e as Record<string, unknown>;
    if (obj.data && typeof obj.data === "object") {
      const data = obj.data as Record<string, unknown>;
      if (typeof data.error === "string") return data.error;
    }
    if ("message" in obj && typeof obj.message === "string") {
      return obj.message;
    }
  }
  return String(e);
}

export type SlackContext = {
  channel_id: string;
  recent_messages?: Array<{
    user: string;
    text: string;
    ts: string;
    thread_ts: string;
  }>;
  recent_messages_error?: string;
  channel_members?: string[];
  channel_members_error?: string;
  request_user?: {
    id: string;
    name?: string;
    real_name?: string;
    display_name?: string;
    title?: string;
  };
  request_user_error?: string;
  thread_messages?: Array<{
    user: string;
    text: string;
    ts: string;
    thread_ts: string;
  }>;
  thread_messages_error?: string;
};

export async function buildSlackContext({
  token,
  channelId,
  userId,
  threadTs,
}: {
  token?: string;
  channelId?: string;
  userId?: string;
  threadTs?: string;
}): Promise<SlackContext | null> {
  if (!token || !channelId) return null;

  const client = new WebClient(token);
  const context: SlackContext = { channel_id: channelId };

  try {
    const history = await client.conversations.history({
      channel: channelId,
      limit: 20,
    });
    context.recent_messages = slimMessages(history.messages, 20);
  } catch (e: unknown) {
    context.recent_messages_error = getErrorMessage(e);
  }

  try {
    const members = await client.conversations.members({
      channel: channelId,
      limit: 50,
    });
    context.channel_members = (members.members || []).slice(0, 50);
  } catch (e: unknown) {
    context.channel_members_error = getErrorMessage(e);
  }

  if (userId) {
    try {
      const userInfo = await client.users.info({ user: userId });
      const profile = userInfo.user?.profile || {};
      context.request_user = {
        id: userId,
        name: userInfo.user?.name,
        real_name: profile.real_name,
        display_name: profile.display_name,
        title: profile.title,
      };
    } catch (e: unknown) {
      context.request_user_error = getErrorMessage(e);
    }
  }

  if (threadTs) {
    try {
      const allReplies: SlackMessage[] = [];
      let cursor: string | undefined = undefined;
      const deadline = Date.now() + 10000; // 10s timeout for thread fetching
      do {
        if (Date.now() > deadline) break;
        const replies = await client.conversations.replies({
          channel: channelId,
          ts: threadTs,
          limit: 100,
          cursor,
        });
        if (replies.messages?.length) {
          allReplies.push(...replies.messages);
        }
        cursor = replies.response_metadata?.next_cursor || undefined;
        if (allReplies.length >= 200) break;
      } while (cursor);
      context.thread_messages = slimMessages(allReplies, null);
    } catch (e: unknown) {
      context.thread_messages_error = getErrorMessage(e);
    }
  }

  return context;
}
