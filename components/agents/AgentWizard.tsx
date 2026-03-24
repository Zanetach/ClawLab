'use client';

import { useEffect, useMemo, useState } from 'react';
import { IndustrialButton } from '@/components/ui/IndustrialButton';
import { createPersonaDraft } from '@/lib/agent-drafts';
import { getAvailableModels } from '@/lib/gateway';
import type {
  AccessMode,
  AgentRole,
  AvailableModel,
  BootProvider,
  CreateAgentInput,
  PersonaDraft,
} from '@/lib/types';

interface AgentWizardProps {
  onComplete: (data: CreateAgentInput) => void;
  onCancel: () => void;
}

export interface AgentFormData {
  agentId: string;
  workspacePath: string;
  name: string;
  role: AgentRole;
  model: string;
  persona: PersonaDraft;
  boot: {
    provider: BootProvider;
    accountId: string;
    accessMode: AccessMode;
    allowMembersText: string;
    telegramToken: string;
    feishuAppId: string;
    feishuAppSecret: string;
  };
}

const ROLES: { value: AgentRole; label: string; description: string }[] = [
  { value: 'custom', label: '角色化 Agent', description: '最贴合“输入角色即创建 Agent”的场景' },
  { value: 'coordinator', label: '协调型', description: '负责任务分发、上下文整理和主控' },
  { value: 'executor', label: '执行型', description: '专注单一领域执行和持续产出' },
  { value: 'observer', label: '观察型', description: '侧重监控、检查、审阅和报告' },
];

const STEPS = [
  { id: 1, title: '输入角色', description: '角色名称会直接作为 Agent 名称' },
  { id: 2, title: '选择模型', description: '实时读取 Gateway 已配置模型' },
  { id: 3, title: '生成特征', description: '自动生成 IDENTITY.md 与 BOOTSTRAP.md' },
  { id: 4, title: '配置 Bot', description: '选择 TG 或飞书并设置权限' },
  { id: 5, title: '确认创建', description: '创建后立即同步到 Gateway' },
];

function slugifyName(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'agent';
}

function parseAllowMembers(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AgentWizard({ onComplete, onCancel }: AgentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AgentFormData>({
    agentId: '',
    workspacePath: '',
    name: '',
    role: 'custom',
    model: '',
    persona: {
      identityMarkdown: '',
      bootstrapMarkdown: '',
    },
    boot: {
      provider: 'telegram',
      accountId: '',
      accessMode: 'all',
      allowMembersText: '',
      telegramToken: '',
      feishuAppId: '',
      feishuAppSecret: '',
    },
  });

  useEffect(() => {
    let active = true;

    async function loadModels() {
      setLoadingModels(true);
      setModelError(null);

      try {
        const nextModels = await getAvailableModels();
        if (!active) return;

        setModels(nextModels);
        setFormData((current) => ({
          ...current,
          model: current.model || nextModels.find((item) => item.isDefault)?.id || nextModels[0]?.id || '',
        }));
      } catch (error) {
        if (!active) return;
        setModelError(error instanceof Error ? error.message : '模型列表加载失败');
      } finally {
        if (active) {
          setLoadingModels(false);
        }
      }
    }

    void loadModels();

    return () => {
      active = false;
    };
  }, []);

  const draftAgentId = useMemo(() => slugifyName(formData.name), [formData.name]);
  const effectiveAgentId = useMemo(
    () => slugifyName(formData.agentId.trim() || formData.name),
    [formData.agentId, formData.name]
  );

  const personaDraft = useMemo(
    () => createPersonaDraft(formData.name || '未命名 Agent', formData.model, {
      provider: formData.boot.provider,
      accountId: formData.boot.accountId || effectiveAgentId,
      accessMode: formData.boot.accessMode,
      allowMembers: parseAllowMembers(formData.boot.allowMembersText),
      telegramToken: formData.boot.telegramToken,
      feishuAppId: formData.boot.feishuAppId,
      feishuAppSecret: formData.boot.feishuAppSecret,
    }),
    [
      effectiveAgentId,
      formData.boot.accessMode,
      formData.boot.accountId,
      formData.boot.allowMembersText,
      formData.boot.feishuAppId,
      formData.boot.feishuAppSecret,
      formData.boot.provider,
      formData.boot.telegramToken,
      formData.model,
      formData.name,
    ]
  );

  useEffect(() => {
    setFormData((current) => ({ ...current, persona: personaDraft }));
  }, [personaDraft]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return !!formData.model;
      case 3:
        return !!formData.persona.identityMarkdown && !!formData.persona.bootstrapMarkdown;
      case 4:
        if (formData.boot.provider === 'telegram') {
          return formData.boot.telegramToken.trim().length > 0;
        }
        return formData.boot.feishuAppId.trim().length > 0 && formData.boot.feishuAppSecret.trim().length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((value) => value + 1);
      return;
    }

    onComplete({
      agentId: effectiveAgentId,
      workspacePath: formData.workspacePath.trim() || undefined,
      name: formData.name.trim(),
      role: formData.role,
      model: formData.model,
      persona: formData.persona,
      boot: {
        provider: formData.boot.provider,
        accountId: formData.boot.accountId.trim() || effectiveAgentId,
        accessMode: formData.boot.accessMode,
        allowMembers: parseAllowMembers(formData.boot.allowMembersText),
        telegramToken: formData.boot.telegramToken.trim(),
        feishuAppId: formData.boot.feishuAppId.trim(),
        feishuAppSecret: formData.boot.feishuAppSecret.trim(),
      },
    });
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((value) => value - 1);
    }
  };

  const selectedModel = models.find((item) => item.id === formData.model);
  const effectiveAccountId = formData.boot.accountId.trim() || effectiveAgentId;
  const accessHint = formData.boot.accessMode === 'all'
    ? '所有成员都可通过该 bot 入口进入组。'
    : '仅白名单成员可进入组，支持 ID、用户名或外部标识。';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  currentStep >= step.id
                    ? 'border-cyan-300/30 bg-[linear-gradient(135deg,rgba(60,245,255,0.22)_0%,rgba(139,92,246,0.22)_58%,rgba(255,79,159,0.16)_100%)] text-white shadow-[0_0_20px_rgba(60,245,255,0.14)]'
                    : 'border-white/14 bg-white/[0.04] text-zinc-500'
                }`}
              >
                {currentStep > step.id ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <span className="text-sm font-bold">{step.id}</span>
                )}
              </div>
              <div className="mt-2 hidden text-center sm:block">
                <div className={currentStep >= step.id ? 'text-xs uppercase tracking-wider text-cyan-200' : 'text-xs uppercase tracking-wider text-zinc-500'}>
                  {step.title}
                </div>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div className={currentStep > step.id ? 'mx-2 h-0.5 w-12 bg-cyan-300/70 sm:w-20' : 'mx-2 h-0.5 w-12 bg-white/12 sm:w-20'} />
            )}
          </div>
        ))}
      </div>

      <div className="glass-panel mb-6 rounded-[28px] p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-100">{STEPS[currentStep - 1].title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{STEPS[currentStep - 1].description}</p>
        </div>

        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">角色名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="例如：迪赛娜"
                className="w-full"
                autoFocus
              />
              <p className="mt-2 text-xs text-zinc-500">输入的角色名称会直接作为 Agent 名称。</p>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">Agent ID</label>
              <input
                type="text"
                value={formData.agentId}
                onChange={(event) => setFormData({ ...formData, agentId: event.target.value })}
                placeholder={draftAgentId}
                className="w-full"
              />
              <p className="mt-2 text-xs text-zinc-500">
                默认按角色名称自动生成，也支持手动输入。实际将使用：{effectiveAgentId}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">工作目录</label>
              <input
                type="text"
                value={formData.workspacePath}
                onChange={(event) => setFormData({ ...formData, workspacePath: event.target.value })}
                placeholder={`例如：${effectiveAgentId} 或 /Users/zane/Documents/clawspace/${effectiveAgentId}`}
                className="w-full"
              />
              <p className="mt-2 text-xs text-zinc-500">
                留空时默认使用系统工作区并按 Agent ID 创建目录。支持绝对路径，或相对于默认 workspace root 的相对路径。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: role.value })}
                  className={formData.role === role.value
                    ? 'rounded border border-cyan-300/24 bg-[linear-gradient(135deg,rgba(60,245,255,0.12)_0%,rgba(139,92,246,0.12)_58%,rgba(255,79,159,0.1)_100%)] p-4 text-left transition-all'
                    : 'rounded border border-white/10 bg-white/[0.04] p-4 text-left transition-all hover:border-white/18'}
                >
                  <div className={formData.role === role.value ? 'text-sm font-semibold text-cyan-200' : 'text-sm font-semibold text-zinc-200'}>
                    {role.label}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">{role.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-3">
            {loadingModels && <div className="text-sm text-zinc-400">正在从 Gateway 拉取模型列表...</div>}
            {modelError && <div className="rounded-[16px] border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{modelError}</div>}
            {!loadingModels && !modelError && models.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => setFormData({ ...formData, model: model.id })}
                className={formData.model === model.id
                  ? 'w-full rounded border border-cyan-300/24 bg-[linear-gradient(135deg,rgba(60,245,255,0.12)_0%,rgba(139,92,246,0.12)_58%,rgba(255,79,159,0.1)_100%)] p-4 text-left transition-all'
                  : 'w-full rounded border border-white/10 bg-white/[0.04] p-4 text-left transition-all hover:border-white/18'}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className={formData.model === model.id ? 'text-sm font-semibold text-cyan-200' : 'text-sm font-semibold text-zinc-200'}>
                      {model.label}
                      {model.isDefault ? ' · 默认' : ''}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">{model.description}</div>
                    <div className="mt-2 font-mono text-[11px] text-zinc-500">{model.id}</div>
                  </div>
                  {formData.model === model.id && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-300 text-black">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="glass-badge rounded-[20px] p-4">
              <div className="mb-3 text-sm font-medium text-zinc-100">系统将自动写入以下配置文件</div>
              <div className="grid gap-4 lg:grid-cols-2">
                <PreviewCard title="IDENTITY.md" content={formData.persona.identityMarkdown} />
                <PreviewCard title="BOOTSTRAP.md" content={formData.persona.bootstrapMarkdown} />
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              该步骤无需人工填写。系统会根据角色、模型和 bot 方式自动生成特征文件与启动文档。
            </p>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, boot: { ...formData.boot, provider: 'telegram' } })}
                className={formData.boot.provider === 'telegram'
                  ? 'rounded border border-cyan-300/24 bg-[linear-gradient(135deg,rgba(60,245,255,0.12)_0%,rgba(139,92,246,0.12)_58%,rgba(255,79,159,0.1)_100%)] p-4 text-left'
                  : 'rounded border border-white/10 bg-white/[0.04] p-4 text-left'}
              >
                <div className="text-sm font-semibold text-zinc-100">Telegram</div>
                <div className="mt-1 text-xs text-zinc-400">适合 TG Bot Token 和群组准入配置</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, boot: { ...formData.boot, provider: 'feishu' } })}
                className={formData.boot.provider === 'feishu'
                  ? 'rounded border border-cyan-300/24 bg-[linear-gradient(135deg,rgba(60,245,255,0.12)_0%,rgba(139,92,246,0.12)_58%,rgba(255,79,159,0.1)_100%)] p-4 text-left'
                  : 'rounded border border-white/10 bg-white/[0.04] p-4 text-left'}
              >
                <div className="text-sm font-semibold text-zinc-100">飞书</div>
                <div className="mt-1 text-xs text-zinc-400">适合企业内部协作和组织接入</div>
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">Account ID</label>
                <input
                  type="text"
                  value={formData.boot.accountId}
                  onChange={(event) => setFormData({ ...formData, boot: { ...formData.boot, accountId: event.target.value } })}
                  placeholder={draftAgentId}
                  className="w-full"
                />
                <p className="mt-2 text-xs text-zinc-500">为空时默认使用 Agent ID：{effectiveAgentId}</p>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">权限模式</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, boot: { ...formData.boot, accessMode: 'all' } })}
                    className={formData.boot.accessMode === 'all' ? 'rounded border border-cyan-300/24 bg-cyan-300/10 p-3 text-sm text-cyan-200' : 'rounded border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-300'}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, boot: { ...formData.boot, accessMode: 'custom' } })}
                    className={formData.boot.accessMode === 'custom' ? 'rounded border border-cyan-300/24 bg-cyan-300/10 p-3 text-sm text-cyan-200' : 'rounded border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-300'}
                  >
                    Custom
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500">{accessHint}</p>
              </div>
            </div>

            {formData.boot.provider === 'telegram' ? (
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">Telegram Bot Token</label>
                <input
                  type="password"
                  value={formData.boot.telegramToken}
                  onChange={(event) => setFormData({ ...formData, boot: { ...formData.boot, telegramToken: event.target.value } })}
                  placeholder="123456:ABC..."
                  className="w-full"
                />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">Feishu App ID</label>
                  <input
                    type="text"
                    value={formData.boot.feishuAppId}
                    onChange={(event) => setFormData({ ...formData, boot: { ...formData.boot, feishuAppId: event.target.value } })}
                    placeholder="cli_xxx"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">Feishu App Secret</label>
                  <input
                    type="password"
                    value={formData.boot.feishuAppSecret}
                    onChange={(event) => setFormData({ ...formData, boot: { ...formData.boot, feishuAppSecret: event.target.value } })}
                    placeholder="App Secret"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {formData.boot.accessMode === 'custom' && (
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">允许成员列表</label>
                <textarea
                  value={formData.boot.allowMembersText}
                  onChange={(event) => setFormData({ ...formData, boot: { ...formData.boot, allowMembersText: event.target.value } })}
                  placeholder="每行一个成员 ID / 用户名，也支持逗号分隔"
                  className="min-h-28 w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-300/30"
                />
              </div>
            )}

            <div className="glass-badge rounded-[20px] p-4 text-xs text-zinc-400">
              当前 bot 将写入 <span className="font-mono text-zinc-200">{formData.boot.provider}</span> 账户
              <span className="mx-2 text-zinc-600">/</span>
              <span className="font-mono text-zinc-200">{effectiveAccountId}</span>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="glass-badge space-y-3 rounded-[20px] p-4">
              <ReviewField label="角色 / Agent" value={formData.name} />
              <ReviewField label="Agent ID" value={effectiveAgentId} />
              <ReviewField
                label="工作目录"
                value={formData.workspacePath.trim() || `默认：<workspace-root>/${effectiveAgentId}`}
              />
              <ReviewField label="模型" value={selectedModel ? `${selectedModel.label} (${selectedModel.id})` : formData.model} />
              <ReviewField label="Bot Provider" value={formData.boot.provider} />
              <ReviewField label="Bot Account" value={effectiveAccountId} />
              <ReviewField label="权限模式" value={formData.boot.accessMode === 'all' ? 'all' : 'custom'} />
              <ReviewField
                label="权限范围"
                value={formData.boot.accessMode === 'all' ? '允许所有成员加入组' : parseAllowMembers(formData.boot.allowMembersText).join(', ') || '未填写'}
              />
            </div>
            <div className="h-px rounded bg-gradient-to-r from-transparent via-cyan-300/40 via-50% to-transparent" />
            <p className="text-center text-xs text-zinc-400">
              创建完成后将自动写入配置文件、更新 bot 配置，并触发页面缓存失效以便立即看到最新 Agent。
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <IndustrialButton variant="secondary" onClick={currentStep === 1 ? onCancel : handleBack}>
          {currentStep === 1 ? '取消' : '上一步'}
        </IndustrialButton>

        <IndustrialButton variant="primary" onClick={handleNext} disabled={!canProceed()}>
          {currentStep === 5 ? '创建 Agent' : '下一步'}
        </IndustrialButton>
      </div>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="text-right text-sm font-mono text-zinc-200">{value}</span>
    </div>
  );
}

function PreviewCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20">
      <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-wider text-zinc-500">{title}</div>
      <pre className="max-h-80 overflow-auto px-4 py-3 text-xs leading-6 text-zinc-300">{content}</pre>
    </div>
  );
}
