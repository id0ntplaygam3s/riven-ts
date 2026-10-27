"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Database,
  Globe,
  Key,
  Tag,
  Text,
} from "lucide-react";

import { Button } from "#components/_ui/button.tsx";
import { getClient } from "#lib/graphql/client.ts";
import {
  GET_SOURCE_CONFIGS,
  CREATE_SOURCE_CONFIG,
  UPDATE_SOURCE_CONFIG,
  DELETE_SOURCE_CONFIG,
  TOGGLE_SOURCE_CONFIG,
} from "#app/(protected)/settings/_queries/source-config.query.ts";

import type { SourceConfig } from "#app/_types/__generated__/graphql.ts";

type SourceType = "tmdb" | "tvdb" | "custom" | "debrid";

interface SourceFormData {
  name: string;
  type: SourceType;
  description: string;
  apiKey: string;
  baseUrl: string;
  priority: number;
}

const defaultFormData: SourceFormData = {
  name: "",
  type: "tmdb",
  description: "",
  apiKey: "",
  baseUrl: "",
  priority: 0,
};

const sourceTypeLabels: Record<SourceType, string> = {
  tmdb: "TMDB",
  tvdb: "TVDB",
  custom: "Custom",
  debrid: "Debrid",
};

const sourceTypeIcons: Record<SourceType, typeof Database> = {
  tmdb: Globe,
  tvdb: Globe,
  custom: Database,
  debrid: Key,
};

interface SourcesTabProps {
  initialSources: SourceConfig[];
}

export function SourcesTab({ initialSources }: SourcesTabProps) {
  const [sources, setSources] = useState<SourceConfig[]>(initialSources);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SourceFormData>(defaultFormData);
  const [loading, setLoading] = useState<string | null>(null);

  const resetForm = () => {
    setFormData(defaultFormData);
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (source: SourceConfig) => {
    setEditingId(source.id);
    setFormData({
      name: source.name,
      type: source.type as SourceType,
      description: source.description ?? "",
      apiKey: source.apiKey ?? "",
      baseUrl: source.baseUrl ?? "",
      priority: source.priority,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading("save");
    try {
      if (editingId) {
        await getClient().mutate({
          mutation: UPDATE_SOURCE_CONFIG,
          variables: {
            id: editingId,
            input: {
              name: formData.name,
              type: formData.type,
              description: formData.description || null,
              apiKey: formData.apiKey || null,
              baseUrl: formData.baseUrl || null,
              priority: formData.priority,
            },
          },
          refetchQueries: [GET_SOURCE_CONFIGS],
        });
        toast.success("Source updated");
      } else {
        await getClient().mutate({
          mutation: CREATE_SOURCE_CONFIG,
          variables: {
            input: {
              name: formData.name,
              type: formData.type,
              description: formData.description || null,
              apiKey: formData.apiKey || null,
              baseUrl: formData.baseUrl || null,
              priority: formData.priority,
            },
          },
          refetchQueries: [GET_SOURCE_CONFIGS],
        });
        toast.success("Source created");
      }
      resetForm();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save source";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(`delete-${id}`);
    try {
      await getClient().mutate({
        mutation: DELETE_SOURCE_CONFIG,
        variables: { id },
        refetchQueries: [GET_SOURCE_CONFIGS],
      });
      toast.success("Source deleted");
    } catch (e) {
      toast.error("Failed to delete source");
    } finally {
      setLoading(null);
    }
  };

  const handleToggle = async (id: string) => {
    setLoading(`toggle-${id}`);
    try {
      await getClient().mutate({
        mutation: TOGGLE_SOURCE_CONFIG,
        variables: { id },
        refetchQueries: [GET_SOURCE_CONFIGS],
      });
    } catch (e) {
      toast.error("Failed to toggle source");
    } finally {
      setLoading(null);
    }
  };

  const SourceCard = ({ source }: { source: SourceConfig }) => {
    const Icon = sourceTypeIcons[source.type as SourceType] || Database;

    return (
      <div
        className={`rounded-xl border p-4 transition-all ${
          source.enabled
            ? "border-white/10 bg-white/5"
            : "border-white/5 bg-white/[0.02] opacity-60"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-white">{source.name}</h3>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="rounded-md bg-white/5 px-1.5 py-0.5">{source.type}</span>
                <span>Priority: {source.priority}</span>
              </div>
              {source.description && (
                <p className="mt-1 text-xs text-zinc-500">{source.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={() => handleToggle(source.id)}
              disabled={loading === `toggle-${source.id}`}
            >
              {source.enabled ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-blue-400"
              onClick={() => handleEdit(source)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-red-400"
              onClick={() => handleDelete(source.id)}
              disabled={loading?.startsWith("delete")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {source.apiKey && (
          <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
            <Key className="h-3 w-3" />
            <span>API Key: ••••••••</span>
          </div>
        )}
        {source.baseUrl && (
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            <Globe className="h-3 w-3" />
            <span className="font-mono">{source.baseUrl}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4">
          <h3 className="font-medium text-white">
            {editingId ? "Edit Source" : "Add Source"}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Tag className="h-4 w-4" /> Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="My TMDB Source"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Database className="h-4 w-4" /> Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value as SourceType }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Object.entries(sourceTypeLabels).map(([value, label]) => (
                  <option key={value} value={value} className="bg-zinc-900">
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Text className="h-4 w-4" /> Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Key className="h-4 w-4" /> API Key
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData((p) => ({ ...p, apiKey: e.target.value }))}
                placeholder="Optional"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Globe className="h-4 w-4" /> Base URL
              </label>
              <input
                type="text"
                value={formData.baseUrl}
                onChange={(e) => setFormData((p) => ({ ...p, baseUrl: e.target.value }))}
                placeholder="https://api.example.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                Priority
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData((p) => ({ ...p, priority: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-zinc-500">
                Higher priority sources are checked first. Default: 0
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading === "save"}>
              {loading === "save" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              {editingId ? "Update" : "Add Source"}
            </Button>
          </div>
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="w-full border-dashed">
          <Plus className="mr-2 h-4 w-4" />
          Add Source
        </Button>
      )}

      {/* Source list */}
      <div className="space-y-3">
        {sources.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
        {sources.length === 0 && !showForm && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
            <Database className="mx-auto h-12 w-12 text-zinc-600" />
            <h3 className="mt-3 text-sm font-medium text-zinc-400">No sources configured</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Add TMDB, TVDB, or custom sources to search and scrape media.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}