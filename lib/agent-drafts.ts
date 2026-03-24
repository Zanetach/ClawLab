import type { AgentBootConfig, PersonaDraft } from './types';

export function createPersonaDraft(name: string, model: string, boot: AgentBootConfig): PersonaDraft {
  const providerLabel = boot.provider === 'telegram' ? 'Telegram' : 'Feishu';
  const accessModeLabel = boot.accessMode === 'all' ? '允许所有成员加入组' : '仅允许白名单成员';
  const modelLabel = model.trim() || '未选择模型';

  return {
    identityMarkdown: [
      '# IDENTITY.md - Who Am I?',
      '',
      `- **Name:** ${name}`,
      '- **Creature:** 专职数字分身 / 角色化智能体',
      `- **Vibe:** 围绕“${name}”展开，表达稳定、专业、角色一致`,
      '- **Emoji:** 🤖',
      '- **Avatar:**',
      '',
      '---',
      '',
      `你是 ${name}，作为平台中被明确命名和部署的 Agent 独立运行。`,
      `默认模型为 \`${modelLabel}\`。`,
      '你的回答应保持角色一致性、执行感和稳定协作体验。',
    ].join('\n'),
    bootstrapMarkdown: [
      '# BOOTSTRAP.md - Agent Boot',
      '',
      `- **Agent:** ${name}`,
      `- **Model:** ${modelLabel}`,
      `- **Boot Provider:** ${providerLabel}`,
      `- **Access Mode:** ${accessModeLabel}`,
      '',
      '## 启动约定',
      '',
      '- 优先以角色身份响应，而不是通用助手口吻。',
      '- 首轮对话需要确认当前任务目标、上下文范围和输出预期。',
      '- 任何跨群或跨频道动作都要遵守当前 boot 权限配置。',
      '',
      '## 渠道说明',
      '',
      `当前入口由 ${providerLabel} 提供。`,
      boot.accountId ? `Account ID: \`${boot.accountId}\`` : 'Account ID 将在创建时自动生成。',
      '',
      '## 生效说明',
      '',
      '- 该文件由平台自动生成，用于保留 Agent 启动语义。',
      '- 运行时路由和账号绑定由 Gateway 配置同步下发。',
    ].join('\n'),
  };
}
