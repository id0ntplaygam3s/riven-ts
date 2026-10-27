import { Entity, PrimaryKey, Property, Enum, OneToMany, Collection } from "@mikro-orm/decorators/legacy";
import { Field, ID, ObjectType } from "type-graphql";
import { JSONObjectResolver } from "graphql-scalars";

import type { EntityManager } from "@mikro-orm/core";

export enum SourceType {
  TMDB = "tmdb",
  TVDB = "tvdb",
  CUSTOM = "custom",
  DEBRID = "debrid",
}

@ObjectType()
@Entity()
export class SourceConfig {
  @Field(() => ID)
  @PrimaryKey()
  public id!: string;

  @Field()
  @Property()
  public name!: string;

  @Field(() => SourceType)
  @Enum()
  public type!: SourceType;

  @Field(() => Boolean, { defaultValue: true })
  @Property({ defaultValue: true })
  public enabled!: boolean;

  @Field(() => JSONObjectResolver, { nullable: true })
  @Property({ type: "json", nullable: true })
  public config?: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  @Property({ nullable: true })
  public description?: string | null;

  @Field(() => String, { nullable: true })
  @Property({ nullable: true })
  public apiKey?: string | null;

  @Field(() => String, { nullable: true })
  @Property({ nullable: true })
  public baseUrl?: string | null;

  @Field(() => Number, { defaultValue: 0 })
  @Property({ defaultValue: 0 })
  public priority!: number;

  @Field(() => Date)
  @Property()
  public createdAt!: Date;

  @Field(() => Date)
  @Property({ onUpdate: () => new Date() })
  public updatedAt!: Date;

  // Helper to get the effective base URL
  public getEffectiveBaseUrl(): string | null {
    if (this.type === SourceType.TMDB) return "https://api.themoviedb.org/3";
    if (this.type === SourceType.TVDB) return "https://api.thetvdb.com/v4";
    return this.baseUrl ?? null;
  }
}