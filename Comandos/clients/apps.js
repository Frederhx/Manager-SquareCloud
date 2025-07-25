const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ComponentType, ButtonBuilder, ButtonStyle } = require(`discord.js`);
const { api, db2, Emojis } = require("../../databases/index");
const { SquareCloudAPI } = require('@squarecloud/api');

module.exports = {
    name: `apps`,
    description: `[📅] Gerencie suas Aplicações.`,
    type: ApplicationCommandType.ChatInput, 
    run: async (client, interaction) => {
        const userApps = db2.all().filter(pd => pd.data.owner === interaction.user.id);
        
        if (userApps.length === 0) {
            return interaction.reply({
                content: `${Emojis.get('negative')} | Você não tem nenhum bot em nosso sistema`,
                ephemeral: true
            });
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId(`appsconfig`)
            .setPlaceholder(`🤖 Selecione uma Aplicação`);

        userApps.forEach(app => {
            select.addOptions({
                label: `${app.data.nome} - ${app.data.idapp}`,
                description: `${app.data.produto}`,
                value: `${app.data.idapp}`
            });
        });

        const msg = await interaction.reply({
            content: `Qual aplicação você deseja gerenciar aqui?`,
            components: [new ActionRowBuilder().addComponents(select)],
            ephemeral: true
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect });
        
        collector.on(`collect`, async (i) => {
            if (i.user.id !== interaction.user.id) return i.deferUpdate();
            const api1 = new SquareCloudAPI(api.get(`square`));
            
            // Lógica para lidar com a seleção da aplicação
        });
    }
};
