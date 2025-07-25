const { ModalBuilder, TextInputBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } = require("discord.js");
const { api, db2, auto, db1, logs,Emojis, perms, db } = require("../../databases/index");

module.exports = {
    name:`interactionCreate`,
    run:async(interaction, client ) => {

        if (interaction.isStringSelectMenu() && interaction.customId === "selectMenuPerms") {
            const options = interaction.values[0];

            if (options === "addPermBot") {

                const modal = new ModalBuilder()
                .setCustomId("modalAddPerm")
                .setTitle(`Adicionar Usuário`)

                const option = new TextInputBuilder()
                .setCustomId(`optionAddPerm`)
                .setLabel(`QUAL O ID DO USUÁRIO?`)
                .setPlaceholder(`Coloque o id do usuário aqui`)
                .setStyle("Short")
                .setMaxLength(50)

                const option1 = new ActionRowBuilder().addComponents(option);

                modal.addComponents(option1);
                await interaction.showModal(modal);

            }

            if (options === "remPermBot") {

                const modal = new ModalBuilder()
                .setCustomId(`modalRemPerm`)
                .setTitle(`Remover Usuário`)

                const option = new TextInputBuilder()
                .setCustomId(`optionRemPerm`)
                .setLabel(`QUAL O ID DO USUÁRIO?`)
                .setPlaceholder(`Coloque o id do usuário aqui`)
                .setStyle("Short")
                .setMaxLength(50)

                const option1 = new ActionRowBuilder().addComponents(option);

                modal.addComponents(option1);
                await interaction.showModal(modal);

            }
        }

        if (interaction.isModalSubmit() && interaction.customId === "modalAddPerm") {
            const addPerm = interaction.fields.getTextInputValue("optionAddPerm");

            const userExist = interaction.guild.members.cache.get(addPerm);

            if (!userExist) {
                interaction.reply({ content: `${Emojis.get('negative')} Ops... Não achei o ID usuário, tente novamente usando um ID usuário válido`, ephemeral: true });
                return;
            }

            if (perms.get("usersPerms").includes(addPerm)) {
                interaction.reply({ content: `${Emojis.get('negative')} Ops... O usuário já está com permissão!`, ephemeral: true });
                return;
            }

            perms.push("usersPerms", addPerm);
            permsUp();

        }

        if (interaction.isModalSubmit() && interaction.customId === "modalRemPerm") {
            const remPerm = interaction.fields.getTextInputValue("optionRemPerm");

            if (!perms.get("usersPerms").includes(remPerm)) {
                interaction.reply({ content: `${Emojis.get('negative')} Ops... O usuário ID já não tem permissão ou o ID está inválido!`, ephemeral: true });
                return;
            }

            perms.set("usersPerms", perms.get("usersPerms").filter((rs) => rs !== remPerm));
            permsUp();
        }

        async function permsUp() {

            let a = ""
            perms.get("usersPerms").map((rs, index) => {
    
                a += `\n${index + 1}. <@${rs}>`
            })
    
            const embed = new EmbedBuilder()
                .setTitle(`Permissões`)
                .setThumbnail(`${client.user.displayAvatarURL()}`)
                .setColor("#00FFFF")
                .setFooter({ text: `${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp()
    
                if (perms.get("usersPerms").length <= 0) {
                    embed.setDescription("- **Adicione pessoas para gerenciar o bot manager**\n\n```Ninguém está com permissão no momento, adicione alguém usando o menu abaixo!```")
                } else if (perms.get("usersPerms").length > 0) {
                    embed.setDescription(`- **Adicione pessoas para gerenciar o bot manager**\n${a}`)
                }
    
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                    .setCustomId(`selectMenuPerms`)
                    .setPlaceholder(`Clique aqui para selecionar uma opção`)
                    .addOptions(
                        {
                            value: `addPermBot`,
                            label: `Adicionar Usuário`,
                            description: `Adicione um usuário`,
                            emoji: `1246953350067388487`
                        },
                        {
                            value: `remPermBot`,
                            label: `Remover Usuário`,
                            description: `Remova um usuário`,
                            emoji: `1246953362037932043`
                        }
                    )
                );
    
            await interaction.update({ embeds: [embed], components: [actionRow] });

        }

    }
}