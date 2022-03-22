# demostore

Command line interface for Amplience Demo Store.

## Description

**demostore** is a command line interface application to manage an installation of the Amplience Demo Store (demostore).

Run `demostore --help` to get a list of available commands.

<!-- MarkdownTOC levels="2,3" autolink="true" -->
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Command categories](#command-categories)
  - [using an demostore environment](#using-an-demostore-environment)
  - [env management](#env)
- [Configure your own Automated Content](#automation-bespoke)

<!-- /MarkdownTOC -->



## Installation

Installing the demostore CLI from the NPM package manager can be achieved using the following command:

```bash
npm install -g @amplience/dc-demostore-cli
```
<!--TODD: Change to Amplience NPM -->

## Configuration

**demostore** requires an demostore environment configuration to run.

### PreRequisites
- Amplience account ( Think about what we say here)
- Details and where to get then from.
  - [Hub Name](docs/screenshots.md)
  - [App URL](docs/ForkDeploy.md) - ( link to your deployed `dc-demostore-core` app )
  - Client ID / Secret - Sent via support@amplience.com - One Time Secret
  - [Hub ID](docs/screenshots.md)
  - Username & Password for Content Hub - Automate VSE details.

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

| Option Name    | Type                                                       | Description                                                  |
| -------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| --version      | [boolean]                                                  | Show version number                                          |
| --config       | [string]<br />[default: "~/.amplience/dc-cli-config.json"] | Path to JSON config file                                     |
| --help         | [boolean]                                                  | Show help                                                    |

## Command categories

### using an demostore environment

- [Commands](#commands)
  - [show](#show)
  - [env](#env)
  - [import](#import)
  - [cleanup](#cleanup)
  - [publish](#publish)
  
  

<!-- /MarkdownTOC -->

## Common Options

The following options are available for all **content-type-schema** commands.

| Option Name    | Type                                                       | Description                      |
| -------------- | ---------------------------------------------------------- | -------------------------------- |
| --version      | [boolean]                                                  | Show version number              |
| --help         | [boolean]                                                  | Show help                        |

## Commands

### cleanup

Clean a hub.

#### Options

| Option Name               | Type          | Description                                          |
| ------------------------- | ------------- | ---------------------------------------------------- |
| --logRequests, -r         | [boolean]     | log http requests/responses                          |
| --tempDir, -t             | [string]      | temp dir for run files                               |
| --matchingSchema, -m      | [array]       | apply to (types, schemas, items) matching schema id  |
| --include, -i             | [array]       | types to include                                     |
| --skipConfirmation, -c    | [boolean]     | don't ask for confirmation                           |
| --all, -a                 | [boolean]     | clean up all resource types                          |

Valid resource types are `contentTypeSchema`, `contentTypes`, `contentItems`, `searchIndexes`, `extensions`, `webhooks`, and `events`.

#### Examples

##### Clean a hub

```demostore cleanup```

##### Clean content types, schemas, and items without asking for confirmation

```demostore cleanup -ci contentTypes -i contentTypeSchema -i contentItems```

### import

Import data.

#### Options

| Option Name               | Type          | Description                                          |
| ------------------------- | ------------- | ---------------------------------------------------- |
| --logRequests, -r         | [boolean]     | log http requests/responses                          |
| --tempDir, -t             | [string]      | temp dir for run files                               |
| --matchingSchema, -m      | [array]       | apply to (types, schemas, items) matching schema id  |
| --automationDir, -a       | [string]      | path to import directory                             |
| --skipContentImport, -s   | [boolean]     | skip content import                                  |
| --latest, -l              | [boolean]     | using this flag will download the latest automation  |

#### Examples

##### Import the latest automation data

```demostore import -l```

##### Import only items matching schema 'schema'

```demostore import -m <schema>```

### publish

Publish all unpublished content items.

#### Options

| Option Name               | Type          | Description                                          |
| ------------------------- | ------------- | ---------------------------------------------------- |
| --logRequests, -r         | [boolean]     | log http requests/responses                          |
| --tempDir, -t             | [string]      | temp dir for run files                               |
| --matchingSchema, -m      | [array]       | apply to (types, schemas, items) matching schema id  |

#### Examples

##### Publish

```demostore publish```

### show

Show the status of an demostore environment.

#### Examples

```demostore show```

### env

This category includes interactions with environments.

[View commands for **env**](docs/env.md)
