"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAMClient = void 0;
const isomorphic_unfetch_1 = __importDefault(require("isomorphic-unfetch"));
class DAMClient {
    constructor() {
        this.apiUrl = process.env.API_URL || 'https://dam-live-api.adis.ws/v1.5.0';
        this.PAGE_SIZE = 1000;
    }
    init(argv) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.accessToken = yield this.getAccessToken(argv.username, argv.password);
            }
            catch (error) {
                throw new Error(`error logging in to content hub, check your credentials`);
            }
        });
    }
    getAccessToken(username, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const authUrlFinal = `${this.apiUrl}/auth`;
            const payload = {
                username,
                password
            };
            const response = yield (0, isomorphic_unfetch_1.default)(authUrlFinal, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });
            const authorization = yield response.json();
            return authorization.content.permissionsToken;
        });
    }
    fetchResource(endpointUri) {
        return __awaiter(this, void 0, void 0, function* () {
            let resource = {};
            if (this.accessToken) {
                const response = yield (0, isomorphic_unfetch_1.default)(`${this.apiUrl}${endpointUri}`, {
                    method: 'GET',
                    headers: { 'X-Amp-Auth': this.accessToken }
                });
                if (response.ok) {
                    resource = yield response.json();
                }
            }
            return resource.content.data;
        });
    }
    fetchPaginatedResourcesList(endpointUri) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let resourcesList = [];
            if (this.accessToken) {
                const additionalParamsSeparator = endpointUri.indexOf('?') > 0 ? '&' : '?';
                const response = yield (0, isomorphic_unfetch_1.default)(`${this.apiUrl}${endpointUri}${additionalParamsSeparator}n=${this.PAGE_SIZE}`, {
                    method: 'GET',
                    headers: { 'X-Amp-Auth': this.accessToken }
                });
                const resources = yield response.json();
                if ((_a = resources.content) === null || _a === void 0 ? void 0 : _a.data) {
                    const resourceFinal = resources.content.data;
                    resourcesList = resourceFinal;
                }
                if (resources.content.pageSize) {
                    const numFound = resources.content.numFound;
                    const pageSize = resources.content.pageSize;
                    let totalPages = numFound / pageSize;
                    if (numFound % pageSize > 0)
                        totalPages++;
                    let pageNumber = 0;
                    while (pageNumber < totalPages - 2) {
                        pageNumber++;
                        const resourcesUrl = `${this.apiUrl}${endpointUri}${additionalParamsSeparator}n=${this.PAGE_SIZE}&s=${pageNumber * this.PAGE_SIZE}`;
                        const response = yield (0, isomorphic_unfetch_1.default)(resourcesUrl, {
                            method: 'GET',
                            headers: { 'X-Amp-Auth': this.accessToken }
                        });
                        const resources = yield response.json();
                        if ((_b = resources.content) === null || _b === void 0 ? void 0 : _b.data) {
                            const resourceFinal = resources.content.data;
                            resourcesList = [...resourcesList, ...resourceFinal];
                        }
                    }
                }
            }
            return resourcesList;
        });
    }
    deleteResource(endpointUri, resourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            let finalResourceId = '';
            if (this.accessToken) {
                const response = yield (0, isomorphic_unfetch_1.default)(`${this.apiUrl}${endpointUri}`, {
                    method: 'DELETE',
                    headers: { 'X-Amp-Auth': this.accessToken }
                });
                if (response.ok) {
                    finalResourceId = resourceId;
                }
            }
            return resourceId;
        });
    }
    createResource(endpointUri, data) {
        return __awaiter(this, void 0, void 0, function* () {
            let resource = {};
            if (this.accessToken) {
                const response = yield (0, isomorphic_unfetch_1.default)(`${this.apiUrl}${endpointUri}`, {
                    method: 'PUT',
                    headers: {
                        'X-Amp-Auth': this.accessToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    resource = yield response.json();
                }
            }
            return resource;
        });
    }
    updateResource(endpointUri, resourceId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            let updatedResourceId = '';
            if (this.accessToken) {
                const response = yield (0, isomorphic_unfetch_1.default)(`${this.apiUrl}${endpointUri}`, {
                    method: 'PUT',
                    headers: {
                        'X-Amp-Auth': this.accessToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    updatedResourceId = resourceId;
                }
            }
            return resourceId;
        });
    }
    publishResources(endpointUri, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.accessToken) {
                const response = yield (0, isomorphic_unfetch_1.default)(`${this.apiUrl}${endpointUri}`, {
                    method: 'POST',
                    headers: { 'X-Amp-Auth': this.accessToken },
                    body: JSON.stringify(data)
                });
            }
        });
    }
}
exports.DAMClient = DAMClient;
