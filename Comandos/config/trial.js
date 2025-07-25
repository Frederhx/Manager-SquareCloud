const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ApplicationCommandType
} = require("discord.js");
const { Emojis } = require("../../databases/index");

module.exports = {
    name: "paineltrial",
    description: "[🧪] Envia o painel para realizar teste gratuito por 24 horas",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008",
    run: async (client, interaction) => {
        if (interaction.user.id !== ownerID) {
            return interaction.reply({
                content: `${Emojis.get('negative')} Você não tem permissão para usar este comando.`,
                ephemeral: true
            });
        }

        await interaction.reply({
            content: `${Emojis.get('checker')} Painel de teste enviado com sucesso!`,
            ephemeral: true
        });

        const trialButton = new ButtonBuilder()
            .setCustomId("realizar_teste_24hr")
            .setLabel("Realizar Teste (24Hr)")
            .setEmoji("<:featured_seasonal_and_gifts_24dp:1391519825246945422>")
            .setStyle(2);

        const row = new ActionRowBuilder().addComponents(trialButton);

        await interaction.channel.send({
            content: `# <:rocket_launch_24dp_E3E3E3_FILL0_:1390363597170806925> Teste Grátis\n\n- Você está curioso para conhecer a qualidade dos nossos serviços antes de contratar? Agora é sua chance! Estamos oferecendo um **teste gratuito válido por 24 horas** para que você possa experimentar tudo o que temos a oferecer sem compromisso.`,
            components: [row],
        });
    }
};
