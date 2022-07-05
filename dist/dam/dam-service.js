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
exports.DAMService = void 0;
const lodash_1 = __importDefault(require("lodash"));
const dam_client_1 = require("./dam-client");
class DAMService {
    constructor() {
        this.client = new dam_client_1.DAMClient();
    }
    init(argv) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.init(argv);
            return this;
        });
    }
    getBucket(bucketId) {
        return __awaiter(this, void 0, void 0, function* () {
            const bucketList = yield this.getBucketsList();
            return bucketList.find((item) => item.id === bucketId);
        });
    }
    getBucketsList() {
        return __awaiter(this, void 0, void 0, function* () {
            const bucketsList = yield this.client.fetchResource(`/buckets?_=${Date.now}`);
            return bucketsList;
        });
    }
    createBucket(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.client.createResource(`/buckets`, data);
            return response.content.data[0];
        });
    }
    updateBucket(bucketId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const updatedBucketId = yield this.client.updateResource(`/buckets/${bucketId}`, bucketId, data);
            return updatedBucketId;
        });
    }
    getBucketByName(bucketName) {
        return __awaiter(this, void 0, void 0, function* () {
            const bucketsList = yield this.getBucketsList();
            const bucket = bucketsList.filter((item) => item.label === bucketName);
            if (bucket.length > 0) {
                return bucket[0];
            }
            else {
                console.log(`...No extension found for name ${bucketName}`);
                return null;
            }
        });
    }
    getAssetsListForBucket(bucketName) {
        return __awaiter(this, void 0, void 0, function* () {
            let bucket = yield this.getBucketByName(bucketName);
            const assetsList = yield this.client.fetchPaginatedResourcesList(`/assets?filter=bucketID:${bucket.id}`);
            return assetsList;
        });
    }
    getAssetsListForAllBuckets() {
        return __awaiter(this, void 0, void 0, function* () {
            const buckets = yield this.getBucketsList();
            const assets = yield Promise.all(buckets.map((bucket) => __awaiter(this, void 0, void 0, function* () {
                return yield this.getAssetsList(bucket.id);
            })));
            return lodash_1.default.flatMap(assets);
        });
    }
    getEndpoints() {
        return __awaiter(this, void 0, void 0, function* () {
            const endpoints = yield this.client.fetchPaginatedResourcesList(`/endpoints`);
            return endpoints;
        });
    }
    getAssetsList(bucketId) {
        return __awaiter(this, void 0, void 0, function* () {
            const assetsList = yield this.client.fetchPaginatedResourcesList(`/assets?filter=bucketID:${bucketId}`);
            return assetsList;
        });
    }
    getAsset(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const asset = yield this.client.fetchResource(`/assets/${id}`);
            return asset[0];
        });
    }
    createAssets(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const assetsList = yield this.client.createResource(`/assets`, data);
            return assetsList;
        });
    }
    publishAssets(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const assetsList = yield this.client.publishResources(`/assets/publish`, data);
            return assetsList;
        });
    }
    getFoldersList(bucketId) {
        return __awaiter(this, void 0, void 0, function* () {
            const foldersList = yield this.client.fetchResource(`/folders?filter=bucketID:${bucketId}`);
            const childrenList = [];
            const nodes = foldersList[0];
            const addChildrenToList = (childrenList, node) => {
                childrenList.push(node);
                if (node.children) {
                    node.children.forEach((item) => addChildrenToList(childrenList, item));
                    delete node.children;
                }
            };
            addChildrenToList(childrenList, nodes);
            return childrenList;
        });
    }
    createFolder(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const folderId = yield this.client.createResource(`/folders`, data);
            return folderId.content.data[0];
        });
    }
}
exports.DAMService = DAMService;
