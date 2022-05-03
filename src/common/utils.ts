import _ from "lodash"
import fs from 'fs-extra'
import { ImportContext } from "../handlers/resource-handler"
import { compile as handlebarsCompile } from 'handlebars';
import { getMapping, Mapping } from "./types";

export const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))

export type AnnotatedFile = {
    path: string
    object: any
}

export const fileIterator = (dir: any, mapping: Mapping) => ({
    iterate: async (fn: (file: AnnotatedFile) => Promise<any>): Promise<any[]> => {
        return _.compact(_.flatten(await Promise.all(_.reject(fs.readdirSync(dir), dir => dir.startsWith('.')).map(async file => {
            let path = `${dir}/${file}`
            let stats = fs.statSync(path)

            if (stats.isDirectory()) {
                return await fileIterator(path, mapping).iterate(fn)
            }
            else {
                let contents: any = {}
                if (path.endsWith('.hbs')) {
                    let fileContents = fs.readFileSync(path, 'utf-8')
                    const template = handlebarsCompile(fileContents)
                    contents = JSON.parse(template(mapping))

                    // delete the hbs template
                    fs.unlinkSync(path)

                    // update the path and write the json to file
                    path = path.replace('.hbs', '')

                    fs.writeJsonSync(path, contents)
                }
                else {
                    contents = fs.readJsonSync(path)
                }

                return await fn({
                    path,
                    object: contents
                })
            }
        }))))
    }
})

export const getRandom = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length + 1)]