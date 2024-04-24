import { Folder, ContentItem, DynamicContent, Status, Pageable, Sortable, Hub, ContentRepository } from "dc-management-sdk-js"
import logger, { logComplete, logSubheading } from "./logger"
import chalk from "chalk"
import { logUpdate } from "./logger"
import _, { Dictionary } from 'lodash'
import { ContentItemHandler } from "../handlers/content-item-handler"
import { AmplienceContext } from '../handlers/resource-handler';
import fs from 'fs-extra'
import { sleep } from "./utils"
import { OAuthRestClient } from "@amplience/dc-integration-middleware"
import { paginator, StatusQuery } from '../common/dccli/paginator'
import { OAuthRestClientInterface } from "@amplience/dc-integration-middleware"
import { DAMMapping } from "./types"
import { DAMService } from "../dam/dam-service"

type IntegrationConstants = {
    automation: string
}

// constants
export const deliveryKeys: IntegrationConstants = {
    automation: `demostore/automation`
}

export const labels: IntegrationConstants = {
    automation: `demostore automation`
}

export const schemas: IntegrationConstants = {
    automation: `https://demostore.amplience.com/site/automation`
}

const baseURL = `https://demostore-catalog.s3.us-east-2.amazonaws.com`
const restMap: Dictionary<OAuthRestClientInterface> = {}
const damServiceMap: Dictionary<DAMService> = {}

let contentMap: Dictionary<ContentItem> = {}
const AmplienceHelperGenerator = (context: AmplienceContext): AmplienceHelper => {
    const rest = restMap[context.environment.dc.clientId] = restMap[context.environment.dc.clientId] || OAuthRestClient({
            api_url: `https://api.amplience.net/v2/content`,
            auth_url: `https://auth.amplience.net/oauth/token`
        },
        `client_id=${context.environment.dc.clientId}&client_secret=${context.environment.dc.clientSecret}&grant_type=client_credentials`,
        {
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            }
        })

    const getContentItems = async (hub: Hub, opts?: Pageable & Sortable & StatusQuery): Promise<ContentItem[]> => {
        return _.flatMap(await Promise.all((await paginator(hub.related.contentRepositories.list)).map(async repo => {
            return await paginator(repo.related.contentItems.list, opts)
        })))
    }

    const timedBlock = async (tag: string, fn: () => Promise<any>): Promise<any> => {
        const start = new Date().valueOf()
        const result = await fn()
        const duration = new Date().valueOf() - start
        logger.info(`${tag} completed in ${duration}ms`)
        return result
    }

    const login = async (): Promise<Hub> => await timedBlock('login', async () => {
        try {
            // log in to Dynamic Content
            let client = new DynamicContent({
                client_id: context.environment.dc.clientId,
                client_secret: context.environment.dc.clientSecret
            })

            let hub: Hub = await client.hubs.get(context.environment.dc.hubId)
            if (!hub) {
                throw new Error(`hubId not found: ${context.environment.dc.hubId}`)
            }

            logger.info(`connected to hub ${chalk.bold.cyan(`[ ${hub.name} ]`)}`)
            return hub
        } catch (error) {
            throw new Error(`error while logging in to dynamic content, check your credentials`)
        }
    })

    const deleteFolder = async (folder: Folder) => await rest.delete(`/folders/${folder.id}`)
    const get = rest.get

    const updateContentMap = (item: ContentItem) => {
        contentMap[item.body._meta.deliveryKey] = item
        contentMap[item.id] = item
    }

    const cacheContentMap = async () => (await getContentItems(context.hub, { status: Status.ACTIVE })).forEach(updateContentMap)
    const getContentMap = () => _.zipObject(_.map(contentMap, (__, key) => key.replace(/\//g, '-')), _.map(contentMap, 'deliveryId'))
    const getContentItem = (keyOrId: string): ContentItem => contentMap[keyOrId]

    const getDAMMapping = async (): Promise<DAMMapping> => {
        const damService = damServiceMap[context.environment.dam.username] = damServiceMap[context.environment.dam.username] || await new DAMService().init(context.environment.dam)
        let assets = _.filter(await damService.getAssetsListForAllBuckets(), asset => asset.status === 'active')
        let endpoint: any = _.first(await damService.getEndpoints())
        return {
            mediaEndpoint: endpoint?.tag,
            imagesMap: _.zipObject(_.map(assets, x => _.camelCase(x.name)), _.map(assets, 'id'))
        }
    }

    const getAutomation = async () => await ensureContentItem('automation', {
        contentItems: [],
        workflowStates: []
    })

    const getDemoStoreConfig = async (): Promise<any> => {
        return {
            url: context.environment.url,
            cms: {
                hub: context.environment.name,
                stagingApi: context.hub.settings?.virtualStagingEnvironment?.hostname || '',
                imageHub: 'willow'
            }
        }
    }

    const updateDemoStoreConfig = async () => {
        // generate demostore config environment variable
        logSubheading('.env.local file format')
        console.log('----------------------- COPY START ----------------------')
        console.log(`NEXT_PUBLIC_DEMOSTORE_CONFIG_JSON='${JSON.stringify(context.config)}'`)
        console.log('------------------------ COPY END -----------------------')
        logSubheading('Vercel format')
        console.log('----------------------- COPY START ----------------------')
        console.log(JSON.stringify(context.config))
        console.log('------------------------ COPY END -----------------------')
    }

    const updateAutomation = async () => {
        // read the mapping file and update if necessary
        let mappingStats = fs.statSync(`${context.tempDir}/old_mapping.json`)
        let newMappingStats = fs.statSync(`${context.tempDir}/mapping.json`)

        if (newMappingStats.size !== mappingStats.size) {
            logger.info(`updating mapping...`)

            // update the object
            let newMapping = fs.readJsonSync(`${context.tempDir}/mapping.json`)

            logger.info(`saving mapping...`)

            let automation = await getAutomation()
            await updateContentItem('automation', {
                ...automation.body,
                contentItems: _.map(newMapping.contentItems, x => ({ from: x[0], to: x[1] })),
                workflowStates: _.map(newMapping.workflowStates, x => ({ from: x[0], to: x[1] }))
            })
        }
    }

    const ensureContentItem = async (key: string, body: any): Promise<ContentItem> => {
        let item = await getContentItem(deliveryKeys[key])
        if (!item) {
            logger.info(`${deliveryKeys[key]} not found, creating...`)
            item = new ContentItem()
            item.label = labels[key]
            item.body = {
                _meta: {
                    name: labels[key],
                    schema: schemas[key],
                    deliveryKey: deliveryKeys[key]
                },
                ...body
            }
            item = await (await getContentRepository('sitestructure')).related.contentItems.create(item)
            await publishContentItem(item)
        }
        return item
    }

    const getContentRepository = async (key: string): Promise<ContentRepository> => {
        let repositories: ContentRepository[] = await paginator(context.hub.related.contentRepositories.list)
        let repo = repositories.find(repo => repo.name === key)
        if (!repo) {
            throw new Error(`repository [ ${key} ] not found`)
        }
        return repo
    }

    const getContentItemsInRepository = async (key: string): Promise<ContentItem[]> => {
        return await paginator((await getContentRepository(key)).related.contentItems.list, { status: 'ACTIVE' })
    }

    const updateContentItem = async (key: string, body: any): Promise<void> => {
        let item = await ensureContentItem(key, body)
        item.body = body
        item = await item.related.update(item)
        await publishContentItem(item)
    }

    const publishContentItem = async (item: ContentItem) => {
        await rest.post(`/content-items/${item.id}/publish`)
        updateContentMap(item)
    }

    const publishAll = async (): Promise<void> => {
        let unpublished = (await getContentItems(context.hub, { status: Status.ACTIVE })).filter(ci => ci.version !== (ci as any).lastPublishedVersion)

        // we are rate limited to 100 publish requests per minute. so once we've flushed through all of the publishes for each
        // 100-item chunk, we'll have to wait to publish more
        let chunks = _.reverse(_.chunk(unpublished, 100))
        while (chunks.length > 0) {
            let chunk = chunks.pop()
            if (chunk) {
                // set timer for one minute
                const start = new Date().valueOf()

                logUpdate(`publishing ${chalk.blueBright(chunk.length)} items...`)
                await Promise.all(chunk.map(publishContentItem))

                if (chunks.length > 0) {
                    const current = new Date().valueOf()
                    const remainder = Math.ceil((60000 - (current - start)) / 1000)
                    for (let index = remainder; index > 0; index--) {
                        logUpdate(`sleeping ${chalk.blueBright(index)} seconds before next chunk...`, false)
                        await sleep(1000)
                    }
                }
            }
        }
        logComplete(`${new ContentItemHandler().getDescription()}: [ ${chalk.green(unpublished.length)} published ]`)
    }

    return {
        getContentItem,
        getDemoStoreConfig,
        generateDemoStoreConfig: updateDemoStoreConfig,

        get,
        getAutomation,
        updateAutomation,

        cacheContentMap,
        getContentMap,
        getContentRepository,
        getContentItemsInRepository,

        getDAMMapping,

        publishContentItem,
        publishAll,

        deleteFolder,
        login
    }
}
export default AmplienceHelperGenerator

export type AmplienceHelper = {
    getContentItem: (keyOrId: string) => ContentItem
    publishAll: () => Promise<void>
    getDemoStoreConfig: () => Promise<any>
    generateDemoStoreConfig: () => Promise<void>
    getAutomation: () => Promise<ContentItem>
    updateAutomation: () => Promise<void>
    cacheContentMap: () => Promise<void>
    getContentMap: () => Dictionary<string>
    getContentRepository: (key: string) => Promise<ContentRepository>
    getContentItemsInRepository: (key: string) => Promise<ContentItem[]>
    getDAMMapping: () => Promise<DAMMapping>
    get: (url: string) => Promise<any>
    publishContentItem: (ContentItem: any) => Promise<void>
    deleteFolder: (folder: Folder) => Promise<void>
    login: () => Promise<Hub>
}