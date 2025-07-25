const { ApplicationCommandType, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { Emojis } = require("../../databases/index");

module.exports = {
    name: "msgverify",
    description: "[🔐] Envia a mensagem de verificação/autenticação no canal",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008",

    run: async (client, interaction) => {
        if (interaction.user.id !== "1258164990104571914") {
            return interaction.reply({ content: `${Emojis.get('negative')} Você não tem permissão para usar este comando.`, ephemeral: true });
        }

        await interaction.reply({ content: `${Emojis.get('checker')} Mensagem de verificação enviada com sucesso.`, ephemeral: true });

        const verifyButton = new ButtonBuilder()
            .setLabel("Realizar Verificação")
            .setEmoji("<:admin_panel_settings_24dp_E3E3E3:1389808290254290985>")
            .setStyle(ButtonStyle.Link)
            .setURL("https://discord.com/oauth2/authorize?client_id=1328262078263197777&response_type=code&redirect_uri=https%3A%2F%2Fryzen.squareweb.app%2Flogin&scope=identify+email+guilds.join"); // ⬅️ Altere esse link para o destino real

        const row = new ActionRowBuilder().addComponents(verifyButton);

        await interaction.channel.send({
            content: `# <:admin_panel_settings_24dp_E3E3E3:1389808290254290985> Mantenha-se Autenticado

 Por gentileza, solicitamos que todos os membros especialmente os **clientes ativos**  mantenham sua **autenticação em dia**. Isso é fundamental para:

- Garantir a recuperação rápida da sua conta, caso o servidor passe por instabilidades ou quedas;
- Participar de **sorteios exclusivos**, promoções e comunicações importantes da nossa equipe;
- Reforçar a segurança e a credibilidade da nossa comunidade.

<:report_24dp_E3E3E3_FILL0_wght400:1384940583558189217> *Reforçamos que não vendemos ou compartilhamos dados de membros.*`,
            components: [row]
        });
    }
};
