import { SourceConfig, SourceType } from "@repo/util-plugin-sdk/dto/entities";

import {
  CreateRequestContext,
  Transactional,
} from "@mikro-orm/decorators/legacy";

import { BaseService } from "#database/services/core/base-service.ts";

import type { UUID } from "node:crypto";

export class SourceConfigService extends BaseService {
  @CreateRequestContext()
  public async getSourceConfigById(id: string): Promise<SourceConfig | null> {
    return this.em.findOne(SourceConfig, { id });
  }

  @CreateRequestContext()
  public async getAllSourceConfigs(): Promise<SourceConfig[]> {
    return this.em.find(SourceConfig, {}, { orderBy: { priority: "ASC", name: "ASC" } });
  }

  @CreateRequestContext()
  public async getEnabledSourceConfigs(): Promise<SourceConfig[]> {
    return this.em.find(SourceConfig, { enabled: true }, { orderBy: { priority: "ASC", name: "ASC" } });
  }

  @CreateRequestContext()
  public async getSourceConfigsByType(type: SourceType): Promise<SourceConfig[]> {
    return this.em.find(SourceConfig, { type, enabled: true }, { orderBy: { priority: "ASC" } });
  }

  @Transactional()
  @CreateRequestContext()
  public async createSourceConfig(input: {
    name: string;
    type: SourceType;
    config?: Record<string, unknown>;
    description?: string | null;
    apiKey?: string | null;
    baseUrl?: string | null;
    priority?: number;
  }): Promise<SourceConfig> {
    const { nanoid } = await import("nanoid");

    const sourceConfig = this.em.create(SourceConfig, {
      id: nanoid(21),
      ...input,
      enabled: input.enabled ?? true,
      priority: input.priority ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.em.flush();
    return sourceConfig;
  }

  @Transactional()
  @CreateRequestContext()
  public async updateSourceConfig(
    id: string,
    input: Partial<{
      name: string;
      type: SourceType;
      config: Record<string, unknown>;
      description: string | null;
      apiKey: string | null;
      baseUrl: string | null;
      priority: number;
      enabled: boolean;
    }>,
  ): Promise<SourceConfig | null> {
    const sourceConfig = await this.em.findOne(SourceConfig, { id });
    if (!sourceConfig) return null;

    Object.assign(sourceConfig, {
      ...input,
      updatedAt: new Date(),
    });

    await this.em.flush();
    return sourceConfig;
  }

  @Transactional()
  @CreateRequestContext()
  public async deleteSourceConfig(id: string): Promise<boolean> {
    const sourceConfig = await this.em.findOne(SourceConfig, { id });
    if (!sourceConfig) return false;

    this.em.remove(sourceConfig);
    await this.em.flush();
    return true;
  }

  @Transactional()
  @CreateRequestContext()
  public async toggleSourceConfigEnabled(id: string): Promise<SourceConfig | null> {
    const sourceConfig = await this.em.findOne(SourceConfig, { id });
    if (!sourceConfig) return null;

    sourceConfig.enabled = !sourceConfig.enabled;
    sourceConfig.updatedAt = new Date();

    await this.em.flush();
    return sourceConfig;
  }
}