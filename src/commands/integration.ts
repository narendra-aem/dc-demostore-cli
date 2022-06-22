// import { Argv } from 'yargs';
// import _ from 'lodash';
// import amplienceBuilder from '../common/amplience-builder';
// import { AmplienceContext } from '../handlers/resource-handler';
// import Table from 'cli-table';
// import chalk from 'chalk';
// import { ContentItem } from 'dc-management-sdk-js';
// import { Product, Category, flattenCategories, CustomerGroup, getCommerceCodec } from '@amplience/dc-demostore-integration';
// import logger, { logComplete, logUpdate } from '../common/logger';
// import { formatPercentage, getRandom } from '../common/utils';
// import { deliveryKeys } from '../common/amplience-helper';

// export const command = 'integration'
// export const description = 'Manage integrations'

// const getDefaultIntegration = async (integrationKey: string, context: AmplienceContext): Promise<ContentItem> => {
//   let siteStructureContentItems = await context.amplienceHelper.getContentItemsInRepository('sitestructure')
//   let demostoreConfig = siteStructureContentItems.find(ci => ci.body._meta.deliveryKey === deliveryKeys.config)
//   return demostoreConfig?.body[integrationKey]
// }

// const getIntegrationItems = async (context: AmplienceContext): Promise<ContentItem[]> => {
//   let siteStructureContentItems = await context.amplienceHelper.getContentItemsInRepository('sitestructure')
//   return siteStructureContentItems.filter(ci => ci.body._meta.schema.indexOf('/site/integration') > -1)
// }

// const listIntegrations = async (context: AmplienceContext) => {
//   let table = new Table()
//   let integrationItems = await getIntegrationItems(context)
//   let defaultCommerceIntegrationItem = await getDefaultIntegration('commerce', context)

//   integrationItems.forEach(item => {
//     let label = defaultCommerceIntegrationItem.id === item.id ? `* ${item.label}` : `  ${item.label}`
//     table.push({ [chalk.yellow(label)]: item.body._meta.schema.split('/').pop() })
//   })
//   console.log(table.toString())
// }

// interface OperationResult {
//   tag: string
//   result: any
//   duration: string
//   status: string
// }

// const Operation = operation => {
//   const start = new Date().valueOf()
//   return {
//     do: async (status: (any) => string): Promise<OperationResult> => {
//       let result = await operation.execute()
//       return {
//         ...operation,
//         result,
//         duration: `${new Date().valueOf() - start}ms`,
//         status: status(result)
//       }
//     }
//   }
// }

// const checkCommerceIntegration = async (item, context: AmplienceContext) => {
//   try {
//     let config = await context.amplienceHelper.getContentItem(item.deliveryId)
//     let commerceAPI = await getCommerceCodec(config.body)

//     let allProducts: Product[] = []
//     let megaMenu: Category[] = []
//     let categories: Category[] = []

//     let megaMenuOperation = await Operation({
//       tag: '☯️  get megamenu',
//       execute: async (): Promise<Category[]> => await commerceAPI.getMegaMenu({})
//     }).do((mm: Category[]) => {
//       megaMenu = mm
//       let second = _.reduce(megaMenu, (sum, n) => { return _.concat(sum, n.children) }, [])
//       let third = _.reduce(_.flatMap(megaMenu, 'children'), (sum, n) => { return _.concat(sum, n.children) }, [])
//       categories = _.concat(megaMenu, second, third)
//       return `[ ${chalk.green(megaMenu.length)} top level ] [ ${chalk.green(second.length)} second level ] [ ${chalk.green(third.length)} third level ]`
//     })

//     let flattenedCategories = flattenCategories(categories)
//     let categoryOperation = await Operation({
//       tag: '🧰  get category',
//       execute: async (): Promise<Category> => await commerceAPI.getCategory(flattenedCategories[0])
//     }).do((cat: Category) => {
//       return ` has ${chalk.green(cat.products.length)} products`
//     })

//     const categoryReadStart = new Date().valueOf()
//     let categoryCount = 0
//     await Promise.all(flattenedCategories.map(async (cat: Category) => {
//       let category = await commerceAPI.getCategory(cat)
//       if (category) {
//         cat.products = category.products
//         allProducts = _.concat(allProducts, cat.products)
//         categoryCount++
//       }
//       logUpdate(`🧰  got [ ${categoryCount}/${flattenedCategories.length} ] categories and ${chalk.yellow(allProducts.length)} products`)
//     }))
//     allProducts = _.uniqBy(allProducts, 'id')

//     logComplete(`🧰  read ${chalk.green(flattenedCategories.length)} categories, ${chalk.yellow(allProducts.length)} products in ${chalk.cyan(`${new Date().valueOf() - categoryReadStart} ms`)}`)

//     if (context.showMegaMenu) {
//       console.log(`megaMenu ->`)
//       _.each(megaMenu, tlc => {
//         console.log(`${tlc.name} (${tlc.slug}) -- [ ${tlc.products.length} ]`)
//         _.each(tlc.children, cat => {
//           console.log(`\t${cat.name} (${cat.slug}) -- [ ${cat.products.length} ]`)
//           _.each(cat.children, c => {
//             console.log(`\t\t${c.name} (${c.slug}) -- [ ${c.products.length} ]`)
//           })
//         })
//       })
//     }

//     let randomProduct = getRandom(allProducts)
//     let randomProduct2 = getRandom(allProducts)

//     // get product section
//     let productOperation = await Operation({
//       tag: `💰  get product`,
//       execute: async (): Promise<Product> => await commerceAPI.getProduct(randomProduct)
//     }).do((product: Product) => {
//       return `found product [ ${chalk.yellow(product.name)} : ${chalk.green(product.variants[0].listPrice)} ]`
//     })

//     let productIds = [randomProduct, randomProduct2].map(i => i.id)
//     let productsOperation = await Operation({
//       tag: '💎  get products',
//       execute: async (): Promise<Product[]> => await commerceAPI.getProducts({ productIds: productIds.join(',') })
//     }).do((products: Product[]) => {
//       return `got [ ${chalk.green(products.length)} ] products for [ ${chalk.gray(productIds.length)} ] productIds`
//     })

//     // end get products section

//     let customerGroupOperation = await Operation({
//       tag: `👨‍👩‍👧‍👦  get customer groups`,
//       execute: async (): Promise<CustomerGroup[]> => await commerceAPI.getCustomerGroups({})
//     }).do((customerGroups: CustomerGroup[]) => {
//       return `got [ ${chalk.green(customerGroups.length)} ]`
//     })

//     const logOperation = (operation: OperationResult) => {
//       logger.info(`[ ${chalk.blueBright(operation.tag)} ] [ ${chalk.cyan(operation.duration)} ] ${operation.status}`)
//     }

//     logOperation(megaMenuOperation)
//     logOperation(categoryOperation)
//     logOperation(productOperation)
//     logOperation(productsOperation)
//     logOperation(customerGroupOperation)

//     let noProductCategories = _.filter(flattenedCategories, cat => cat.products?.length === 0)
//     logger.info(`${formatPercentage(noProductCategories, flattenedCategories)} categories with no products`)

//     let noImageProducts = _.filter(allProducts, prod => _.isEmpty(_.flatten(_.map(prod.variants, 'images'))))
//     logger.info(`${formatPercentage(noImageProducts, allProducts)} products with no image`)

//     let noPriceProducts = _.filter(allProducts, prod => prod.variants[0]?.listPrice === '--')
//     logger.info(`${formatPercentage(noPriceProducts, allProducts)} products with no price`)
//   } catch (error) {
//     logger.error(`testing integration for [ ${item.body._meta.schema} ]: ${chalk.red('failed')}: ${error}`)
//     console.log(error.stack)
//   }
// }

// const checkIntegration = async (context: AmplienceContext) => {
//   let integrationItems = await getIntegrationItems(context)
//   let item = integrationItems.pop()
//   if (item) {
//     await checkCommerceIntegration(item, context)
//   }
// }

// export const builder = (yargs: Argv): Argv =>
//   amplienceBuilder(yargs)
//     .demandCommand()
//     .options({
//       showMegaMenu: {
//         alias: 'm',
//         describe: 'show the mega menu structure',
//         type: 'boolean'
//       }
//     })
//     .command("list", "List integrations", {}, listIntegrations)
//     .command("check", "Check integration", {}, checkIntegration)
//     .help();