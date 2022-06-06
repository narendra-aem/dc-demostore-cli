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
    let demoStoreConfig = (await context.amplienceHelper.getDemoStoreConfig()).body
    let commerce = (await context.amplienceHelper.getContentItem(demoStoreConfig.commerce.id)).body

    if (!commerce) {
        throw new Error(`commerce integration not found!`)
    }

    let commerceAPI = await getCommerceAPI(commerce)
    let megaMenu = await commerceAPI.getMegaMenu({})
    let { hub } = context

    let contentTypeSchemas: ContentTypeSchema[] = await paginator(hub.related.contentTypeSchema.list)
    let contentTypes: ContentType[] = await paginator(hub.related.contentTypes.list)

    // update product-grid schema with available category options
    let productGridSchema = contentTypeSchemas.find(s => s.schemaId === 'https://demostore.amplience.com/content/product-grid')
    if (productGridSchema) {
        let jsonBody = JSON.parse(productGridSchema.body || '')
        if (jsonBody?.properties?.category?.enum) {
            jsonBody.properties.category.enum = _.map(megaMenu, 'slug')
        }
        productGridSchema.body = JSON.stringify(jsonBody, undefined, 4)
        await productGridSchema.related.update(productGridSchema)

        // then sync the content type
        let contentType = contentTypes.find(type => type.contentTypeUri === 'https://demostore.amplience.com/content/product-grid')
        if (contentType) {
            await contentType.related.contentTypeSchema.update()
        }
        else {
            logger.error(`failed to synchronize content type [ https://demostore.amplience.com/content/product-grid ], content type not found`)
        }
    }

    let populated = _.sortBy(await Promise.all(megaMenu.map(async (category: Category) => {
        return await commerceAPI.getCategory({ slug: category.slug })
    })), cat => cat.products.length)

    let mostPopulated = _.last(populated)

    // console.log(`most populated category [ ${mostPopulated?.name} ] with ${mostPopulated?.products.length} products`)

    // if (mostPopulated) {
    //     for (let index = 0; index < 8; index++) {
    //         let randomProduct = getRandom<Product>(mostPopulated.products)        
    //         console.log(`product id [ ${randomProduct.id} ]`)
    //     }
    // }
    
    // process.exit(0)

    let contentItems = await context.amplienceHelper.getContentItemsInRepository('content')
    await Promise.all(contentItems.map(async contentItem => {
        // curated product grid
        if (contentItem.body._meta.schema === 'https://demostore.amplience.com/content/curated-product-grid') {
            logger.info(`Updating curated-product-grid...`)
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

        if (contentItem.body._meta.schema === 'https://demostore.amplience.com/content/product-grid') {
            let category = await commerceAPI.getCategory({ slug: contentItem.body.category })
            if (!category && mostPopulated) {
                logger.info(`Updating product-grid...`)
                contentItem.body.category = mostPopulated.slug
                contentItem = await contentItem.related.update(contentItem)
                await context.amplienceHelper.publishContentItem(contentItem)
            }
        }
    }))
})