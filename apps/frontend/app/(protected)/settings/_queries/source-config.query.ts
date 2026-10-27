import { gql } from "@apollo/client";

import type {
  GetSourceConfigsQuery,
  GetSourceConfigsQueryVariables,
  CreateSourceConfigMutation,
  CreateSourceConfigMutationVariables,
  UpdateSourceConfigMutation,
  UpdateSourceConfigMutationVariables,
  DeleteSourceConfigMutation,
  DeleteSourceConfigMutationVariables,
  ToggleSourceConfigMutation,
  ToggleSourceConfigMutationVariables,
} from "./source-config.query.typegen";
import type { TypedDocumentNode } from "@apollo/client";

export const GET_SOURCE_CONFIGS: TypedDocumentNode<
  GetSourceConfigsQuery,
  GetSourceConfigsQueryVariables
> = gql`
  query GetSourceConfigs {
    sourceConfigs {
      id
      name
      type
      enabled
      description
      apiKey
      baseUrl
      priority
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_SOURCE_CONFIG: TypedDocumentNode<
  CreateSourceConfigMutation,
  CreateSourceConfigMutationVariables
> = gql`
  mutation CreateSourceConfig($input: CreateSourceConfigInput!) {
    createSourceConfig(input: $input) {
      success
      source {
        id
        name
        type
        enabled
        description
        apiKey
        baseUrl
        priority
      }
      message
    }
  }
`;

export const UPDATE_SOURCE_CONFIG: TypedDocumentNode<
  UpdateSourceConfigMutation,
  UpdateSourceConfigMutationVariables
> = gql`
  mutation UpdateSourceConfig($id: String!, $input: UpdateSourceConfigInput!) {
    updateSourceConfig(id: $id, input: $input) {
      id
      name
      type
      enabled
      description
      apiKey
      baseUrl
      priority
    }
  }
`;

export const DELETE_SOURCE_CONFIG: TypedDocumentNode<
  DeleteSourceConfigMutation,
  DeleteSourceConfigMutationVariables
> = gql`
  mutation DeleteSourceConfig($id: String!) {
    deleteSourceConfig(id: $id) {
      success
      message
    }
  }
`;

export const TOGGLE_SOURCE_CONFIG: TypedDocumentNode<
  ToggleSourceConfigMutation,
  ToggleSourceConfigMutationVariables
> = gql`
  mutation ToggleSourceConfig($id: String!) {
    toggleSourceConfigEnabled(id: $id) {
      id
      name
      enabled
    }
  }
`;