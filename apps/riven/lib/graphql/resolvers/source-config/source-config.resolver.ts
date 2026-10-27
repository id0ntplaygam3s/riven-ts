import { SourceConfig, SourceType } from "@repo/util-plugin-sdk/dto/entities";

import {
  Arg,
  ArgsType,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";

import { CoreContext } from "#graphql/decorators/core-context.ts";

import type { ApolloServerContext } from "#graphql/context.ts";

@ObjectType()
class SourceConfigCreateResponse {
  @Field(() => Boolean)
  public success!: boolean;

  @Field(() => SourceConfig, { nullable: true })
  public source?: SourceConfig | null;

  @Field(() => String, { nullable: true })
  public message?: string | null;
}

@ArgsType()
class CreateSourceConfigInput {
  @Field()
  public name!: string;

  @Field(() => SourceType)
  public type!: SourceType;

  @Field(() => String, { nullable: true })
  public description?: string | null;

  @Field(() => String, { nullable: true })
  public apiKey?: string | null;

  @Field(() => String, { nullable: true })
  public baseUrl?: string | null;

  @Field(() => Number, { nullable: true })
  public priority?: number;
}

@ArgsType()
class UpdateSourceConfigInput {
  @Field(() => String, { nullable: true })
  public name?: string;

  @Field(() => SourceType, { nullable: true })
  public type?: SourceType;

  @Field(() => String, { nullable: true })
  public description?: string | null;

  @Field(() => String, { nullable: true })
  public apiKey?: string | null;

  @Field(() => String, { nullable: true })
  public baseUrl?: string | null;

  @Field(() => Number, { nullable: true })
  public priority?: number;

  @Field(() => Boolean, { nullable: true })
  public enabled?: boolean;
}

@Resolver(() => SourceConfig)
export class SourceConfigResolver {
  @Query(() => [SourceConfig], {
    description: "Get all source configurations.",
  })
  public async getSourceConfigs(
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
  ) {
    return sourceConfigService.getAllSourceConfigs();
  }

  @Query(() => [SourceConfig], {
    description: "Get only enabled source configurations.",
  })
  public async getEnabledSourceConfigs(
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
  ) {
    return sourceConfigService.getEnabledSourceConfigs();
  }

  @Query(() => [SourceConfig], {
    description: "Get source configurations filtered by type.",
  })
  public async getSourceConfigsByType(
    @Arg("type", () => SourceType) type: SourceType,
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
  ) {
    return sourceConfigService.getSourceConfigsByType(type);
  }

  @Mutation(() => SourceConfigCreateResponse, {
    description: "Create a new source configuration.",
  })
  public async createSourceConfig(
    @Arg("input") input: CreateSourceConfigInput,
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
    @Ctx() { logger }: ApolloServerContext,
  ) {
    try {
      const source = await sourceConfigService.createSourceConfig({
        name: input.name,
        type: input.type,
        description: input.description,
        apiKey: input.apiKey,
        baseUrl: input.baseUrl,
        priority: input.priority ?? 0,
      });

      logger.info(`Created source configuration: ${source.name}`);

      return { success: true, source };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create source";
      logger.error(`Failed to create source configuration: ${message}`, { err: error });
      return { success: false, message };
    }
  }

  @Mutation(() => SourceConfig, {
    description: "Update an existing source configuration.",
  })
  public async updateSourceConfig(
    @Arg("id") id: string,
    @Arg("input") input: UpdateSourceConfigInput,
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
    @Ctx() { logger }: ApolloServerContext,
  ) {
    const source = await sourceConfigService.updateSourceConfig(id, input);
    if (!source) {
      throw new Error(`Source configuration with ID ${id} not found`);
    }

    logger.info(`Updated source configuration: ${source.name}`);
    return source;
  }

  @Mutation(() => SourceConfigCreateResponse, {
    description: "Delete a source configuration.",
  })
  public async deleteSourceConfig(
    @Arg("id") id: string,
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
    @Ctx() { logger }: ApolloServerContext,
  ) {
    const deleted = await sourceConfigService.deleteSourceConfig(id);
    if (!deleted) {
      return { success: false, message: "Source configuration not found" };
    }

    logger.info(`Deleted source configuration: ${id}`);
    return { success: true, message: "Source deleted" };
  }

  @Mutation(() => SourceConfig, {
    description: "Toggle a source configuration's enabled status.",
  })
  public async toggleSourceConfigEnabled(
    @Arg("id") id: string,
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
    @Ctx() { logger }: ApolloServerContext,
  ) {
    const source = await sourceConfigService.toggleSourceConfigEnabled(id);
    if (!source) {
      throw new Error(`Source configuration with ID ${id} not found`);
    }

    logger.info(`Toggled source configuration ${source.name}: ${source.enabled ? "enabled" : "disabled"}`);
    return source;
  }
}