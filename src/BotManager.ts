import { BotAdapter, BotMessage, BotResponse } from './interfaces/BotInterface';
import { SlackAdapter } from './adapters/SlackAdapter';
import { DiscordAdapter } from './adapters/DiscordAdapter';
import { ClaudeCLIClient } from './claudeCLIClient';
import { StorageService } from './services/StorageService';
import { GitService } from './services/GitService';
import { createLogger } from './utils/logger';

const logger = createLogger('BotManager');

export class BotManager {
  private bots: BotAdapter[] = [];
  private claudeClient: ClaudeCLIClient;
  private storageService: StorageService;
  private gitService: GitService;

  constructor() {
    this.claudeClient = new ClaudeCLIClient();
    this.storageService = new StorageService();
    this.gitService = new GitService();
  }

  addSlackBot(token: string, signingSecret: string, appToken: string): void {
    const slackBot = new SlackAdapter(token, signingSecret, appToken);
    this.setupBot(slackBot);
    this.bots.push(slackBot);
  }

  addDiscordBot(token: string): void {
    const discordBot = new DiscordAdapter(token);
    this.setupBot(discordBot);
    this.bots.push(discordBot);
  }

  private setupBot(bot: BotAdapter): void {
    // Setup message handler for mentions and DMs
    bot.onMessage(async (message: BotMessage): Promise<BotResponse | null> => {
      if (!message.text) {
        return {
          text: '👋 Hi! How can I help you? Just send me your question.',
        };
      }

      // Check if channel has a repository configured
      const repo = this.storageService.getChannelRepository(message.channelId);
      const workingDirectory = repo?.localPath;

      // バックグラウンド完了時のコールバック
      const onBackgroundComplete = async (bgResult: any) => {
        await bot.sendMessage(message.channelId, {
          text: '✅ バックグラウンド処理が完了しました',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: bgResult.error 
                  ? `❌ バックグラウンド処理でエラーが発生しました:\n${bgResult.error}`
                  : `✅ バックグラウンド処理が完了しました:\n${bgResult.response}`,
              },
            },
          ],
        });
      };

      const result = await this.claudeClient.sendPrompt(message.text, {
        workingDirectory,
        onBackgroundComplete
      });

      if (result.error) {
        return {
          text: `❌ Error: ${result.error}`,
        };
      }

      return {
        text: result.response,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: result.response,
            },
          },
        ],
      };
    });

    // Setup /claude command handler
    bot.onCommand('claude', async (message: BotMessage): Promise<BotResponse | null> => {
      if (!message.text) {
        return {
          text: '📝 Please provide a prompt. Usage: `/claude <your prompt>`',
        };
      }

      // Check if channel has a repository configured
      const repo = this.storageService.getChannelRepository(message.channelId);
      const workingDirectory = repo?.localPath;

      // バックグラウンド完了時のコールバック
      const onBackgroundComplete = async (bgResult: any) => {
        await bot.sendMessage(message.channelId, {
          text: '✅ バックグラウンド処理が完了しました',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: bgResult.error 
                  ? `❌ バックグラウンド処理でエラーが発生しました:\n${bgResult.error}`
                  : `✅ バックグラウンド処理が完了しました:\n${bgResult.response}`,
              },
            },
          ],
        });
      };

      const result = await this.claudeClient.sendPrompt(message.text, {
        workingDirectory,
        onBackgroundComplete
      });

      if (result.error) {
        return {
          text: `❌ Error: ${result.error}`,
        };
      }

      return {
        text: result.response,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Claude says:*\n${result.response}`,
            },
          },
        ],
      };
    });

    // Setup /claude-code command handler
    bot.onCommand('claude-code', async (message: BotMessage): Promise<BotResponse | null> => {
      if (!message.text) {
        return {
          text: '📝 Please provide a code-related prompt. Usage: `/claude-code <your coding task>`',
        };
      }

      // Check if channel has a repository configured
      const repo = this.storageService.getChannelRepository(message.channelId);
      const workingDirectory = repo?.localPath;

      // バックグラウンド完了時のコールバック
      const onBackgroundComplete = async (bgResult: any) => {
        await bot.sendMessage(message.channelId, {
          text: '💻 バックグラウンドコード処理が完了しました',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: bgResult.error 
                  ? `❌ バックグラウンド処理でエラーが発生しました:\n${bgResult.error}`
                  : `💻 バックグラウンドコード処理が完了しました:\n${bgResult.response}`,
              },
            },
          ],
        });
      };

      // Add code context to the prompt
      const codePrompt = `Please provide a code solution or explanation for: ${message.text}`;
      const result = await this.claudeClient.sendPrompt(codePrompt, {
        workingDirectory,
        onBackgroundComplete
      });

      if (result.error) {
        return {
          text: `❌ Error: ${result.error}`,
        };
      }

      return {
        text: result.response,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Code Response:*\n${result.response}`,
            },
          },
        ],
      };
    });

    // Setup /claude-repo command handler
    bot.onCommand('claude-repo', async (message: BotMessage): Promise<BotResponse | null> => {
      if (!message.text) {
        return {
          text: '📝 使い方: `/claude-repo <リポジトリURL>` でクローン、`/claude-repo status` で状態確認',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*リポジトリ管理コマンド*\n\n' +
                      '• `/claude-repo <リポジトリURL>` - リポジトリをクローンしてチャンネルに紐付け\n' +
                      '• `/claude-repo status` - 現在のリポジトリ状態を確認\n' +
                      '• `/claude-repo delete` - チャンネルとリポジトリの紐付けを削除',
              },
            },
          ],
        };
      }

      const args = message.text.trim().toLowerCase();

      // Handle status command
      if (args === 'status') {
        const repo = this.storageService.getChannelRepository(message.channelId);
        if (!repo) {
          return {
            text: '❌ このチャンネルにはリポジトリが設定されていません',
          };
        }

        const status = await this.gitService.getRepositoryStatus(repo.localPath);
        if (!status.success) {
          return {
            text: `❌ リポジトリの状態を取得できませんでした: ${status.error}`,
          };
        }

        return {
          text: `リポジトリ: ${repo.repositoryUrl}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*リポジトリ情報*\n\n` +
                      `URL: ${repo.repositoryUrl}\n` +
                      `クローン日時: ${new Date(repo.createdAt).toLocaleString('ja-JP')}\n\n` +
                      `*Git状態*\n\`\`\`${status.status}\`\`\``,
              },
            },
          ],
        };
      }

      // Handle delete command
      if (args === 'delete') {
        const deleted = this.storageService.deleteChannelRepository(message.channelId);
        if (deleted) {
          return {
            text: '✅ チャンネルとリポジトリの紐付けを削除しました',
          };
        } else {
          return {
            text: '❌ このチャンネルにはリポジトリが設定されていません',
          };
        }
      }

      // Handle clone command (repository URL)
      const repoUrl = message.text.trim();
      
      // Basic URL validation
      if (!repoUrl.match(/^(https?:\/\/|git@)/)) {
        return {
          text: '❌ 有効なリポジトリURLを入力してください（HTTPSまたはSSH形式）',
        };
      }

      // Clone the repository
      const cloneResult = await this.gitService.cloneRepository(repoUrl, message.channelId);
      
      if (!cloneResult.success) {
        return {
          text: `❌ リポジトリのクローンに失敗しました: ${cloneResult.error}`,
        };
      }

      // Save the channel-repository mapping
      this.storageService.setChannelRepository(message.channelId, repoUrl, cloneResult.localPath!);

      return {
        text: '✅ リポジトリをクローンしました！',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*リポジトリのクローンが完了しました*\n\n` +
                    `URL: ${repoUrl}\n` +
                    `チャンネル: <#${message.channelId}>\n\n` +
                    `これでこのチャンネルでClaudeに話しかけると、このリポジトリのコンテキストで応答します。`,
            },
          },
        ],
      };
    });
  }

  async startAll(): Promise<void> {
    logger.info('Starting all bots');
    
    const isAvailable = await this.claudeClient.checkAvailability();
    logger.info('Claude CLI availability check', { available: isAvailable });
    
    if (!isAvailable) {
      logger.warn('Claude CLI not found. Please install from: https://claude.ai/download');
    }
    
    await Promise.all(this.bots.map(bot => bot.start()));
    logger.info('All bots started', { count: this.bots.length });
  }

  async stopAll(): Promise<void> {
    logger.info('Stopping all bots');
    await Promise.all(this.bots.map(bot => bot.stop()));
    logger.info('All bots stopped', { count: this.bots.length });
    
    // クリーンアップ実行
    this.claudeClient.cleanup();
    logger.debug('Claude client cleanup completed');
  }
}