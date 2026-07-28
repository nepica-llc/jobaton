import { useState, useEffect } from "react";
import { Key, Save, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    api.getSettings().then((s: any) => {
      if (s.openai_key_masked) {
        setMaskedKey(s.openai_key_masked);
        setHasKey(true);
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!apiKey.startsWith("sk-")) {
      toast.error("Invalid API key format. Should start with sk-");
      return;
    }
    setSaving(true);
    try {
      await api.saveSettings({ openai_key: apiKey });
      setMaskedKey(apiKey.slice(0, 7) + "..." + apiKey.slice(-4));
      setHasKey(true);
      setApiKey("");
      toast.success("API key saved!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Configure your AI provider to use all features.</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">OpenAI API Key</h2>
        </div>

        {hasKey && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Key configured: <span className="font-mono">{maskedKey}</span>
          </div>
        )}

        {!hasKey && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <AlertCircle className="h-4 w-4" />
            No API key set. AI features won't work until you add one.
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">
          {hasKey ? "Update API Key" : "Enter your OpenAI API Key"}
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSave}
            disabled={!apiKey || saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Get your key from{" "}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            platform.openai.com
          </a>
          . Your key is stored locally on the server and never sent to third parties.
        </p>
      </div>
    </div>
  );
}
