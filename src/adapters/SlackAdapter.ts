import { App } from '@slack/bolt';
import { BotAdapter, BotMessage, BotResponse } from '../interfaces/BotInterface';

export class SlackAdapter implements BotAdapter {
  private app: App;
  private messageHandler?: (message: BotMessage) => Promise<BotResponse | null>;
  private commandHandlers: Map<string, (message: BotMessage) => Promise<BotResponse | null>> = new Map();

  constructor(token: string, signingSecret: string, appToken: string) {
    this.app = new App({
      token,
      signingSecret,
      socketMode: true,
      appToken,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle slash commands
    this.app.command('/claude', async ({ command, ack, respond }) => {
      await ack();
      
      const botMessage: BotMessage = {
        text: command.text || '',
        channelId: command.channel_id,
        userId: command.user_id,
        isDirectMessage: command.channel_name === 'directmessage',
        isMention: false,
        isCommand: true,
        commandName: 'claude',
      };

      const handler = this.commandHandlers.get('claude');
      if (handler) {
        await respond({ text: '🤔 Thinking...' });
        const response = await handler(botMessage);
        if (response) {
          await respond({
            text: response.text,
            blocks: response.blocks,
          });
        }
      }
    });

    // /claude-help command
    this.app.command('/claude-help', async ({ command, ack, respond }) => {
      await ack();
      
      const botMessage: BotMessage = {
        text: command.text || '',
        channelId: command.channel_id,
        userId: command.user_id,
        isDirectMessage: command.channel_name === 'directmessage',
        isMention: false,
        isCommand: true,
        commandName: 'claude-help',
      };

      const handler = this.commandHandlers.get('claude-help');
      if (handler) {
        const response = await handler(botMessage);
        if (response) {
          await respond({
            text: response.text,
            blocks: response.blocks,
          });
        }
      }
    });

    // /claude-status command
    this.app.command('/claude-status', async ({ command, ack, respond }) => {
      await ack();
      
      const botMessage: BotMessage = {
        text: command.text || '',
        channelId: command.channel_id,
        userId: command.user_id,
        isDirectMessage: command.channel_name === 'directmessage',
        isMention: false,
        isCommand: true,
        commandName: 'claude-status',
      };

      const handler = this.commandHandlers.get('claude-status');
      if (handler) {
        const response = await handler(botMessage);
        if (response) {
          await respond({
            text: response.text,
            blocks: response.blocks,
          });
        }
      }
    });

    // /claude-clear command
    this.app.command('/claude-clear', async ({ command, ack, respond }) => {
      await ack();
      
      const botMessage: BotMessage = {
        text: command.text || '',
        channelId: command.channel_id,
        userId: command.user_id,
        isDirectMessage: command.channel_name === 'directmessage',
        isMention: false,
        isCommand: true,
        commandName: 'claude-clear',
      };

      const handler = this.commandHandlers.get('claude-clear');
      if (handler) {
        const response = await handler(botMessage);
        if (response) {
          await respond({
            text: response.text,
            blocks: response.blocks,
          });
        }
      }
    });

    this.app.command('/claude-repo', async ({ command, ack, respond }) => {
      await ack();
      
      const botMessage: BotMessage = {
        text: command.text || '',
        channelId: command.channel_id,
        userId: command.user_id,
        isDirectMessage: command.channel_name === 'directmessage',
        isMention: false,
        isCommand: true,
        commandName: 'claude-repo',
      };

      const handler = this.commandHandlers.get('claude-repo');
      if (handler) {
        await respond({ text: '🔄 Processing repository command...' });
        const response = await handler(botMessage);
        if (response) {
          await respond({
            text: response.text,
            blocks: response.blocks,
          });
        }
      }
    });

    this.app.command('/claude-skip-permissions', async ({ command, ack, respond }) => {
      await ack();
      
      const botMessage: BotMessage = {
        text: command.text || '',
        channelId: command.channel_id,
        userId: command.user_id,
        isDirectMessage: command.channel_name === 'directmessage',
        isMention: false,
        isCommand: true,
        commandName: 'claude-skip-permissions',
      };

      const handler = this.commandHandlers.get('claude-skip-permissions');
      if (handler) {
        const response = await handler(botMessage);
        if (response) {
          await respond({
            text: response.text,
            blocks: response.blocks,
          });
        }
      }
    });

    // Handle app mentions
    this.app.event('app_mention', async ({ event, client }) => {
      const mentionText = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
      
      const botMessage: BotMessage = {
        text: mentionText,
        channelId: event.channel,
        userId: event.user || '',
        isDirectMessage: false,
        isMention: true,
        isCommand: false,
      };

      if (this.messageHandler) {
        await client.chat.postMessage({
          channel: event.channel,
          text: '🤔 Let me think about that...',
        });

        const response = await this.messageHandler(botMessage);
        if (response) {
          await client.chat.postMessage({
            channel: event.channel,
            text: response.text,
            blocks: response.blocks,
          });
        }
      }
    });

    // Handle direct messages and channel messages
    this.app.message(async ({ message, client }) => {
      if (message.subtype) return;
      
      const directMessage = message.channel_type === 'im';
      const channelMessage = message.channel_type === 'channel' || message.channel_type === 'group';
      
      // Handle both DMs and channel messages
      if ((directMessage || channelMessage) && message.text) {
        const botMessage: BotMessage = {
          text: message.text,
          channelId: message.channel,
          userId: message.user || '',
          isDirectMessage: directMessage,
          isMention: false,
          isCommand: false,
        };

        if (this.messageHandler) {
          // チャンネルメッセージの場合は考え中メッセージを送信
          if (channelMessage) {
            await client.chat.postMessage({
              channel: message.channel,
              text: '🤔 考えています...',
              thread_ts: message.ts, // スレッドに返信
            });
          }

          const response = await this.messageHandler(botMessage);
          if (response) {
            await client.chat.postMessage({
              channel: message.channel,
              text: response.text,
              blocks: response.blocks,
              thread_ts: channelMessage ? message.ts : undefined, // チャンネルメッセージはスレッドに返信
            });
          }
        }
      }
    });
  }

  async start(): Promise<void> {
    await this.app.start();
    console.log('⚡️ Slack bot is running!');
  }

  async stop(): Promise<void> {
    await this.app.stop();
    console.log('🛑 Slack bot stopped');
  }

  async sendMessage(channelId: string, response: BotResponse): Promise<void> {
    await this.app.client.chat.postMessage({
      channel: channelId,
      text: response.text,
      blocks: response.blocks,
    });
  }

  async sendThinkingMessage(channelId: string): Promise<void> {
    await this.sendMessage(channelId, { text: '🤔 Thinking...' });
  }

  onMessage(handler: (message: BotMessage) => Promise<BotResponse | null>): void {
    this.messageHandler = handler;
  }

  onCommand(command: string, handler: (message: BotMessage) => Promise<BotResponse | null>): void {
    this.commandHandlers.set(command, handler);
  }
}