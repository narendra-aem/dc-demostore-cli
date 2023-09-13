import { AmplienceContext } from '../handlers/resource-handler';
import _ from 'lodash'
import { contextHandler } from '../common/middleware';
import amplienceBuilder from '../common/amplience-builder';

export const command = 'update';
export const desc = "Update hub retail pointers";

export const builder = amplienceBuilder
export const handler = contextHandler(async (context: AmplienceContext): Promise<void> => {
    let demoStoreConfig = await context.amplienceHelper.getDemoStoreConfig()
    //let commerce = (await context.amplienceHelper.getContentItem(demoStoreConfig.commerce.id)).body

    //if (!commerce) {
        //throw new Error(`commerce integration not found!`)
    //}
})