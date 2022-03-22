import { ContentRepository, Hub } from 'dc-management-sdk-js';
import { DAMService } from '../dam/dam-service';
import _, { Dictionary } from 'lodash';
import { InstrumentedHub } from './middleware';
import { DemoStoreConfiguration } from '@amplience/dc-demostore-integration';

export interface CommonArgs {
}

export class AugmentedHub extends Hub {
    repositories: Dictionary<ContentRepository>
    repositoryIdMap: Dictionary<string | undefined>
    workflowStatesMap: Dictionary<string | undefined>
}

export class EnvironmentConfig {
    name: string
    url: string
    dc: DynamicContentCredentials
    dam: {
        username: string
        password: string
    }
}

export class DynamicContentCredentials {
    clientId: string
    clientSecret: string
    hubId: string
}

export class AmplienceArgs {
    environment: EnvironmentConfig
    automation: {
        contentItems: DemoStoreMapping[]
        workflowStates: DemoStoreMapping[]
    }
    hub: InstrumentedHub
    matchingSchema: string[]
}

export class LoggableArgs extends AmplienceArgs {
    startTime: Date
    logRequests: boolean
    tempDir: string
}

export class ImportArgs extends LoggableArgs {
    skipContentImport: boolean
    automationDir: string
    latest: boolean
    branch: string

    damService: DAMService
    config: DemoStoreConfiguration
    mapping: Mapping
}

export class CleanupArgs extends LoggableArgs {
    skipConfirmation: boolean
    include: string[]
}

export interface Mapping {
    url: string
    cms: CMSMapping
    algolia: AlgoliaConfig
    dam: DAMMapping
    contentMap: Dictionary<string>
}

// export class DemoStoreConfig {
//     url: string
//     cms: AmplienceConfig
//     algolia: AlgoliaConfig
//     environment: string // env name
// }

export class AlgoliaConfig {
    appId: string
    apiKey: string
    indexes: AlgoliaIndexSet[]
}

export class AmplienceConfig {
    hub: AmplienceHub
    hubs: AmplienceHubPointer[]
}

export interface CMSMapping extends AmplienceConfig {
    repositories: Dictionary<string | undefined>
    workflowStates: Dictionary<string | undefined>
}

export interface DAMMapping {
    mediaEndpoint: string
    imagesMap: Dictionary<string>
}

export class DemoStoreMapping {
    from: string
    to: string
}

export class AppConfig {
    url: string
}

export class AlgoliaIndexSet {
    key: string
    prod: string
    staging: string
}

export class AmplienceHub {
    name: string
    stagingApi: string
}

export class AmplienceHubPointer {
    key: string
    name: string
}

export type ContentTypeSchemaPointer = {
    body: string
    schemaId: string
    validationLevel: string
}

export type ContentTypeSchemaDescriptor = {
    ['$id']: string
}