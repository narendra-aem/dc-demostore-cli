import { AmplienceContext } from '../handlers/resource-handler';
import _ from 'lodash'
import { contextHandler } from '../common/middleware';
import amplienceBuilder from '../common/amplience-builder';
import amplienceHelper, { getContentItemById, getContentItemFromCDN, getEnvConfig, synchronizeContentType, publishContentItem } from '../common/amplience-helper';
import { Category, Product, QueryContext, CryptKeeper, paginator } from '@amplience/dc-demostore-integration'
import { getRandom } from '../common/utils';
import logger from '../common/logger';
import { ContentItem } from 'dc-management-sdk-js';
import chalk from 'chalk'

export const command = 'encrypt';
export const desc = "Encrypt credentials";

export const builder = amplienceBuilder
export const handler = contextHandler(async (context: AmplienceContext): Promise<void> => {
    let { hub } = context
    let siteStructureContentItems = await paginator(hub.repositories['sitestructure'].related.contentItems.list, { status: 'ACTIVE' })
    let contentTypeSchemas = await paginator(hub.related.contentTypeSchema.list, { status: 'ACTIVE' })

    await Promise.all(siteStructureContentItems.map(async ci => {
        if (ci.body._meta.schema.indexOf('/site/integration') > -1) {
            ci.body =  {
                ...ci.body,
                _meta: {
                    ...ci.body._meta,
                    deliveryId: ci.deliveryId
                }
            }

            let keeper = CryptKeeper({
                ...ci.body,
                locator: `${context.hub.name}:`
            })

            let schemaObject = contentTypeSchemas.find(schema => schema.schemaId === ci.body._meta.schema)
            if (schemaObject?.body) {
                let schema = JSON.parse(schemaObject.body)
                let encryptables = _.filter(_.map(schema.properties, (v, k) => ({ ...v, key: k })), prop => prop.maxLength === 200)
                if (encryptables.length > 0) {
                    _.each(encryptables, encryptable => {
                        let x = keeper.encrypt(ci.body[encryptable.key])
                        console.log(`encrypt ${ci.body[encryptable.key]} = '${x}'`)
                        ci.body[encryptable.key] = x
                    })
                    ci = await ci.related.update(ci)
                }
            }
        }
    }))

    await amplienceHelper.publishAll(context)
})