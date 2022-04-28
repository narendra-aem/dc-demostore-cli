"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentDependencyTree = exports.referenceTypes = void 0;
exports.referenceTypes = [
    'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link',
    'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference'
];
var CircularDependencyStage;
(function (CircularDependencyStage) {
    CircularDependencyStage[CircularDependencyStage["Standalone"] = 0] = "Standalone";
    CircularDependencyStage[CircularDependencyStage["Intertwined"] = 1] = "Intertwined";
    CircularDependencyStage[CircularDependencyStage["Parent"] = 2] = "Parent";
})(CircularDependencyStage || (CircularDependencyStage = {}));
class ContentDependencyTree {
    constructor(items, mapping) {
        let info = this.identifyContentDependencies(items);
        const allInfo = info;
        this.resolveContentDependencies(info);
        const requiredSchema = new Set();
        info.forEach(item => {
            requiredSchema.add(item.owner.content.body._meta.schema);
        });
        const resolved = new Set();
        mapping.contentItems.forEach((to, from) => {
            resolved.add(from);
        });
        let unresolvedCount = info.length;
        const stages = [];
        while (unresolvedCount > 0) {
            const stage = [];
            const lastUnresolvedCount = unresolvedCount;
            info = info.filter(item => {
                const unresolvedDependencies = item.dependencies.filter(dep => !resolved.has(dep.dependency.id));
                if (unresolvedDependencies.length === 0) {
                    stage.push(item);
                    return false;
                }
                return true;
            });
            stage.forEach(item => {
                resolved.add(item.owner.content.id);
            });
            unresolvedCount = info.length;
            if (unresolvedCount === lastUnresolvedCount) {
                break;
            }
            stages.push({ items: stage });
        }
        const circularStages = [];
        while (unresolvedCount > 0) {
            const stage = [];
            const lastUnresolvedCount = unresolvedCount;
            const circularLevels = info.map(item => this.topLevelCircular(item, info));
            const chosenLevel = Math.min(...circularLevels);
            for (let i = 0; i < info.length; i++) {
                const item = info[i];
                if (circularLevels[i] === chosenLevel) {
                    stage.push(item);
                    circularLevels.splice(i, 1);
                    info.splice(i--, 1);
                }
            }
            unresolvedCount = info.length;
            if (unresolvedCount === lastUnresolvedCount) {
                break;
            }
            circularStages.push(stage);
        }
        this.levels = stages;
        this.circularLinks = [];
        circularStages.forEach(stage => this.circularLinks.push(...stage));
        this.all = allInfo;
        this.byId = new Map(allInfo.map(info => [info.owner.content.id, info]));
        this.requiredSchema = Array.from(requiredSchema);
    }
    searchObjectForContentDependencies(item, body, result, parent, index) {
        if (Array.isArray(body)) {
            body.forEach((contained, index) => {
                this.searchObjectForContentDependencies(item, contained, result, body, index);
            });
        }
        else if (body != null) {
            const allPropertyNames = Object.getOwnPropertyNames(body);
            if (body._meta &&
                exports.referenceTypes.indexOf(body._meta.schema) !== -1 &&
                typeof body.contentType === 'string' &&
                typeof body.id === 'string') {
                result.push({ dependency: body, owner: item, parent, index });
                return;
            }
            allPropertyNames.forEach(propName => {
                const prop = body[propName];
                if (typeof prop === 'object') {
                    this.searchObjectForContentDependencies(item, prop, result, body, propName);
                }
            });
        }
    }
    removeContentDependenciesFromBody(body, remove) {
        if (Array.isArray(body)) {
            for (let i = 0; i < body.length; i++) {
                if (remove.indexOf(body[i]) !== -1) {
                    body.splice(i--, 1);
                }
                else {
                    this.removeContentDependenciesFromBody(body[i], remove);
                }
            }
        }
        else {
            const allPropertyNames = Object.getOwnPropertyNames(body);
            allPropertyNames.forEach(propName => {
                const prop = body[propName];
                if (remove.indexOf(prop) !== -1) {
                    delete body[propName];
                }
                else if (typeof prop === 'object') {
                    this.removeContentDependenciesFromBody(prop, remove);
                }
            });
        }
    }
    topLevelCircular(top, unresolved) {
        let selfLoop = false;
        let intertwinedLoop = false;
        let isParent = false;
        const seenBefore = new Set();
        const traverse = (top, item, depth, unresolved, seenBefore, intertwined) => {
            let hasCircular = false;
            if (item == null) {
                return false;
            }
            else if (top === item && depth > 0) {
                selfLoop = true;
                return false;
            }
            else if (top !== item && unresolved.indexOf(item) !== -1) {
                if (!intertwined) {
                    const storedSelfLoop = selfLoop;
                    const childIntertwined = traverse(item, item, 0, [top], new Set(), true);
                    selfLoop = storedSelfLoop;
                    if (childIntertwined) {
                        intertwinedLoop = true;
                    }
                    else {
                        isParent = true;
                    }
                }
                hasCircular = true;
            }
            if (seenBefore.has(item)) {
                return false;
            }
            seenBefore.add(item);
            item.dependencies.forEach(dep => {
                hasCircular = traverse(top, dep.resolved, depth + 1, unresolved, seenBefore, intertwined) || hasCircular;
            });
            return hasCircular;
        };
        const hasCircular = traverse(top, top, 0, unresolved, seenBefore, false);
        if (hasCircular) {
            if (intertwinedLoop) {
                if (selfLoop && !isParent) {
                    return CircularDependencyStage.Intertwined;
                }
                else {
                    return CircularDependencyStage.Parent;
                }
            }
            else {
                return CircularDependencyStage.Parent;
            }
        }
        else {
            return CircularDependencyStage.Standalone;
        }
    }
    identifyContentDependencies(items) {
        return items.map(item => {
            const result = [];
            this.searchObjectForContentDependencies(item, item.content.body, result, undefined, 0);
            if (item.content.body._meta.hierarchy && item.content.body._meta.hierarchy.parentId) {
                result.push({
                    dependency: {
                        _meta: {
                            schema: '_hierarchy',
                            name: '_hierarchy'
                        },
                        id: item.content.body._meta.hierarchy.parentId,
                        contentType: ''
                    },
                    owner: item,
                    parent: undefined,
                    index: 0
                });
            }
            return { owner: item, dependencies: result, dependents: [] };
        });
    }
    resolveContentDependencies(items) {
        const idMap = new Map(items.map(item => [item.owner.content.id, item]));
        const visited = new Set();
        const resolve = (item) => {
            if (visited.has(item))
                return;
            visited.add(item);
            item.dependencies.forEach(dep => {
                const target = idMap.get(dep.dependency.id);
                dep.resolved = target;
                if (target) {
                    target.dependents.push({
                        owner: target.owner,
                        resolved: item,
                        dependency: dep.dependency,
                        parent: dep.parent,
                        index: dep.index
                    });
                    resolve(target);
                }
            });
        };
        items.forEach(item => resolve(item));
    }
    traverseDependents(item, action, ignoreHier = false, traversed) {
        const traversedSet = traversed || new Set();
        traversedSet.add(item);
        action(item);
        item.dependents.forEach(dependent => {
            if (ignoreHier && dependent.dependency._meta.schema == '_hierarchy') {
                return;
            }
            const resolved = dependent.resolved;
            if (!traversedSet.has(resolved)) {
                this.traverseDependents(resolved, action, ignoreHier, traversedSet);
            }
        });
    }
    filterAny(action) {
        return this.all.filter(item => {
            let match = false;
            this.traverseDependents(item, item => {
                if (action(item)) {
                    match = true;
                }
            });
            return match;
        });
    }
    removeContent(items) {
        this.levels.forEach(level => {
            level.items = level.items.filter(item => items.indexOf(item) === -1);
        });
        this.all = this.all.filter(item => items.indexOf(item) === -1);
        this.circularLinks = this.circularLinks.filter(item => items.indexOf(item) === -1);
        items.forEach(item => {
            this.byId.delete(item.owner.content.id);
        });
    }
}
exports.ContentDependencyTree = ContentDependencyTree;
