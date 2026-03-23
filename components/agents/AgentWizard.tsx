'use client';

import { useState } from 'react';
import { IndustrialButton } from '@/components/ui/IndustrialButton';
import { AgentRole } from '@/lib/types';

interface AgentWizardProps {
  onComplete: (data: AgentFormData) => void;
  onCancel: () => void;
}

export interface AgentFormData {
  name: string;
  role: AgentRole;
  model: string;
  botId?: string;
}

const ROLES: { value: AgentRole; label: string; description: string }[] = [
  { value: 'coordinator', label: 'Coordinator', description: 'Orchestrates tasks and manages other agents' },
  { value: 'executor', label: 'Executor', description: 'Performs specific tasks and operations' },
  { value: 'observer', label: 'Observer', description: 'Monitors and reports on system status' },
  { value: 'custom', label: 'Custom', description: 'Define your own agent behavior' },
];

const MODELS = [
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6', description: 'Most capable, for complex tasks' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', description: 'Balanced performance and speed' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', description: 'Fast and efficient, for simple tasks' },
];

const STEPS = [
  { id: 1, title: 'Agent Identity', description: 'Name and identifier' },
  { id: 2, title: 'Role Selection', description: 'Choose agent role' },
  { id: 3, title: 'Model Selection', description: 'AI model configuration' },
  { id: 4, title: 'Bot Binding', description: 'Connect to Telegram bot' },
  { id: 5, title: 'Review', description: 'Confirm and create' },
];

export function AgentWizard({ onComplete, onCancel }: AgentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    role: 'executor',
    model: 'claude-sonnet-4-6',
    botId: '',
  });

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.name.trim().length > 0;
      case 2: return !!formData.role;
      case 3: return !!formData.model;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  currentStep >= step.id
                    ? 'bg-amber-600 border-amber-600 text-black'
                    : 'border-zinc-700 text-zinc-500'
                }`}
              >
                {currentStep > step.id ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <span className="text-sm font-bold">{step.id}</span>
                )}
              </div>
              <div className="mt-2 text-center hidden sm:block">
                <div className={`text-xs uppercase tracking-wider ${
                  currentStep >= step.id ? 'text-amber-500' : 'text-zinc-500'
                }`}>
                  {step.title}
                </div>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mx-2 ${
                currentStep > step.id ? 'bg-amber-600' : 'bg-zinc-700'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-bg-card border border-zinc-800 rounded p-6 mb-6 corner-screw">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-200">{STEPS[currentStep - 1].title}</h2>
          <p className="text-sm text-zinc-500 mt-1">{STEPS[currentStep - 1].description}</p>
        </div>

        {/* Step 1: Name */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter agent name..."
                className="w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
                Agent ID (Auto-generated)
              </label>
              <div className="p-3 bg-zinc-900 rounded border border-zinc-800 font-mono text-sm text-zinc-500">
                agent-{Date.now().toString(36)}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Role */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROLES.map((role) => (
              <button
                key={role.value}
                onClick={() => setFormData({ ...formData, role: role.value })}
                className={`p-4 rounded border text-left transition-all ${
                  formData.role === role.value
                    ? 'border-amber-600 bg-amber-600/10'
                    : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
                }`}
              >
                <div className={`text-sm font-semibold ${
                  formData.role === role.value ? 'text-amber-500' : 'text-zinc-300'
                }`}>
                  {role.label}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{role.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Model */}
        {currentStep === 3 && (
          <div className="space-y-3">
            {MODELS.map((model) => (
              <button
                key={model.value}
                onClick={() => setFormData({ ...formData, model: model.value })}
                className={`w-full p-4 rounded border text-left transition-all ${
                  formData.model === model.value
                    ? 'border-amber-600 bg-amber-600/10'
                    : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className={`text-sm font-semibold ${
                      formData.model === model.value ? 'text-amber-500' : 'text-zinc-300'
                    }`}>
                      {model.label}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">{model.description}</div>
                  </div>
                  {formData.model === model.value && (
                    <div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-black">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 4: Bot Binding */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
                Telegram Bot Token (Optional)
              </label>
              <input
                type="text"
                value={formData.botId || ''}
                onChange={(e) => setFormData({ ...formData, botId: e.target.value })}
                placeholder="Enter bot token or leave empty..."
                className="w-full"
              />
            </div>
            <div className="p-4 bg-zinc-900/50 rounded border border-zinc-800">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-zinc-300">Bot Binding is optional</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    You can bind a Telegram bot to this agent later from the agent settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900/50 rounded border border-zinc-800 space-y-3">
              <ReviewField label="Name" value={formData.name} />
              <ReviewField label="Role" value={formData.role} />
              <ReviewField label="Model" value={formData.model} />
              <ReviewField
                label="Bot Binding"
                value={formData.botId ? 'Telegram Bot Connected' : 'Not configured'}
              />
            </div>
            <div className="hazard-stripe h-1 rounded opacity-20" />
            <p className="text-xs text-zinc-500 text-center">
              Click &quot;Create Agent&quot; to finalize and deploy your new agent.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <IndustrialButton
          variant="secondary"
          onClick={currentStep === 1 ? onCancel : handleBack}
        >
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </IndustrialButton>

        <IndustrialButton
          variant="primary"
          onClick={handleNext}
          disabled={!canProceed()}
        >
          {currentStep === 5 ? 'Create Agent' : 'Next'}
        </IndustrialButton>
      </div>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="text-sm font-mono text-zinc-300">{value}</span>
    </div>
  );
}
