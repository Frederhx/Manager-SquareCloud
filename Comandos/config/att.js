const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ApplicationCommandType,
    TextInputBuilder,
    TextInputStyle,
    ModalBuilder,
    InteractionType
} = require("discord.js");
const { Emojis } = require("../../databases/index");

module.exports = {
    name: "msgatualização",
    description: "[🔧] Envia uma mensagem informando que o sistema de um bot está em atualização",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008",
    run: async (client, interaction) => {
        if (interaction.user.id !== ownerID) {
            return interaction.reply({ content: `${Emojis.get("negative")} Você não tem permissão para usar este comando.`, ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId("modal_nomebot")
            .setTitle("Informar Nome do Bot");

        const input = new TextInputBuilder()
            .setCustomId("nomebot_input")
            .setLabel("Digite o nome do bot (ex: Bot Vendas)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Bot Vendas")
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);

        await interaction.showModal(modal);

        const filter = (i) => i.customId === "modal_nomebot" && i.user.id === interaction.user.id;
        const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 60_000 }).catch(() => null);

        if (!modalSubmit) return;

        const nomeBot = modalSubmit.fields.getTextInputValue("nomebot_input");

        await modalSubmit.reply({ content: `${Emojis.get("checker")} Mensagem de atualização enviada com sucesso!`, ephemeral: true });

        const infoButton = new ButtonBuilder()
            .setLabel("Mensagem automática do sistema")
            .setCustomId("disabled_update")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const rowBtn = new ActionRowBuilder().addComponents(infoButton);

        await interaction.channel.send({
            content: `# <:rocket_launch_24dp_E3E3E3_FILL0_:1390363597170806925> ${nomeBot} Em Atualização...\n- O sistema do bot **${nomeBot}** está passando por uma **atualização**. Durante esse período, algumas funcionalidades podem ficar temporariamente indisponíveis. Agradecemos a compreensão!`,
            components: [rowBtn]
        });
    }
};
