import { AmplienceContext, CleanupContext, LoggableContext } from '../handlers/resource-handler';
import _ from 'lodash'
import { contextHandler, loginDC, setupLogging } from '../common/middleware';
import amplienceBuilder from '../common/amplience-builder';
import { Category, CryptKeeper, flattenCategories, getCommerceAPIFromConfig, paginator } from '@amplience/dc-demostore-integration'
import logger, { time, timeEnd } from '../common/logger';
import chalk from 'chalk';
import async from 'async';
import { Argv } from 'yargs';
import { useEnvironment } from '../common/environment-manager';
const { MultiSelect } = require('enquirer');

export const command = 'check';
export const desc = "Check integration content quality";

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

export const handler = contextHandler(async (context: CleanupContext): Promise<void> => {
    let { hub, showMegaMenu } = context
    let siteStructureContentItems = await paginator(hub.repositories['sitestructure'].related.contentItems.list, { status: 'ACTIVE' })
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
                let commerceAPI = await getCommerceAPIFromConfig(CryptKeeper(item.body, hub.name).decryptAll())
                logger.info(`getting integration for [ ${item.body._meta.schema} ]: ${chalk.green('success')}`)

                let mainTag = '⏰  test run'
                time(mainTag)

                // megamenu section
                let megaMenuSectionTag = '☯️  get megamenu'
                time(megaMenuSectionTag)
                let megaMenu = await commerceAPI.getMegaMenu({})

                let second = _.reduce(megaMenu, (sum, n) => { return _.concat(sum, n.children) }, [])
                let third = _.reduce(_.flatMap(megaMenu, 'children'), (sum, n) => { return _.concat(sum, n.children) }, [])
                let categories = _.concat(megaMenu, second, third)
                logger.info(`${megaMenuSectionTag} [ ${chalk.green(megaMenu.length)} top level ] [ ${chalk.green(second.length)} second level ] [ ${chalk.green(third.length)} third level ]`)
                timeEnd(megaMenuSectionTag)
                // end megamenu section

                let category: Category = megaMenu[0]
                let flattenedCategories = flattenCategories(categories)
                while (_.isEmpty(category.products)) {
                    let randomCategory = getRandom(flattenedCategories)

                    let categorySectionTag = `🧰  get category ${chalk.green(randomCategory.slug)}`
                    time(categorySectionTag)
                    category = await commerceAPI.getCategory(randomCategory)

                    logger.info(`${categorySectionTag} found category [ ${chalk.yellow(category.name)} ] with [ ${category.products.length} ] products`)
                    timeEnd(categorySectionTag)
                }

                if (showMegaMenu) {
                    console.log(`megaMenu ->`)
                    _.each(megaMenu, tlc => {
                        console.log(`${tlc.name} [ ${tlc.slug} ]`)
                        _.each(tlc.children, cat => {
                            console.log(`|- ${cat.name} [ ${cat.slug} ]`)
                            _.each(cat.children, c => {
                                console.log(`|- |- ${c.name} [ ${c.slug} ]`)
                            })
                        })
                    })
                }

                if (category && category.products?.length > 0) {
                    let randomProduct = getRandom(category.products)
                    let randomProduct2 = getRandom(category.products)

                    // get product section
                    let productSectionTag = `💰  get product [ ${chalk.blue(_.last(randomProduct.id.split('-')))} ]`
                    time(productSectionTag)
                    let product = await commerceAPI.getProduct({ id: randomProduct.id })
                    logger.info(`${productSectionTag} found product [ ${chalk.yellow(product.name)} : ${chalk.green(product.variants[0].listPrice)} ]`)
                    timeEnd(productSectionTag)
                    // end get product section

                    // get products section
                    let productsSectionTag = '💎  get products'
                    time(productsSectionTag)
                    let productIds = [randomProduct, randomProduct2].map(i => i.id)
                    let products = await commerceAPI.getProducts({ productIds: productIds.join(',') })
                    logger.info(`${productsSectionTag} got [ ${chalk.green(products.length)} ] products for [ ${chalk.gray(productIds.length)} ] productIds`)
                    timeEnd(productsSectionTag)
                    // end get products section
                } else {
                    logger.error(`couldn't find a category with products in it`)
                }

                // get customer groups section
                let customerGroupsSectionTag = '👨‍👩‍👧‍👦  get customer groups'
                time(customerGroupsSectionTag)
                let customerGroups = await commerceAPI.getCustomerGroups({})
                logger.info(`${customerGroupsSectionTag} got [ ${chalk.green(customerGroups.length)} ]: ${_.map(customerGroups, 'name').join(', ')}`)
                timeEnd(customerGroupsSectionTag)
                // end get products section
            } catch (error) {
                logger.error(`testing integration for [ ${item.body._meta.schema} ]: ${chalk.red('failed')}: ${error}`)
                console.log(error.stack)
            }
            cb()
        })
        callback()
    })
})