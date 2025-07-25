const mercadopago = require("mercadopago");
const axios = require("axios");
const { JsonDatabase } = require("wio.db");
const { api, db2, auto, db1,Emojis, logs, perms, db } = require("../../databases/index");
const schedule = require('node-schedule');
const JSZip = require('jszip');
const path = require('path');
const fs = require("fs");
const { SquareCloudAPI } = require('@squarecloud/api');
const Discord = require("discord.js");
const pix = new JsonDatabase({ databasePath: "./config.json" });
const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ComponentType, ModalBuilder, TextInputBuilder } = require(`discord.js`);

module.exports = {
    name: "interactionCreate",
    run: async (interaction, client) => {
        const { customId } = interaction;
        if (!customId) return;

        if (customId === "selectGerenciamentDev") {

            const option = interaction.values[0];

            if (option === "ligarBotGrc") {

                const modal = new ModalBuilder()
                    .setCustomId("ligargrc_modal")
                    .setTitle("Ligar App");

                const text = new TextInputBuilder()
                    .setCustomId("text")
                    .setLabel("QUAL O APP-ID DA APLICAÇÃO?")
                    .setPlaceholder(`APP-ID AQUI`)
                    .setStyle(1)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(text));

                return interaction.showModal(modal);

            };


            if (option === "reiniciarBotGrc") {

                const modal = new ModalBuilder()
                    .setCustomId("reinicargrc_modal")
                    .setTitle("Reiniciar App");

                const text = new TextInputBuilder()
                    .setCustomId("text")
                    .setLabel("QUAL O APP-ID DA APLICAÇÃO?")
                    .setPlaceholder(`APP-ID AQUI`)
                    .setStyle(1)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(text));

                return interaction.showModal(modal);

            };


            if (option === "desligarBotGrc") {

                const modal = new ModalBuilder()
                    .setCustomId("desligargrc_modal")
                    .setTitle("Desligar App");

                const text = new TextInputBuilder()
                    .setCustomId("text")
                    .setLabel("QUAL O APP-ID DA APLICAÇÃO?")
                    .setPlaceholder(`APP-ID AQUI`)
                    .setStyle(1)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(text));

                return interaction.showModal(modal);

            };


            if (option === "statusBotGrc") {

                const modal = new ModalBuilder()
                    .setCustomId("statusgrc_modal")
                    .setTitle("Status App");

                const text = new TextInputBuilder()
                    .setCustomId("text")
                    .setLabel("QUAL O APP-ID DA APLICAÇÃO?")
                    .setPlaceholder(`APP-ID AQUI`)
                    .setStyle(1)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(text));

                return interaction.showModal(modal);

            };

        };


        if (customId === "consoleBotGrc") {

            const modal = new ModalBuilder()
                .setCustomId("consolegrc_modal")
                .setTitle("Console App");

            const text = new TextInputBuilder()
                .setCustomId("text")
                .setLabel("QUAL O APP-ID DA APLICAÇÃO?")
                .setPlaceholder(`APP-ID AQUI`)
                .setStyle(1)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(text));

            return interaction.showModal(modal);

        };

        const api1 = new SquareCloudAPI(await api.get(`square`));

        if (customId === "ligargrc_modal") {
            const text = interaction.fields.getTextInputValue("text");
            await interaction.reply({
                content: `${Emojis.get('loading')} Enviando requisição...`,
                ephemeral: true
            });

            await api1.applications.get(text).then(async (bot) => {
                await bot.start().then(async () => {
                    await interaction.editReply({ content: `${Emojis.get('checker')} Requisição bem sucedida!` }).catch(error => { });
                }).catch(async (error) => {
                    return await interaction.editReply({ content: `${Emojis.get('negative')} Ops... Erro na requisição!` }).catch(error => { });
                });
            }).catch(async (error) => {
                return await interaction.editReply({ content: `${Emojis.get('negative')} Ops... Erro na requisição!` }).catch(error => { });
            });

            const chanel = interaction.guild.channels.cache.get(await logs.get(`channel_logs`))
            if (chanel) {
                chanel.send({
                    content: `O Usuario: ${interaction.user} - \`${interaction.user.id}\` Inicio o APP-ID: \`${text}\``
                })
            }
        }


        if (customId === "reinicargrc_modal") {
            const text = interaction.fields.getTextInputValue("text");
            await interaction.reply({
                content: `${Emojis.get('loading')} Enviando requisição...`,
                ephemeral: true
            });

            await api1.applications.get(text).then(async (bot) => {
                await bot.restart().then(async () => {
                    await interaction.editReply({ content: `${Emojis.get('checker')} Requisição bem sucedida!` }).catch(error => { });
                }).catch(async (error) => {
                    return await interaction.editReply({ content: `${Emojis.get('negative')} Ops... Erro na requisição!` }).catch(error => { });
                });
            }).catch(async (error) => {
                return await interaction.editReply({ content: `${Emojis.get('negative')} Ops... Erro na requisição!` }).catch(error => { });
            });

            const chanel = interaction.guild.channels.cache.get(await logs.get(`channel_logs`))
            if (chanel) {
                chanel.send({
                    content: `O Usuario: ${interaction.user} - \`${interaction.user.id}\` Reinicio o APP-ID: \`${text}\``
                })
            }

        }

        if (customId === "desligargrc_modal") {
            const text = interaction.fields.getTextInputValue("text");
            await interaction.reply({
                content: `${Emojis.get('loading')} Enviando requisição...`,
                ephemeral: true
            });

            await api1.applications.get(text).then(async (bot) => {
                await bot.stop().then(async () => {
                    await interaction.editReply({ content: `${Emojis.get('checker')} Requisição bem sucedida!` }).catch(error => { });
                }).catch(async (error) => {
                    return await interaction.editReply({ content: `${Emojis.get('negative')} Ops... Erro na requisição!` }).catch(error => { });
                });
            }).catch(async (error) => {
                return await interaction.editReply({ content: `${Emojis.get('negative')} Ops... Erro na requisição!` }).catch(error => { });
            });

            const chanel = interaction.guild.channels.cache.get(await logs.get(`channel_logs`))
            if (chanel) {
                chanel.send({
                    content: `O Usuario: ${interaction.user} - \`${interaction.user.id}\` Parou o APP-ID: \`${text}\``
                })
            }

        }

        if (customId === "statusgrc_modal") {
            const text = interaction.fields.getTextInputValue("text");
            await interaction.reply({
                content: `${Emojis.get('loading')} Carregando...`,
                ephemeral: true
            });

            await api1.applications.get(text).then(async (bot) => {
                await bot.getStatus().then(async (asd) => {
                    await interaction.editReply({
                        content: ``,
                        embeds: [
                            new EmbedBuilder()
                                .setColor(`#00FF00`)
                                .setTitle("Informações do APP")
                                .setDescription(`**Status:** ${asd.status} \n **CPU:** ${asd.usage.cpu} \n **RAM:** ${asd.usage.ram} \n **Armazenamento:** ${asd.usage.storage} \n **Total de Rede:** ${asd.usage.network.total} \n **Agora na Rede:** ${asd.usage.network.now} \n **Requisições:** ${asd.requests} \n **Tempo de Atividade:** <t:${Math.floor(asd.uptimeTimestamp / 1000)}:f>`)
                        ]
                    });
                }).catch(async (error) => {
                    return await interaction.editReply({ content: `${Emojis.get('negative')} Ops... Erro ao puxar status!` }).catch(error => { });
                });
            }).catch(async (error) => {
                return await interaction.editReply({ content: `${Emojis.get('negative')} Ops... Erro na requisição!` }).catch(error => { });
            });
            const chanel = interaction.guild.channels.cache.get(await logs.get(`channel_logs`))
            if (chanel) {
                chanel.send({
                    content: `O Usuario: ${interaction.user} - \`${interaction.user.id}\` Olhou o Status do APP-ID: \`${text}\``
                })
            }

        }

        if (customId === "consolegrc_modal") {
            const text = interaction.fields.getTextInputValue("text");
            await interaction.reply({
                content: `${Emojis.get('loading')} Carregando...`,
                ephemeral: true
            });

            await api1.applications.get(text).then(async (bot) => {
                await bot.getLogs().then(async (asd) => {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription("```js\n" + asd + "```")
                                .setColor(`#2F3136`)
                        ],
                        ephemeral: true
                    });
                }).catch(async (error) => {
                    return await interaction.editReply({ content: `${Emojis.get('negative')} Ops... Erro ao puxar console!` }).catch(error => { });
                });
            }).catch(async (error) => {
                return await interaction.editReply({ content: `${Emojis.get('negative')} Ops... Erro na requisição!` }).catch(error => { });
            });

            const chanel = interaction.guild.channels.cache.get(await logs.get(`channel_logs`))
            if (chanel) {
                chanel.send({
                    content: `O Usuario: ${interaction.user} - \`${interaction.user.id}\` Olhou o console do APP-ID: \`${text}\``
                })
            }
        }

    }
}