# SYSTRAN Translation & Dictionary Commands for HipChat

## Create custom commands to handle translation and dictionary lookup in your HipChat channels.

You can create custom commands to handle translation and dictionary lookup in your HipChat channels with [SYSTRAN Platform](https://platform.systran.net).

## Prerequisites and configuration

### SYSTRAN Platform API Key

Translations and dictionary lookup are performed with the [SYSTRAN Platform](https://platform.systran.net) [REST Translation API](https://platform.systran.net/reference/translation) and [REST Resource Management API](https://platform.systran.net/reference/resources). To use it, you need to get a valid API key from [SYSTRAN Platform here](https://platform.systran.net).
Then set it in the `systranApiKey` variable in `systran-hipchat-commands.js`.

## Redis server

A [Redis server](http://redis.io/) is required to run the Add-On server

## Start the add-on server

```shell
$ npm start
```

## Register the add-on in HipChat

To register your add-on, navigate to the rooms administration page at https://<your-account>.hipchat.com/rooms (or whatever url your private server is running at, if appropriate). Then select one of your rooms in the list. In the following page, select Integrations in the sidebar, and then click the "Install an integration from a descriptor URL" and set the "Descriptor URL" to `<your add-on server url>/addon/capabilities`

## ngrok

[ngrok](https://ngrok.com/) can be a useful tool to simplify your development cycle. More details are available at the following page: https://bitbucket.org/atlassianlabs/ac-koa-hipchat/wiki/Getting_Started
