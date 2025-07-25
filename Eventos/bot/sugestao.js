const { EmbedBuilder, ThreadAutoArchiveDuration, ActionRowBuilder, ButtonBuilder } = require("discord.js");


let delay = {}

module.exports = {
    name: 'messageCreate',

    run: async (message) => {

        if (message.channel.id !== '1393025355157340250') return;
        if (message.author.bot) return;
        message.delete()

        const linkRegex = /https?:\/\/\S+/;
        const discordInviteRegex = /discord\.gg\/\S+/;
    
        if (linkRegex.test(message.content) || discordInviteRegex.test(message.content)) {
            return
        }

        let embed = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, icon: message.author.displayAvatarURL() })
            .setDescription(`Você está tentando enviar uma sugestão muito rapidamente, por favor espere 5 minutos para enviar outra sugestão.`)
            .setColor(`#5865F2`)


        if (delay[message.author.id] && delay[message.author.id] > Date.now()) return message.channel.send({ embeds: [embed], content: `<@${message.author.id}>` }).then(msg => {
            setTimeout(async () => {
                try {
                    await msg.delete()
                } catch (error) {
                    
                }
            }, 2000);
        })

        delay[message.author.id] = Date.now() + 300000

        // faça ter um delay de 5 minutos entre cada sugestção	



        let options = []

        options.push({ text: 'Aprovar sugestão', emoji: '<:check_circle_24dp_E3E3E3_FILL0_w:1384944449569947718>' }, { text: 'Discordar da sugestão', emoji: '<:close_24dp_E3E3E3_FILL0_wght400_:1384944447833505973>' });

        let question = message.content

        let perguntasRow = new ButtonBuilder().setCustomId(`acoessugestao`).setLabel('Ações Administrativas').setStyle(2).setEmoji('1383692099160903730').setDisabled(true) 

        let actionButtons = new ActionRowBuilder().addComponents(perguntasRow)

        message.channel.send({
            poll: {
                question: {
                    text: question
                },
                answers: options.map(option => (option)),
                duration: 168
            },
            content: `${message.author}`,
            components: [actionButtons]
        }).then(async msgg => {

            await msgg.startThread({
                name: `💡 - Debater sobre a sugestão ${message.author.username}`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                reason: 'Needed a separate thread for food',
            }).then(async msgg => {

                await  msgg.send({content: `- Olá ${message.author}, tudo bem? Obrigado por enviar sua sugestão! \n - Aqui vocês podem debater sobre a sugestão, lembre-se sempre de respeitar a opinião do próximo`})
         
         
         
             })

        })

    }
}