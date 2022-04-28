"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaLinkInjector = exports.linkTypes = void 0;
exports.linkTypes = [
    'http://bigcontent.io/cms/schema/v1/core#/definitions/image-link',
    'http://bigcontent.io/cms/schema/v1/core#/definitions/video-link'
];
class MediaLinkInjector {
    constructor(items) {
        this.all = this.identifyMediaLinks(items);
    }
    searchObjectForMediaLinks(item, body, result) {
        if (Array.isArray(body)) {
            body.forEach(contained => {
                this.searchObjectForMediaLinks(item, contained, result);
            });
        }
        else {
            const allPropertyNames = Object.getOwnPropertyNames(body);
            if (body._meta &&
                exports.linkTypes.indexOf(body._meta.schema) !== -1 &&
                typeof body.name === 'string' &&
                typeof body.id === 'string') {
                result.push({ link: body, owner: item });
                return;
            }
            allPropertyNames.forEach(propName => {
                const prop = body[propName];
                if (typeof prop === 'object') {
                    this.searchObjectForMediaLinks(item, prop, result);
                }
            });
        }
    }
    identifyMediaLinks(items) {
        return items.map(item => {
            const result = [];
            this.searchObjectForMediaLinks(item, item.content.body, result);
            return { owner: item, links: result };
        });
    }
}
exports.MediaLinkInjector = MediaLinkInjector;
