const { ApplicationCommandType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, ButtonBuilder } = require("discord.js")
const { logs, perms,Emojis, db2 } = require("../../databases/index");

module.exports = {
    name: "projects-manager",
    description: "[🤖] Configuração do BOT",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008",
    run: async (client, interaction) => {
        if (interaction.user.id !== ownerID) {
            return interaction.reply({ content: `${Emojis.get('negative')} Você não tem permissão para usar este comando.`, ephemeral: true });
        }

        const sistema = await logs.get("sistema");

        interaction.reply({
            content: ``,
            embeds: [
                new EmbedBuilder()
                    .setAuthor({ name: `${interaction.guild.name} - Gerenciamento Inicial`, iconURL: interaction.guild.iconURL() })
                    .setDescription(`-# Seja bem vindo a pagina principal do seu manager, aqui voce podera configurar toda a infraestutura e setar as configuraçoes gerais que seu manager precisa.`)
                    .addFields(
                        { name: `${Emojis.get('_tool_emoji')} Sistema`, value: `\`${sistema ? "\`🟢 Ligado\`" : "\`🔴 Desligado\`"}\``, inline: true },
                        { name: `${Emojis.get('_fixe_emoji')} Versão`, value: `\`BETA\``, inline: true },
                        { name: `${Emojis.get('sinal')} Ping`, value: `\`${client.ws.ping}\``, inline: true }
                    )
                    .setColor(`#00FFFF`)
                    .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp()
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`sistemaOnOff`).setLabel(sistema ? "Ligado" : "Desligado").setEmoji(sistema ? "1236021048470933575" : "1236021106662707251").setStyle(sistema ? 3 : 4),
                        new ButtonBuilder().setCustomId(`gerenciarApps`).setLabel(`Gerenciar Sistemas`).setEmoji(`1246953215380160593`).setStyle(1)
                    ),
                    new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`channelsRolesEdit`).setLabel(`Configurar Canais`).setEmoji(`1246953254810816542`).setStyle(1),
                        new ButtonBuilder().setCustomId(`definitions`).setLabel(`Definições Gerais`).setEmoji(`1246953268211613747`).setStyle(2)
                    )
            ],
            ephemeral: true
        });

    }
}