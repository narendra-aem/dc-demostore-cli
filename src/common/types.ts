import { Hub } from 'dc-management-sdk-js';
import _, { Dictionary } from 'lodash';
import { paginator } from '../common/dccli/paginator'
import { AmplienceHelper } from './amplience-helper';
import { CleanupContext, ImportContext } from '../handlers/resource-handler';

export type EnvironmentConfig = {
    name: string
    url: string
    dc: {
        clientId: string
        clientSecret: string
        hubId: string
    }
    dam: {
        username: string
        password: string
    }
    algolia?: {
        appId?: string
        searchKey?: string
        writeKey?: string
    }
}

export type AmplienceArgs = {
    environment: EnvironmentConfig
    automation: {
        contentItems: DemoStoreMapping[]
        workflowStates: DemoStoreMapping[]
    }
    hub: Hub
    matchingSchema: string[]
    amplienceHelper: AmplienceHelper
}

export type LoggableArgs = AmplienceArgs & {
    startTime: Date
    logRequests: boolean
    tempDir: string
}

export interface AlgoliaConfig {
    appId?: string;
    apiKey?: string;
}
export interface AmplienceConfig {
    hub: string;
    stagingApi: string;
    imageHub?: string;
}
export interface DemoStoreConfiguration {
    algolia: AlgoliaConfig;
    url?: string;
    cms: AmplienceConfig;
}

export type ImportArgs = LoggableArgs & {
    skipContentImport: boolean
    automationDir: string
    latest: boolean
    config: DemoStoreConfiguration
    openaiKey: string
}

export type CleanupArgs = LoggableArgs & {
    skipConfirmation: boolean
    include: string[]
    all: boolean
    content: boolean
    automationDir: string
    latest: boolean
    config: DemoStoreConfiguration
    openaiKey: string
}

export type Mapping = {
    url: string
    openaiKey?: string
    cms?: CMSMapping
    algolia?: AlgoliaConfig
    dam: DAMMapping
    contentMap: Dictionary<string>
}

export type CMSMapping = AmplienceConfig & {
    hubId: string
    repositories: Dictionary<string | undefined>
    workflowStates: Dictionary<string | undefined>
}

export type DAMMapping = {
    mediaEndpoint: string
    imagesMap: Dictionary<string>
}

export type DemoStoreMapping = {
    from: string
    to: string
}

export const getMapping = async (context: ImportContext | CleanupContext): Promise<Mapping> => {
    let repositories = await paginator(context.hub.related.contentRepositories.list)
    let workflowStates = await paginator(context.hub.related.workflowStates.list)
    return {
        url: context.environment.url,
        openaiKey: context.openaiKey,
        cms: {
            hub: context.hub.name!,
            hubId: context.hub.id!,
            stagingApi: context.hub.settings?.virtualStagingEnvironment?.hostname || '',
            imageHub: context.config?.cms.imageHub,
            repositories: _.zipObject(_.map(repositories, r => r.name!), _.map(repositories, 'id')),
            workflowStates: _.zipObject(_.map(workflowStates, ws => _.camelCase(ws.label)), _.map(workflowStates, 'id'))
        },
        algolia: context.environment.algolia,
        dam: await context.amplienceHelper.getDAMMapping(),
        contentMap: context.amplienceHelper.getContentMap()
    }
}