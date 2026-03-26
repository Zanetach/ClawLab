'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IndustrialButton } from '@/components/ui/IndustrialButton';
import { updateAgent } from '@/lib/gateway';
import type {
  AccessMode,
  Agent,
  AvailableModel,
  BootProvider,
  BotConfigurationMode,
  EditableAgentConfig,
  UpdateAgentInput,
} from '@/lib/types';

interface AgentDetailEditorProps {
  agent: Agent;
  models: AvailableModel[];
  initialConfig: EditableAgentConfig;
}

interface EditorState {
  workspacePath: string;
  model: string;
  botConfigurationMode: BotConfigurationMode;
  provider: BootProvider;
  accountId: string;
  accessMode: AccessMode;
  allowMembersText: string;
  telegramToken: string;
  feishuAppId: string;
  feishuAppSecret: string;
}

function parseAllowMembers(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AgentDetailEditor({ agent, models, initialConfig }: AgentDetailEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<EditorState>({
    workspacePath: initialConfig.workspacePath,
    model: initialConfig.model,
    botConfigurationMode: initialConfig.botConfigurationMode,
    provider: initialConfig.boot.provider,
    accountId: initialConfig.boot.accountId,
    accessMode: initialConfig.boot.accessMode,
    allowMembersText: initialConfig.boot.allowMembers.join('\n'),
    telegramToken: '',
    feishuAppId: initialConfig.boot.feishuAppId || '',
    feishuAppSecret: '',
  });

  const selectedModel = useMemo(
    () => models.find((item) => item.id === form.model),
    [form.model, models]
  );

  const keepExistingHint = form.provider === 'telegram'
    ? initialConfig.boot.hasToken && initialConfig.boot.provider === 'telegram' && initialConfig.boot.accountId === (form.accountId.trim() || agent.id)
    : initialConfig.boot.hasAppSecret && initialConfig.boot.provider === 'feishu' && initialConfig.boot.accountId === (form.accountId.trim() || agent.id);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: UpdateAgentInput = {
      workspacePath: form.workspacePath.trim() || undefined,
      model: form.model,
      botConfigurationMode: form.botConfigurationMode,
      boot: form.botConfigurationMode === 'later'
        ? {}
        : {
            provider: form.provider,
            accountId: form.accountId.trim() || agent.id,
            accessMode: form.provider === 'telegram' ? form.accessMode : 'custom',
            allowMembers: form.provider === 'telegram' ? parseAllowMembers(form.allowMembersText) : [],
            telegramToken: form.provider === 'telegram' ? form.telegramToken.trim() : undefined,
            feishuAppId: form.provider === 'feishu' ? form.feishuAppId.trim() : undefined,
            feishuAppSecret: form.provider === 'feishu' ? form.feishuAppSecret.trim() : undefined,
          },
    };

    try {
      await updateAgent(agent.id, payload);
      setSuccess('配置已保存并立即生效。');
      setForm((current) => ({
        ...current,
        telegramToken: '',
        feishuAppSecret: '',
      }));
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '保存失败，请重试。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-panel rounded-[24px] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Editable Config</div>
          <h2 className="mt-2 text-lg font-semibold text-zinc-100">实时修改 Agent 配置</h2>
          <p className="mt-1 text-sm text-zinc-400">保存后会直接写入 Gateway 配置，不需要重新创建 Agent。</p>
        </div>
        <IndustrialButton variant="ghost" size="sm" onClick={() => router.push('/agents')}>
          返回列表
        </IndustrialButton>
      </div>

      {error && (
        <div className="mb-4 rounded-[18px] border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-[18px] border border-cyan-300/30 bg-cyan-400/10 p-4 text-sm text-cyan-100">
          {success}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <Field label="Workspace">
            <input
              type="text"
              value={form.workspacePath}
              onChange={(event) => setForm((current) => ({ ...current, workspacePath: event.target.value }))}
              className="w-full"
              disabled={saving}
            />
          </Field>

          <Field label="Model">
            <div className="space-y-3">
              <select
                value={form.model}
                onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
                className="w-full"
                disabled={saving}
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
              <div className="text-xs text-zinc-500">
                {selectedModel ? `${selectedModel.description} · ${selectedModel.id}` : form.model}
              </div>
            </div>
          </Field>

          <Field label="Bot 配置方式">
            <div className="grid gap-3 sm:grid-cols-2">
              <ModeButton
                active={form.botConfigurationMode === 'now'}
                label="立即配置"
                description="保存后马上写入 bot 绑定"
                disabled={saving}
                onClick={() => setForm((current) => ({ ...current, botConfigurationMode: 'now' }))}
              />
              <ModeButton
                active={form.botConfigurationMode === 'later'}
                label="稍后配置"
                description="先保留 workspace 和模型"
                disabled={saving}
                onClick={() => setForm((current) => ({ ...current, botConfigurationMode: 'later' }))}
              />
            </div>
          </Field>
        </div>

        <div className="space-y-4">
          {form.botConfigurationMode === 'now' ? (
            <>
              <Field label="Provider">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ModeButton
                    active={form.provider === 'telegram'}
                    label="Telegram"
                    description="Bot Token + 群准入"
                    disabled={saving}
                    onClick={() => setForm((current) => ({ ...current, provider: 'telegram' }))}
                  />
                  <ModeButton
                    active={form.provider === 'feishu'}
                    label="飞书"
                    description="App ID + Secret"
                    disabled={saving}
                    onClick={() => setForm((current) => ({ ...current, provider: 'feishu' }))}
                  />
                </div>
              </Field>

              <Field label="Bot ID">
                <input
                  type="text"
                  value={form.accountId}
                  onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
                  placeholder={agent.id}
                  className="w-full"
                  disabled={saving}
                />
              </Field>

              {form.provider === 'telegram' ? (
                <>
                  <Field label="权限模式">
                    <div className="grid grid-cols-2 gap-3">
                      <ModeButton
                        active={form.accessMode === 'all'}
                        label="All"
                        description="所有成员可进入"
                        disabled={saving}
                        onClick={() => setForm((current) => ({ ...current, accessMode: 'all' }))}
                      />
                      <ModeButton
                        active={form.accessMode === 'custom'}
                        label="Custom"
                        description="仅白名单成员可进入"
                        disabled={saving}
                        onClick={() => setForm((current) => ({ ...current, accessMode: 'custom' }))}
                      />
                    </div>
                  </Field>

                  <Field label="Telegram Token">
                    <input
                      type="password"
                      value={form.telegramToken}
                      onChange={(event) => setForm((current) => ({ ...current, telegramToken: event.target.value }))}
                      placeholder={keepExistingHint ? '留空则保留当前 token' : '123456:ABC...'}
                      className="w-full"
                      disabled={saving}
                    />
                  </Field>

                  {form.accessMode === 'custom' && (
                    <Field label="允许成员">
                      <textarea
                        value={form.allowMembersText}
                        onChange={(event) => setForm((current) => ({ ...current, allowMembersText: event.target.value }))}
                        placeholder="每行一个成员 ID / 用户名，也支持逗号分隔"
                        className="min-h-28 w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-300/30"
                        disabled={saving}
                      />
                    </Field>
                  )}
                </>
              ) : (
                <>
                  <Field label="Feishu App ID">
                    <input
                      type="text"
                      value={form.feishuAppId}
                      onChange={(event) => setForm((current) => ({ ...current, feishuAppId: event.target.value }))}
                      placeholder="cli_xxx"
                      className="w-full"
                      disabled={saving}
                    />
                  </Field>

                  <Field label="Feishu App Secret">
                    <input
                      type="password"
                      value={form.feishuAppSecret}
                      onChange={(event) => setForm((current) => ({ ...current, feishuAppSecret: event.target.value }))}
                      placeholder={keepExistingHint ? '留空则保留当前 secret' : 'App Secret'}
                      className="w-full"
                      disabled={saving}
                    />
                  </Field>
                </>
              )}
            </>
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.03] p-5 text-sm text-zinc-400">
              当前将只保存 workspace 和模型。Bot 入口会被移除，后续可以随时回来补充。
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <IndustrialButton onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '保存配置'}
        </IndustrialButton>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function ModeButton({
  active,
  label,
  description,
  disabled,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={active
        ? 'rounded border border-cyan-300/24 bg-[linear-gradient(135deg,rgba(60,245,255,0.12)_0%,rgba(139,92,246,0.12)_58%,rgba(255,79,159,0.1)_100%)] p-4 text-left'
        : 'rounded border border-white/10 bg-white/[0.04] p-4 text-left'}
    >
      <div className="text-sm font-semibold text-zinc-100">{label}</div>
      <div className="mt-1 text-xs text-zinc-400">{description}</div>
    </button>
  );
}
