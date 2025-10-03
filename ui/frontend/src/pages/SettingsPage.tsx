import { useState } from 'react';

type ModelProvider = 'anthropic' | 'openai' | 'google' | 'zai';

interface ModelSettings {
  vision: { provider: ModelProvider; model: string };
  implementation: { provider: ModelProvider; model: string };
  evaluation: { provider: ModelProvider; model: string };
}

function SettingsPage() {
  const [settings, setSettings] = useState<ModelSettings>({
    vision: { provider: 'anthropic', model: 'claude-opus-4-20250514' },
    implementation: { provider: 'anthropic', model: 'claude-sonnet-4.5-20250402' },
    evaluation: { provider: 'anthropic', model: 'claude-opus-4-20250514' }
  });

  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [cacheTTL, setCacheTTL] = useState(3600);
  const [saved, setSaved] = useState(false);

  const modelsByProvider: Record<ModelProvider, string[]> = {
    anthropic: [
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
      'claude-sonnet-4.5-20250402',
      'claude-haiku-4-20250402'
    ],
    openai: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo'
    ],
    google: [
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro'
    ],
    zai: ['zai-default']
  };

  const handleProviderChange = (role: keyof ModelSettings, provider: ModelProvider) => {
    const firstModel = modelsByProvider[provider][0];
    setSettings(prev => ({
      ...prev,
      [role]: { provider, model: firstModel }
    }));
  };

  const handleModelChange = (role: keyof ModelSettings, model: string) => {
    setSettings(prev => ({
      ...prev,
      [role]: { ...prev[role], model }
    }));
  };

  const handleSave = () => {
    // Save to localStorage for now (later: save to backend)
    localStorage.setItem('viztrtr_model_settings', JSON.stringify(settings));
    localStorage.setItem('viztrtr_cache_enabled', String(cacheEnabled));
    localStorage.setItem('viztrtr_cache_ttl', String(cacheTTL));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-slate-400 mb-8">Configure model providers and performance options</p>

      {/* Model Configuration */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-white">Model Configuration</h2>
        <p className="text-sm text-slate-400 mb-6">
          Select AI models for different tasks. Mix providers for optimal cost/quality trade-offs.
        </p>

        {/* Vision Model */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Vision Model
            <span className="ml-2 text-xs font-normal text-slate-500">
              (Analyzes UI screenshots)
            </span>
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Provider</label>
              <select
                value={settings.vision.provider}
                onChange={(e) => handleProviderChange('vision', e.target.value as ModelProvider)}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="google">Google (Gemini)</option>
                <option value="zai">Z.AI</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Model</label>
              <select
                value={settings.vision.model}
                onChange={(e) => handleModelChange('vision', e.target.value)}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                {modelsByProvider[settings.vision.provider].map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Implementation Model */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Implementation Model
            <span className="ml-2 text-xs font-normal text-slate-500">
              (Generates code changes)
            </span>
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Provider</label>
              <select
                value={settings.implementation.provider}
                onChange={(e) => handleProviderChange('implementation', e.target.value as ModelProvider)}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="google">Google (Gemini)</option>
                <option value="zai">Z.AI</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Model</label>
              <select
                value={settings.implementation.model}
                onChange={(e) => handleModelChange('implementation', e.target.value)}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                {modelsByProvider[settings.implementation.provider].map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Evaluation Model */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Evaluation Model
            <span className="ml-2 text-xs font-normal text-slate-500">
              (Scores design quality)
            </span>
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Provider</label>
              <select
                value={settings.evaluation.provider}
                onChange={(e) => handleProviderChange('evaluation', e.target.value as ModelProvider)}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="google">Google (Gemini)</option>
                <option value="zai">Z.AI</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Model</label>
              <select
                value={settings.evaluation.model}
                onChange={(e) => handleModelChange('evaluation', e.target.value)}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                {modelsByProvider[settings.evaluation.provider].map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Options */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-white">Performance</h2>

        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={cacheEnabled}
              onChange={(e) => setCacheEnabled(e.target.checked)}
              className="mr-3 w-4 h-4"
            />
            <div>
              <span className="text-sm font-semibold text-slate-300">Enable Caching</span>
              <p className="text-xs text-slate-500">Cache vision analysis results (50-70% faster, 50-70% cost reduction)</p>
            </div>
          </label>
        </div>

        {cacheEnabled && (
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Cache TTL (Time to Live)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={cacheTTL}
                onChange={(e) => setCacheTTL(Number(e.target.value))}
                min="60"
                max="86400"
                className="bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none w-32"
              />
              <span className="text-sm text-slate-400">seconds ({Math.round(cacheTTL / 60)} minutes)</span>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
        >
          Save Settings
        </button>
        {saved && (
          <span className="text-green-400 text-sm">✓ Settings saved successfully!</span>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">💡 Cost Optimization Tips</h3>
        <ul className="text-sm text-slate-300 space-y-1">
          <li>• Use <strong>Gemini 2.0 Flash</strong> for evaluation (FREE during preview)</li>
          <li>• Use <strong>GPT-4o-mini</strong> for implementation (only $0.15/$0.60 per 1M tokens)</li>
          <li>• Enable caching to reduce redundant API calls by 50-70%</li>
          <li>• Mix providers based on task complexity</li>
        </ul>
      </div>
    </div>
  );
}

export default SettingsPage;
