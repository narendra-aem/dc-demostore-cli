import { Hub } from 'dc-management-sdk-js';
import _, { Dictionary } from 'lodash';
import { DemoStoreConfiguration, paginator, AlgoliaConfig, AmplienceConfig } from '@amplience/dc-demostore-integration';
import { AmplienceHelper } from './amplience-helper';
import { ImportContext } from '../handlers/resource-handler';

export type EnvironmentConfig = {
    name:                   string
    url:                    string
    dc: {
        clientId:           string
        clientSecret:       string
        hubId:              string
    }
    dam: {
        username:           string
        password:           string
    }
}

export type AmplienceArgs = {
    environment:            EnvironmentConfig
    automation: {
        contentItems:       DemoStoreMapping[]
        workflowStates:     DemoStoreMapping[]
    }
    hub:                    Hub
    matchingSchema:         string[]
    amplienceHelper:        AmplienceHelper
}

export type LoggableArgs = AmplienceArgs & {
    startTime:              Date
    logRequests:            boolean
    tempDir:                string
}

export type ImportArgs = LoggableArgs & {
    skipContentImport:      boolean
    automationDir:          string
    latest:                 boolean
    branch:                 string
    config:                 DemoStoreConfiguration
}

export type CleanupArgs = LoggableArgs & {
    skipConfirmation:       boolean
    include:                string[]
}

export type Mapping = {
    url:                    string
    cms?:                   CMSMapping
    algolia?:               AlgoliaConfig
    dam:                    DAMMapping
    contentMap:             Dictionary<string>
}

export type CMSMapping = AmplienceConfig & {
    repositories:           Dictionary<string | undefined>
    workflowStates:         Dictionary<string | undefined>
}

export type DAMMapping = {
    mediaEndpoint:          string
    imagesMap:              Dictionary<string>
}

export type DemoStoreMapping = {
    from:                   string
    to:                     string
}

export const getMapping = async (context: ImportContext): Promise<Mapping> => {
    let repositories = await paginator(context.hub.related.contentRepositories.list)
    let workflowStates = await paginator(context.hub.related.workflowStates.list)
    return {
        url: context.environment.url,
        cms: {
            hub: context.hub.name!,
            hubId: context.hub.id!,
            stagingApi: context.hub.settings?.virtualStagingEnvironment?.hostname || '',
            imageHub: context.config?.cms.imageHub,
            repositories: _.zipObject(_.map(repositories, r => r.name!), _.map(repositories, 'id')),
            workflowStates: _.zipObject(_.map(workflowStates, ws => _.camelCase(ws.label)), _.map(workflowStates, 'id'))
        },
        algolia: context.config?.algolia,
        dam: await context.amplienceHelper.getDAMMapping(),
        contentMap: context.amplienceHelper.getContentMap()
    }
}