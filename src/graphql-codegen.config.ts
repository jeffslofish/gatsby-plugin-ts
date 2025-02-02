import * as fs from 'fs'
import * as path from 'path'
import { loadDocuments } from 'graphql-toolkit'
import { codegen } from '@graphql-codegen/core'
import { printSchema, parse } from 'gatsby/graphql'
import { plugin as typescriptPlugin } from '@graphql-codegen/typescript'
import { plugin as operationsPlugin } from '@graphql-codegen/typescript-operations'

interface IInitialConfig {
  directory: string;
  fileName: string;
}

type CreateConfigFromSchema = (schema: any) => Promise<any>
type CreateConfig = (args: IInitialConfig) => CreateConfigFromSchema
const createConfig: CreateConfig = ({ directory, fileName }) => {
  // file name & location
  const filename = path.join(directory, fileName)

  return async (schema) => {
    // documents
    const docPromises = [
      './src/**/*.{ts,tsx}',
      './.cache/fragments/*.js',
    ].map(docGlob => {
      const _docGlob = path.join(directory, docGlob)
      return loadDocuments(_docGlob)
    })
    const results = await Promise.all(docPromises)
    const documents = results.reduce((acc, cur) => acc.concat(cur), [])

    return {
      filename,
      schema: parse(printSchema(schema)),
      plugins: [{
        typescript: {
          skipTypename: true,
          enumsAsTypes: true,
        },
      }, {
        typescriptOperation: {
          skipTypename: true,
        },
      }],
      documents,
      pluginMap: {
        typescript: {
          plugin: typescriptPlugin
        },
        typescriptOperation: {
          plugin: operationsPlugin
        }
      }
    }
  }
}

type GenerateFromSchema = (schema: any) => Promise<void>
type GenerateWithConfig = (initalOptions: IInitialConfig) => Promise<GenerateFromSchema>
export const generateWithConfig: GenerateWithConfig = async (initalOptions) => {
  const createConfigFromSchema = createConfig(initalOptions)
  return async (schema) => {
    const config = await createConfigFromSchema(schema)
    const output = await codegen(config)
    return new Promise((resolve, reject) => {
      fs.writeFile(config.filename, output, (err) => {
          if (err) reject(err)
          resolve()
      });
    })
  }
}