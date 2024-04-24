# @amplience/dc-demostore-cli

Demonstration Command line interface for Amplience Demo Store.

## Description

`dc-demostore-cli` or CLI alias **demostore** is a command line interface application to manage an installation of the Amplience Demo Store (demostore). It builds on top of the [Amplience DC CLI](https://github.com/amplience/dc-cli) and [Amplience Management APIs](https://amplience.com/docs/api/dynamic-content/management/)

Run `demostore --help` to get a list of available commands.

> See [v2.0.0 Changes](docs/v2.0.0-changes.md) if you already have an existing version of demostore that you wish to update.

<!-- MarkdownTOC levels="2,3" autolink="true" -->
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Installation](#installation)
- [Command categories](#command-categories)
  - [using a demostore environment](#using-a-demostore-environment)
  - [env management](#env)
- [Configure your own Automated Content](#automation-bespoke)
<!-- /MarkdownTOC -->

## Building

This demo appliction was developed and tested with:

- Node version 20.x

To switch to the correct node version it is recommended to have [Node Version Manager](https://github.com/nvm-sh/nvm) installed.

``` 
nvm use
```

## Installation

Installing the demostore CLI from the NPM package manager can be achieved using the following command:

```bash
npm install -g @amplience/dc-demostore-cli
```

## Configuration

**demostore** requires a demostore environment configuration to run.

### Prerequisites
- Amplience account
- Details and where to get them from.
  - [Hub Name](docs/screenshots.md)
  - [App URL](https://github.com/amplience/dc-demostore-core/blob/main/docs/ForkDeploy.md) - ( link to your deployed `dc-demostore-core` app )
  - Client ID / Secret - Sent via support@amplience.com - One Time Secret
  - [Hub ID](docs/screenshots.md)
  - Username & Password for Content Hub (used to map media)

On your first invocation of any `demostore` command, the CLI will prompt you to create an environment:



```bash
dave@po:~ $ demostore env add
✔ env name: hub-name-from-hub-settings-properties
✔ app deployment url: https://your-deployed-dc-demostore-core-url.com
✔ cms client id: amplience-client-id
✔ cms client secret: ***********************
✔ cms hub id: hub-id-from-hub-settings-properties
✔ dam username: foo@baz.com
✔ dam password: *****************
info: [ foo ] configure dc-cli...
info: [ foo ] environment active
```

You will set these to the values you received from Amplience Support when you created your account.

By default the configuration is saved to a file in the directory `<HOME_DIR>/.amplience/`, this can be overridden using the `--config` option.

### Options

| Option Name | Type                                                       | Description              |
| ----------- | ---------------------------------------------------------- | ------------------------ |
| --version   | [boolean]                                                  | Show version number      |
| --config    | [string]<br />[default: "~/.amplience/dc-cli-config.json"] | Path to JSON config file |
| --help      | [boolean]                                                  | Show help                |

## Command categories

### Using a demostore environment

<!-- MarkdownTOC levels="2,3" autolink="true" -->
- [Commands](#commands)
  - [cleanup](#cleanup)
  - [publish](#publish)
  - [import](#import)
  - [show](#show)
  - [env](#env)
<!-- /MarkdownTOC -->

## Common Options

The following options are available for all **content-type-schema** commands.

| Option Name | Type      | Description         |
| ----------- | --------- | ------------------- |
| --version   | [boolean] | Show version number |
| --help      | [boolean] | Show help           |

## Commands

### cleanup

Clean a hub.

#### Options

| Option Name            | Type      | Description                                         |
| ---------------------- | --------- | --------------------------------------------------- |
| --logRequests, -r      | [boolean] | log http requests/responses                         |
| --tempDir, -t          | [string]  | temp dir for run files                              |
| --matchingSchema, -m   | [array]   | apply to (types, schemas, items) matching schema id |
| --include, -i          | [array]   | types to include                                    |
| --skipConfirmation, -c | [boolean] | don't ask for confirmation                          |
| --all, -a              | [boolean] | clean up all resource types                         |

Valid resource types are `contentTypeSchema`, `contentTypes`, `contentItems`, `searchIndexes`, `extensions`, `webhooks`, and `events`.

#### Active properties handling

Content Items containing one of the following active field will go through an additional process:

- `filterActive`
- `active`

If these properties are `true`, the cleanup process will:

- update the delivery key (adding a random string at the end)
- set the active flag to `false`
- publish the content 

#### Examples

##### Clean a hub

```demostore cleanup```

##### Clean content types, schemas, and items without asking for confirmation

```demostore cleanup -ci contentTypes -i contentTypeSchema -i contentItems```

### import

Import data using automation packages found in [dc-demostore-automation](https://github.com/amplience/dc-demostore-automation)

When running an import you get provided with the environment variables to configure for your Front End deployment of [dc-demostore-core](https://github.com/amplience/dc-demostore-core). See specific information in the docs on this project about how to use.

Example output after import where all values marked as `XXX` will be specific to your account configuration

```
info: .env.local file format
info: 
----------------------- COPY START ----------------------
NEXT_PUBLIC_DEMOSTORE_CONFIG_JSON='{"url":"XXX","algolia":{"appId":"XXX","apiKey":"XXX"},"cms":{"hub":"XXX","stagingApi":"XXX","imageHub":"XXX"}}'
------------------------ COPY END -----------------------
info: 
info: Vercel format
info: 
----------------------- COPY START ----------------------
{"url":"XXX","algolia":{"appId":"XXX","apiKey":"XXX"},"cms":{"hub":"XXX","stagingApi":"XXX","imageHub":"XXX"}}
------------------------ COPY END -----------------------
```


#### Options

| Option Name             | Type      | Description                                             |
| ----------------------- | --------- | ------------------------------------------------------- |
| --logRequests, -r       | [boolean] | log http requests/responses                             |
| --tempDir, -t           | [string]  | temp dir for run files                                  |
| --matchingSchema, -m    | [array]   | apply to (types, schemas, items) matching schema id     |
| --automationDir, -a     | [string]  | path to import directory                                |
| --skipContentImport, -s | [boolean] | skip content import                                     |
| --latest, -l            | [boolean] | using this flag will download the latest automation     |
| --openaiKey, -o         | [string]  | optional openai key for generative rich text automation |

#### Examples

##### Import the latest automation data

```demostore import -l```

##### Import only items matching schema 'schema'

```demostore import -m <schema>```

### publish

Publish all unpublished content items.

#### Options

| Option Name          | Type      | Description                                         |
| -------------------- | --------- | --------------------------------------------------- |
| --logRequests, -r    | [boolean] | log http requests/responses                         |
| --tempDir, -t        | [string]  | temp dir for run files                              |
| --matchingSchema, -m | [array]   | apply to (types, schemas, items) matching schema id |

#### Examples

##### Publish

```demostore publish```

### show

Show the status of a demostore environment.

#### Examples

```demostore show```

### env

This category includes interactions with environments.

[View commands for **env**](docs/env.md)

## [FAQ](docs/faq.md)

