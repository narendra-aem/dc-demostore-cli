import { AmplienceContext } from '../handlers/resource-handler';
import _ from 'lodash'
import { contextHandler } from '../common/middleware';
import amplienceBuilder from '../common/amplience-builder';
import { getContentItemById, getContentItemFromCDN, getEnvConfig, synchronizeContentType, publishContentItem } from '../common/amplience-helper';
import { Category, getCommerceAPIFromCodecConfig, Product, QueryContext } from '@amplience/dc-demostore-integration'
import { paginator } from '../helpers/paginator';
import { getRandom } from '../common/utils';
import logger from '../common/logger';
import chalk from 'chalk'

export const command = 'update';
export const desc = "Update hub retail pointers";

export const builder = amplienceBuilder
export const handler = contextHandler(async (context: AmplienceContext): Promise<void> => {
    let envConfig = await getEnvConfig(context)
    let commerceConfig = await getContentItemById(envConfig.commerce.id).body
    let commerceAPI = await getCommerceAPIFromCodecConfig(commerceConfig)
    let megaMenu = await commerceAPI.getMegaMenu()

    let populated = _.sortBy(await Promise.all(megaMenu.map(async (category: Category) => {
        return await commerceAPI.getCategory(new QueryContext({ args: { key: category.key || category.slug } }))
    })), cat => cat.products.length)

    let mostPopulated = _.last(populated)
    let { hub } = context
    await hub.contentItemIterator(async contentItem => {
        // curated product grid
        if (contentItem.body._meta.schema === 'https://demostore.amplience.com/content/curated-product-grid') {
            logger.info(`Updating content items`)
            contentItem.body.products = await Promise.all(contentItem.body.products.map(async (productId: string) => {
                let product = await commerceAPI.getProduct(new QueryContext({ args: { id: productId } }))
                if (!product && mostPopulated) {
                    let randomProduct = getRandom<Product>(mostPopulated.products)
                    logger.info(`mapped product [ ${chalk.gray(productId)} ] to [ ${chalk.green(randomProduct.name)} ]`)
                    productId = randomProduct.id
                }
                return productId
            }))
            contentItem = await contentItem.related.update(contentItem)
            await publishContentItem(contentItem)
        }

        if (contentItem.body._meta.schema === 'https://demostore.amplience.com/site/pages') {
        }
    })

    let contentTypeSchemas = await paginator(hub.related.contentTypeSchema.list)
    let contentTypes = await paginator(hub.related.contentTypes.list)
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
                await synchronizeContentType(contentType)
            }
            else {
                logger.error(`failed to synchronize content type [ https://demostore.amplience.com/content/product-grid ], content type not found`)
            }
        }
    }))
})