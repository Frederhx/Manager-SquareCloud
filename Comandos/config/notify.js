const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ApplicationCommandType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { Emojis } = require("../../databases/index");

const notifyPath = path.resolve(__dirname, "../../databases/notify.json");

function loadNotifyData() {
    if (!fs.existsSync(notifyPath)) {
        fs.writeFileSync(notifyPath, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(notifyPath, "utf-8"));
}

function saveNotifyData(data) {
    fs.writeFileSync(notifyPath, JSON.stringify(data, null, 4));
}

module.exports = {
    name: "msgnotify",
    description: "[🔔] Envia uma mensagem de notificação sobre limite de bots",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008",
    run: async (client, interaction) => {
        if (interaction.user.id !== ownerID) {
            return interaction.reply({ content: `${Emojis.get('negative')} Você não tem permissão para usar este comando.`, ephemeral: true });
        }

        await interaction.reply({ content: `${Emojis.get('checker')} Mensagem enviada com sucesso!`, ephemeral: true });

        const notifyButton = new ButtonBuilder()
            .setCustomId("toggle_notify")
            .setLabel("Ativar Notificações")
            .setEmoji("<:notifications_active_24dp_E3E3E3:1389804807228751953>")
            .setStyle(ButtonStyle.Primary);

        const systemMessageButton = new ButtonBuilder()
            .setLabel("Mensagem Automática do Sistema")
            .setCustomId("fds")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const row = new ActionRowBuilder().addComponents(notifyButton, systemMessageButton);

        await interaction.channel.send({
            content: "# <:smart_toy_24dp_E3E3E3_FILL0_wght:1387112558917583020> **Sem Espaço para Novos Bots!**\n- Atualmente, atingimos o limite de bots disponíveis em nossos  servidores. Mas não se preocupe! Você pode ativar as notificações e será avisado assim que abrirmos novas vagas para bots. Clique no botão abaixo para ativar ou desativar as notificações:",
            components: [row],
        });
    }
};
