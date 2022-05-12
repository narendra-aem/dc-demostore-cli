import { AmplienceContext } from '../handlers/resource-handler';
import _ from 'lodash'
import { contextHandler } from '../common/middleware';
import amplienceBuilder from '../common/amplience-builder';
import { Category, Product, getCommerceAPI } from '@amplience/dc-demostore-integration'
import { paginator } from '@amplience/dc-demostore-integration';
import { getRandom } from '../common/utils';
import logger from '../common/logger';
import chalk from 'chalk'
import { ContentType, ContentTypeSchema } from 'dc-management-sdk-js';

export const command = 'update';
export const desc = "Update hub retail pointers";

export const builder = amplienceBuilder
export const handler = contextHandler(async (context: AmplienceContext): Promise<void> => {
    let demoStoreConfig = await (await context.amplienceHelper.getDemoStoreConfig()).body
    let commerce = await context.amplienceHelper.getContentItem(demoStoreConfig.commerce.id).body

    if (!commerce) {
        throw new Error(`commerce integration not found!`)
    }

    let commerceAPI = await getCommerceAPI(commerce)
    let megaMenu = await commerceAPI.getMegaMenu({})

    let populated = _.sortBy(await Promise.all(megaMenu.map(async (category: Category) => {
        return await commerceAPI.getCategory({ slug: category.slug })
    })), cat => cat.products.length)

    let mostPopulated = _.last(populated)
    let { hub } = context
    let contentItems = await context.amplienceHelper.getContentItemsInRepository('content')
    await Promise.all(contentItems.map(async contentItem => {
        // curated product grid
        if (contentItem.body._meta.schema === 'https://demostore.amplience.com/content/curated-product-grid') {
            logger.info(`Updating content items`)
            contentItem.body.products = await Promise.all(contentItem.body.products.map(async (productId: string) => {
                let product = await commerceAPI.getProduct({ id: productId })
                if (!product && mostPopulated) {
                    let randomProduct = getRandom<Product>(mostPopulated.products)
                    logger.info(`mapped product [ ${chalk.gray(productId)} ] to [ ${chalk.green(randomProduct.name)} ]`)
                    productId = randomProduct.id
                }
                return productId
            }))
            contentItem = await contentItem.related.update(contentItem)
            await context.amplienceHelper.publishContentItem(contentItem)
        }

        if (contentItem.body._meta.schema === 'https://demostore.amplience.com/site/pages') {
        }
    }))

    let contentTypeSchemas: ContentTypeSchema[] = await paginator(hub.related.contentTypeSchema.list)
    let contentTypes: ContentType[] = await paginator(hub.related.contentTypes.list)
    await Promise.all(contentTypeSchemas.map(async schema => {
        if (schema.schemaId === 'https://demostore.amplience.com/content/product-grid' && schema.body) {
            let jsonBody = JSON.parse(schema.body)
            if (jsonBody?.properties?.category?.enum) {
                jsonBody.properties.category.enum = _.map(megaMenu, 'key')
            }
            schema.body = JSON.stringify(jsonBody, undefined, 4)
            await schema.related.update(schema)

            // then sync the content type
            let contentType = _.find(contentTypes, type => type.contentTypeUri === 'https://demostore.amplience.com/content/product-grid')
            if (contentType) {
                await context.amplienceHelper.synchronizeContentType(contentType)
            }
            else {
                logger.error(`failed to synchronize content type [ https://demostore.amplience.com/content/product-grid ], content type not found`)
            }
        }
    }))
})