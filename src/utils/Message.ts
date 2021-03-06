import { RunEvent } from '../type/interface'
import { MessageEmbed, TextChannel } from 'discord.js'

import GuildController from '../controllers/Guild.controller'

export default async function CheckMessage(event: RunEvent) {
    const message = event.message
    const bot = event.bot
    const args = event.args
    const prefix = event.prefix
    const guildID = Number(message.guild?.id) || 0

    // Check message is a command
    async function isCommand() {
        // Get full current prefix
        const { prefix_redirect } = await GuildController().selectField(guildID, ["prefix_redirect"])

        // If not get prefixs from database
        if(!prefix_redirect) return false

        // Split the message and get the first element of message 
        const firstElementSplitted = message.content.split('')[0]
        
        return firstElementSplitted === prefix || prefix_redirect.includes(firstElementSplitted) ? true : false
    }

    // Check what's the channel of message
    async function channelOfMessage(): Promise<'command' | 'chat' | undefined> {
        // Get channel of message
        const channel = message.channel.id

        // Get full channels commands from database
        const { channels_command } = await GuildController().selectField(guildID, ["channels_command"])

        // If not get channels commands or not exist channels commands
        if(!channels_command || channels_command.length <= 0) return

        return channels_command.includes(channel) ? 'command' : 'chat'
    }

    // Check message was sent by Ava
    function sentByAva() {
        if (!message.author.bot) return false

        return message.author === bot.user ? true : false
    }

    // Check if message has embeds
    function messageHasEmbeds() {
        return message.embeds.length >= 1
    }

    // Process Message to get embeds
    function getEmbeds(): MessageEmbed[] {
        return message.embeds.map(embed => {
            embed.setDescription(`${embed.description} \n\n\n Enviado por ${message.author} no canal ${message.channel.toString()}`)

            return embed
        })
    }

    // Redirect message to another channel
    async function redirectMessage(toId: string) {
        // If message send by Ava return function
        if (sentByAva()) return
        let messageToSend

        try {
            // Get channel to send message
            const toChannel = bot.channels.cache.get(toId) as TextChannel
            if (!toChannel) throw new Error('Channel to send message be not find')

            // Create message with or without embeds
            if (messageHasEmbeds()) {
                messageToSend = getEmbeds()
            } else {
                messageToSend = `${message}\n\n\nEnviado por ${message.author} no canal ${message.channel.toString()}`
            }

            // Send message to specific channel
            await toChannel.send(messageToSend)

            // Delete old message
            message.delete()
        } catch (error) {
            message.reply('Desta vez não consegui redirecionar sua mensagem...\nMas na próxima nn passa!')
        }
    }

    // If not a command and the message was sent on the command channel
    if (!await isCommand() && await channelOfMessage() === 'command') {
        if (message.author.bot) return

        GuildController().selectField(guildID, ['channels_chat'])
            .then(({ channels_chat }) => {
                // If not get channels_chat or there's no channel call redirectMessage with null string to return a error
                if (!channels_chat || channels_chat?.length <= 0) return redirectMessage('')

                // Redirection of message to first channel chat on database
                redirectMessage(channels_chat[0])
            })

            // If returned error when get channels on database
            .catch(() => redirectMessage(''))
    }

    // If a command and the message was sent on the chat channel
    if (await isCommand() && await channelOfMessage() === 'chat') {
        if (message.author.bot) return

        GuildController().selectField(guildID, ['channels_command'])
            .then(({ channels_command }) => {
                //If not get channels_command or there's no channel call redirectMessage with null string to return a error
                if (!channels_command || channels_command?.length <= 0) return redirectMessage('')

                // Redirection of message to first channel command on database
                redirectMessage(channels_command[0])
            })

            // If returned error when get channels on database
            .catch(() => redirectMessage(''))
    }

    // If a author of message is a bot and message sent on the chat channel
    if (message.author.bot && await channelOfMessage() === 'chat') {
        GuildController().selectField(guildID, ['channels_command'])
            .then(({ channels_command }) => {
                //If not get channels_command or there's no channel call redirectMessage with null string to return a error
                if (!channels_command || channels_command?.length <= 0) return redirectMessage('')

                // Redirection of message to first channel command on database
                redirectMessage(channels_command[0])
            })

            // If returned error when get channels on database
            .catch(() => redirectMessage(''))
    }
}