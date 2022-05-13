import { CleanupContext } from '../handlers/resource-handler';
import _ from 'lodash'
import { contextHandler } from '../common/middleware';
import amplienceBuilder from '../common/amplience-builder';
import { Category, CommerceAPI, CryptKeeper, CustomerGroup, flattenCategories, getCodec, paginator, Product } from '@amplience/dc-demostore-integration'
import logger, { logComplete, logUpdate } from '../common/logger';
import chalk from 'chalk';
import async from 'async';
import { Argv } from 'yargs';
const { MultiSelect } = require('enquirer');

export const command = 'check';
export const desc = "Check integration content quality";

const formatPercentage = (a: any[], b: any[]) => {
    let percentage = Math.ceil(100.0 * a.length / b.length)
    let colorFn = chalk.green
    if (percentage > 66) {
        colorFn = chalk.red
    }
    else if (percentage > 33) {
        colorFn = chalk.yellow
    }
    return `[ ${colorFn(`${a.length} (${percentage}%)`)} ]`
}

const getRandom = array => array[Math.floor(Math.random() * array.length)]
export const builder = (yargs: Argv): Argv =>
    amplienceBuilder(yargs).options({
        include: {
            alias: 'i',
            describe: 'types to include',
            type: 'array'
        },
        all: {
            alias: 'a',
            describe: 'check all integration types',
            type: 'boolean'
        },
        showMegaMenu: {
            alias: 'm',
            describe: 'show the mega menu structure',
            type: 'boolean'
        }
    })

interface OperationResult {
    tag: string
    result: any
    duration: string
    status: string
}

const Operation = operation => {
    const start = new Date().valueOf()
    return {
        do: async (status: (any) => string): Promise<OperationResult> => {
            let result = await operation.execute()
            return {
                ...operation,
                result,
                duration: `${new Date().valueOf() - start}ms`,
                status: status(result)
            }
        }
    }
}

export const handler = contextHandler(async (context: CleanupContext): Promise<void> => {
    let { hub, showMegaMenu } = context
    let siteStructureContentItems = await context.amplienceHelper.getContentItemsInRepository('sitestructure')
    let integrationItems = siteStructureContentItems.filter(ci => ci.body._meta.schema.indexOf('/site/integration') > -1)

    let choices: string[] = context.all ? integrationItems.map(i => i.body._meta.schema.split('/').pop()) : context.include
    if (_.isEmpty(choices)) {
        let selected = await new MultiSelect({
            message: 'select integrations to test',
            choices: integrationItems.map(i => ({ name: i.body._meta.name, value: i.body._meta.schema.split('/').pop() })),
            result(names: string[]) { return this.map(names) }
        }).run()
        choices = Object.values(selected)
    }

    await async.eachSeries(choices, async (choice, callback) => {
        let integrationItems = siteStructureContentItems.filter(ci => ci.body._meta.schema.indexOf(`/site/integration/${choice}`) > -1)
        if (_.isEmpty(integrationItems)) {
            callback(new Error(`couldn't find integration for [ ${choice} ]`))
        }

        await async.eachSeries(integrationItems, async (item, cb) => {
            item.body._meta = {
                ...item.body._meta,
                deliveryId: item.deliveryId
            }

            try {
                let commerceAPI = await getCodec(CryptKeeper(item.body, hub.name).decryptAll()) as CommerceAPI
                // logger.info(`testing integration type: [ ${chalk.magentaBright(commerceAPI.SchemaURI.split('/').pop())} ]`)

                let allProducts: Product[] = []
                let megaMenu: Category[] = []
                let categories: Category[] = []

                let megaMenuOperation = await Operation({
                    tag: '☯️  get megamenu',
                    execute: async (): Promise<Category[]> => await commerceAPI.getMegaMenu({})
                }).do((mm: Category[]) => {
                    megaMenu = mm
                    let second = _.reduce(megaMenu, (sum, n) => { return _.concat(sum, n.children) }, [])
                    let third = _.reduce(_.flatMap(megaMenu, 'children'), (sum, n) => { return _.concat(sum, n.children) }, [])
                    categories = _.concat(megaMenu, second, third)
                    return `[ ${chalk.green(megaMenu.length)} top level ] [ ${chalk.green(second.length)} second level ] [ ${chalk.green(third.length)} third level ]`
                })

                let flattenedCategories = flattenCategories(categories)
                let categoryOperation = await Operation({
                    tag: '🧰  get category',
                    execute: async (): Promise<Category> => await commerceAPI.getCategory(flattenedCategories[0])
                }).do((cat: Category) => {
                    return ` has ${chalk.green(cat.products.length)} products`
                })

                const categoryReadStart = new Date().valueOf()
                let categoryCount = 0
                await Promise.all(flattenedCategories.map(async (cat: Category) => {
                    let category = await commerceAPI.getCategory(cat)
                    if (category) {
                        cat.products = category.products
                        allProducts = _.concat(allProducts, cat.products)
                        categoryCount++
                    }
                    logUpdate(`🧰  got [ ${categoryCount}/${flattenedCategories.length} ] categories and ${chalk.yellow(allProducts.length)} products`)
                }))
                allProducts = _.uniqBy(allProducts, 'id')

                logComplete(`🧰  read ${chalk.green(flattenedCategories.length)} categories, ${chalk.yellow(allProducts.length)} products in ${chalk.cyan(`${new Date().valueOf() - categoryReadStart} ms`)}`)

                if (showMegaMenu) {
                    console.log(`megaMenu ->`)
                    _.each(megaMenu, tlc => {
                        console.log(`${tlc.name} (${tlc.slug}) -- [ ${tlc.products.length} ]`)
                        _.each(tlc.children, cat => {
                            console.log(`\t${cat.name} (${cat.slug}) -- [ ${cat.products.length} ]`)
                            _.each(cat.children, c => {
                                console.log(`\t\t${c.name} (${c.slug}) -- [ ${c.products.length} ]`)
                            })
                        })
                    })
                }

                let randomProduct = getRandom(allProducts)
                let randomProduct2 = getRandom(allProducts)

                // get product section
                let productOperation = await Operation({
                    tag: `💰  get product`,
                    execute: async (): Promise<Product> => await commerceAPI.getProduct(randomProduct)
                }).do((product: Product) => {
                    return `found product [ ${chalk.yellow(product.name)} : ${chalk.green(product.variants[0].listPrice)} ]`
                })

                let productIds = [randomProduct, randomProduct2].map(i => i.id)
                let productsOperation = await Operation({
                    tag: '💎  get products',
                    execute: async (): Promise<Product[]> => await commerceAPI.getProducts({ productIds: productIds.join(',') })
                }).do((products: Product[]) => {
                    return `got [ ${chalk.green(products.length)} ] products for [ ${chalk.gray(productIds.length)} ] productIds`
                })

                // end get products section

                let customerGroupOperation = await Operation({
                    tag: `👨‍👩‍👧‍👦  get customer groups`,
                    execute: async (): Promise<CustomerGroup[]> => await commerceAPI.getCustomerGroups({})
                }).do((customerGroups: CustomerGroup[]) => {
                    return `got [ ${chalk.green(customerGroups.length)} ]`
                })

                const logOperation = (operation: OperationResult) => {
                    logger.info(`[ ${chalk.blueBright(operation.tag)} ] [ ${chalk.cyan(operation.duration)} ] ${operation.status}`)
                }

                logOperation(megaMenuOperation)
                logOperation(categoryOperation)
                logOperation(productOperation)
                logOperation(productsOperation)
                logOperation(customerGroupOperation)

                let noProductCategories = _.filter(flattenedCategories, cat => cat.products?.length === 0)
                logger.info(`${formatPercentage(noProductCategories, flattenedCategories)} categories with no products`)

                let noImageProducts = _.filter(allProducts, prod => _.isEmpty(_.flatten(_.map(prod.variants, 'images'))))
                logger.info(`${formatPercentage(noImageProducts, allProducts)} products with no image`)

                let noPriceProducts = _.filter(allProducts, prod => prod.variants[0]?.listPrice === '--')
                logger.info(`${formatPercentage(noPriceProducts, allProducts)} products with no price`)
            } catch (error) {
                logger.error(`testing integration for [ ${item.body._meta.schema} ]: ${chalk.red('failed')}: ${error}`)
                console.log(error.stack)
            }
            cb()
        })
        callback()
    })
})