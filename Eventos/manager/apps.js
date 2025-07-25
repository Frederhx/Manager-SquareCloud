const mercadopago = require("mercadopago");
const axios = require("axios");
const { JsonDatabase } = require("wio.db");
const { api, db2, auto, db1, logs, perms,  db } = require("../../databases/index");
const schedule = require('node-schedule');
const JSZip = require('jszip');
const path = require('path');
const fs = require("fs");
const { SquareCloudAPI } = require('@squarecloud/api');
const pix = new JsonDatabase({ databasePath: "./config.json" });
const Discord = require("discord.js");
const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ComponentType, ModalBuilder, TextInputBuilder } = require(`discord.js`);
const emojis = require("../../databases/emojis.json");

const Emojis = {
    get: (name) => emojis[name] || ""
};


module.exports = {
    name: "interactionCreate",
    run: async (interaction, client) => {
        let produto;
        let nome;
        let vencimento;
        const id = interaction.customId;
        if (interaction.isButton() && interaction.customId.endsWith("_outrasapp")) {
            const ids = id.split("_")[0];
            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate();
            interaction.reply({
                content: `Em qual parte dos itens diversos você deseja usar para gerenciar?`,
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`${ids}_alterarnomeapp`)
                                .setLabel(`Nome Aplicação`)
                                .setStyle(1)
                                .setEmoji(`1302019715727626260`),
                            new ButtonBuilder()
                                .setCustomId(`${ids}_alterartokenapp`)
                                .setLabel(`Token Aplicação`)
                                .setStyle(1)
                                .setEmoji(`1246953149009367173`),
                            new ButtonBuilder()
                                .setCustomId(`${ids}_transferirposseapp`)
                                .setLabel(`Passar Posse do App`)
                                .setStyle(1)
                                .setEmoji(`1302019361623769281`)
                        )
                ],
                ephemeral: true
            })
        };

        if (interaction.isButton() && interaction.customId.endsWith("_transferirposseapp")) {
            const ids = id.split("_")[0];
            const kk = await db2.get(`${ids}`);

            if (interaction.user.id !== kk.owner) return interaction.deferUpdate();

            const modal = new ModalBuilder()
                .setCustomId(`${ids}_transferirposseapp_modal`)
                .setTitle(`${kk.nome} - Transferir Posse`);

            const text = new TextInputBuilder()
                .setCustomId(`text`)
                .setLabel(`Qual é o id do usuario?`)
                .setStyle(1)
                .setPlaceholder(`⚠️ Você irá perder o acesso completo.`)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(text));

            await interaction.showModal(modal);

        };

        if (interaction.isModalSubmit() && interaction.customId.endsWith("_transferirposseapp_modal")) {
            const ids = id.split("_")[0];

            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate();

            const text = interaction.fields.getTextInputValue(`text`);
            const users = interaction.guild.members.cache.get(text);

            if (!users) {
                interaction.reply({
                    content: `${Emojis.get('information_emoji')} Eu não achei este usuario, certifique que ele esteja nesse servidor!`,
                    ephemeral: true
                });
                return;
            };

            const userId = interaction.user.id;
            db2.set(`${ids}.owner`, text);

            interaction.update({
                embeds: [],
                components: [],
                content: `${Emojis.get('checker')} Posse doada com êxito!\n-# **Você perdeu o acesso total de seu bot!**`
            });

        };

        if (interaction.isButton() && interaction.customId.endsWith("_alterartokenapp")) {
            const ids = id.split("_")[0];

            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate();

            const modal = new ModalBuilder()
                .setCustomId(`${ids}_alterartokenapp_modal`)
                .setTitle(`Alterar Token do Bot`);
            const text = new TextInputBuilder()
                .setCustomId(`text`)
                .setLabel(`Coloque Token Bot`)
                .setStyle(1)
                .setRequired(true)
                .setPlaceholder(`Coloque o Token Certo!`)

            modal.addComponents(new ActionRowBuilder().addComponents(text));
            await interaction.showModal(modal);

        };

if (interaction.isModalSubmit() && interaction.customId.endsWith("_alterartokenapp_modal")) {
    const ids = id.split("_")[0];

    const msgas = await interaction.reply({
        content: `${Emojis.get('loading')} Carregando...`,
        ephemeral: true
    });

    const token = interaction.fields.getTextInputValue("text");
    const configPath = `source/client/config.json`;

    const data = JSON.stringify({
        token: token,
        owner: interaction.user.id
    }, null, 4); // Indenta com 4 espaços

    try {
        // Cria ou sobrescreve o config.json com token e owner
        fs.writeFileSync(configPath, data);

        // Envia o config.json para a Square Cloud
        const api1 = new SquareCloudAPI(api.get(`square`));
        const application = await api1.applications.get(ids);

        await application.commit(configPath, 'config.json', true);

        // Atualiza o token no banco de dados db2
        db2.set(`${ids}.token`, token);

        msgas.edit(`${Emojis.get('checker')} Pronto!`);
    } catch (err) {
        msgas.edit(`${Emojis.get('negative')} Ocorreu um erro ao realizar o commit!`);
        console.error(err);
          }
        }


        if (interaction.isButton() && interaction.customId.endsWith("_alterarnomeapp")) {
            const ids = id.split("_")[0];
            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate()

            const modal = new ModalBuilder()
                .setCustomId(`${ids}_alterarnomeapp_modal`)
                .setTitle(`Alterar Nome da Aplicação`);

            const text = new TextInputBuilder()
                .setCustomId(`text`)
                .setLabel(`Qual será o novo nome?`)
                .setStyle(1)
                .setPlaceholder(`Coloque o nome que ira ser trocado!`)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(text))
            await interaction.showModal(modal)
        };

        if (interaction.isModalSubmit() && interaction.customId.endsWith("_alterarnomeapp_modal")) {
            const ids = id.split("_")[0];
            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate()
            const text = interaction.fields.getTextInputValue(`text`);
            const msg1 = await interaction.reply({
                content: `${Emojis.get('loading')} Carregando...`,
                ephemeral: true
            })

            const idToModify = ids;
            db2.set(`${idToModify}.nome`, `${text}`);

            editSquareCloud(ids);
        };

        if (interaction.isButton() && interaction.customId.endsWith("_ligarapp")) {
            const ids = id.split("_")[0];
            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate()
            const msgs = await interaction.update({
                content: `${Emojis.get('loading')} Carregando...`,
                embeds: [],
                components: []
            });

            try {
                const api1 = new SquareCloudAPI(api.get(`square`));
                const application = await api1.applications.get(ids);
                await application.start();
                editSquareCloud(ids);
            } catch (err) {
                console.log(err)
                interaction.followUp({
                    content: `${Emojis.get('negative')} Ocorre um erro...`,
                    ephemeral: true
                })
            }
        }


        if (interaction.isButton() && interaction.customId.endsWith("_desligarapp")) {
            const ids = id.split("_")[0];
            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate()
            const msgs = await interaction.update({
                content: `${Emojis.get('loading')} Carregando...`,
                embeds: [],
                components: []
            });

            try {
                const api1 = new SquareCloudAPI(api.get(`square`));
                const application = await api1.applications.get(ids);
                await application.stop();
                editSquareCloud(ids);
            } catch (err) {
                console.log(err)
                interaction.followUp({
                    content: `${Emojis.get('negative')} Ocorre um erro...`,
                    ephemeral: true
                })
            }

        }


        if (interaction.isButton() && interaction.customId.endsWith("_reiniciarapp")) {
            const ids = id.split("_")[0];
            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate()
            const msgs = await interaction.update({
                content: `${Emojis.get('loading')} Carregando...`,
                embeds: [],
                components: []
            });

            try {
                const api1 = new SquareCloudAPI(api.get(`square`));
                const application = await api1.applications.get(ids);
                await application.restart();
                editSquareCloud(ids);
            } catch (err) {
                console.log(err)
                interaction.followUp({
                    content: `${Emojis.get('negative')} Ocorre um erro...`,
                    ephemeral: true
                })
            }
        }

        if (interaction.isStringSelectMenu() && interaction.customId === `appsconfig`) {
            const msgs = await interaction.update({
                content: `${Emojis.get('loading')} Carregando...`,
                embeds: [],
                components: []
            });
            const ids = interaction.values[0];
            editSquareCloud(ids);
        }

        async function editSquareCloud(ids) {
            const auto = db2.get(ids);

            if (!auto) {
                console.error(`${Emojis.get('negative')} Application data not found for ID: ${ids}`);
                return;
            }

            const api1 = new SquareCloudAPI(api.get(`square`));
            const application = await api1.applications.get(ids);

            const { produto, nome, dataExpiracao } = auto;
            const status = await application.getStatus();

            const timestamp = Math.floor(new Date(dataExpiracao).getTime() / 1000);

            const tokenbot = db2.get(`${ids}.token`);
            let botId = null;

            // Tenta obter o ID do bot
            const response = await axios.get("https://discord.com/api/v10/users/@me", {
                headers: {
                    Authorization: `Bot ${tokenbot}`
                }
            }).then(res => {
                botId = res.data.id;
            }).catch(() => {
                console.error(`Erro ao obter o ID do bot para o token: ${tokenbot}`);
            });

            // Cria o botão "Adicionar App" condicionalmente
            const addAppButton = botId ?
                new ButtonBuilder()
                    .setURL(`https://discord.com/api/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot`)
                    .setLabel(`Adicionar App`)
                    .setEmoji(`1302020207753302166`)
                    .setStyle(5) :
                null; // Se botId for nulo, o botão não será criado

            const actionRowComponents = [
                new ButtonBuilder()
                    .setCustomId(`${status.status !== `running` ? `${ids}_ligarapp` : `${ids}_desligarapp`}`)
                    .setLabel(`${status.status !== `running` ? `Ligar App` : `Desligar App`}`)
                    .setEmoji(`1302021031866929224`)
                    .setStyle(`${status.status !== `running` ? 3 : 4}`),
                new ButtonBuilder()
                    .setCustomId(`${ids}_reiniciarapp`)
                    .setLabel(`Reiniciar Aplicação`)
                    .setStyle(2)
                    .setEmoji(`1297641351164203120`),
                new ButtonBuilder()
                    .setCustomId(`${ids}_outrasapp`)
                    .setLabel(`Alterar diversos`)
                    .setStyle(2)
                    .setEmoji(`1302021603915337879`)
            ];

            const actionRowRenovAdd = [
                new ButtonBuilder()
                    .setCustomId(`${produto}_${ids}_renovApp`)
                    .setLabel(`Renovar App`)
                    .setStyle(2)
                    .setEmoji(`1302019727471804416`)
                    .setDisabled(!api.get("mp"))
            ];

            if (addAppButton) {
                actionRowRenovAdd.push(addAppButton);
            }

            await interaction.editReply({
                content: "",
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({ name: `${interaction.guild.name} - Painel Gerenciamento`, iconURL: interaction.guild.iconURL() })
                        .addFields(
                            {
                                name: `${Emojis.get('permissions_emoji')} Aplicação`,
                                value: `\`${db2.get(`${ids}.nome`)}\``,
                                inline: false
                            },
                            {
                                name: `${Emojis.get('time_emoji')} Uptime`,
                                value: `${status.uptimeTimestamp === undefined ? `\`🔴 Bot está desligado.\`` : `<t:${Math.floor(status.uptimeTimestamp / 1000)}:R>`}`,
                                inline: false
                            },
                            {
                                name: `${Emojis.get('sinal')} Status`,
                                value: `${status.status === `running` ? `\`🟢 Online\`` : `\`🔴 Offline\``}`,
                                inline: false
                            },
                            {
                                name: `${Emojis.get('_staff_emoji')} ID App`,
                                value: `\`${db2.get(`${ids}.idapp`)}\``,
                                inline: false
                            },
                            {
                                name: `${Emojis.get('_diamond_emoji')} Plano Adquirido`,
                                value: `\`${db2.get(`${ids}.plano`)} | ${db2.get(`${ids}.dias`)}d\``,
                                inline: false
                            },
                            {
                                name: `${Emojis.get('calendario')} Data Expiraçao`,
                                value: `<t:${timestamp}:f> (<t:${timestamp}:R>)`,
                                inline: false
                            }
                        )
                        .setColor(`#2F3136`)
                        .setFooter({ text: `${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                        .setTimestamp()
                ],
                components: [
                    new ActionRowBuilder()
                        .addComponents(new StringSelectMenuBuilder()
                            .setCustomId(`appsconfig`)
                            .setPlaceholder(`🤖 Selecione uma Aplicacao`)
                            .addOptions([{
                                label: `${nome} - ${ids}`,
                                description: `${produto}`,
                                value: `${ids}`
                            }])
                        ),
                    new ActionRowBuilder().addComponents(actionRowComponents),
                    new ActionRowBuilder().addComponents(actionRowRenovAdd)
                ]
            });
        };
    }
}