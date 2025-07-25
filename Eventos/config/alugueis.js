const mercadopago = require(`mercadopago`);
const axios = require(`axios`);
const { JsonDatabase } = require("wio.db");
const { api, db2, auto, db1, logs,Emojis, perms, db } = require("../../databases/index");
const schedule = require('node-schedule');
const JSZip = require('jszip');
const path = require('path');
const fs = require(`fs`);
const { SquareCloudAPI } = require('@squarecloud/api');
const Discord = require(`discord.js`);
const pix = new JsonDatabase({ databasePath: `./config.json` });
const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ComponentType, ModalBuilder, TextInputBuilder } = require(`discord.js`)
module.exports = {
    name: `interactionCreate`,
    run: async (interaction, client) => {
        const customId = interaction.customId

        if (interaction.isButton() && interaction.customId.endsWith(`_altBannerEmbedP`)) {
            const id = customId.split(`_`)[0];
            const modal = new ModalBuilder()
                .setCustomId(`${id}_embed_banner_url_modal`)
                .setTitle(`Alterar banner`);
            const text = new TextInputBuilder()
                .setCustomId(`text`)
                .setLabel(`Qual será o novo banner?`)
                .setStyle(1)
                .setPlaceholder(`Coloque URL`)
                .setRequired(true)

            modal.addComponents(new ActionRowBuilder().addComponents(text))

            await interaction.showModal(modal)
        }

        if (interaction.isModalSubmit() && interaction.customId.endsWith(`embed_banner_url_modal`)) {
            const text = interaction.fields.getTextInputValue(`text`);

            const id = customId.split(`_`)[0];

            await db.set(`${id}.banner`, text)

            personalizarConfig()

        };

        if (interaction.isButton() && interaction.customId.endsWith(`_altDescEmbedP`)) {
            const id = customId.split(`_`)[0];

            const modal = new ModalBuilder()
                .setCustomId(`${id}_embed_desc_modal`)
                .setTitle(`Alterar Descrição`);
            const text = new TextInputBuilder()
                .setCustomId(`text`)
                .setLabel(`Qual será a Nova Descrição?`)
                .setStyle(2)
                .setRequired(true)

            modal.addComponents(new ActionRowBuilder().addComponents(text))

            await interaction.showModal(modal)
        }

        if (interaction.isModalSubmit() && interaction.customId.endsWith(`_embed_desc_modal`)) {
            const id = customId.split(`_`)[0];

            const text = interaction.fields.getTextInputValue(`text`);

            await db.set(`${id}.preco.embed.desc`, text);


            personalizarConfig()

        }

        if (interaction.isButton() && interaction.customId.endsWith(`_altContent`)) {
            const id = customId.split(`_`)[0];

            const modal = new ModalBuilder()
                .setCustomId(`${id}_modalContentAlt`)
                .setTitle(`Alterar Content`)

            const content = new TextInputBuilder()
                .setCustomId(`contentText`)
                .setLabel(`QUAL SERÁ A NOVA CONTENT?`)
                .setPlaceholder(`Coloque a mensagem aqui`)
                .setRequired(true)
                .setStyle(`Paragraph`)
                .setMaxLength(3500)

            const contentConst = new ActionRowBuilder().addComponents(content);

            modal.addComponents(contentConst);
            await interaction.showModal(modal);

        }

        if (interaction.isModalSubmit() && interaction.customId.endsWith(`modalContentAlt`)) {
            const id = customId.split(`_`)[0];

            const contentText = interaction.fields.getTextInputValue("contentText")

            db.set(`${id}.preco.content.content`, contentText);
            personalizarConfig()
        }

        if (interaction.isButton() && interaction.customId.endsWith(`_altTitleEmbedP`)) {
            const id = customId.split(`_`)[0];
            const modal = new ModalBuilder()
                .setCustomId(`${id}_embed_titulo_modal`)
                .setTitle(`Alterar Titulo`);
            const text = new TextInputBuilder()
                .setCustomId(`text`)
                .setLabel(`Qual será o novo titulo?`)
                .setStyle(1)
                .setRequired(true)

            modal.addComponents(new ActionRowBuilder().addComponents(text))

            await interaction.showModal(modal)
        }

        if (interaction.isModalSubmit() && interaction.customId.endsWith(`embed_titulo_modal`)) {
            const id = customId.split(`_`)[0];
            const text = interaction.fields.getTextInputValue(`text`)
            await db.set(`${id}.preco.embed.titulo`, text)

            personalizarConfig()

        }


        if (interaction.isButton() && interaction.customId.endsWith(`_altColorsEmbedP`)) {
            const id = customId.split(`_`)[0];
            const modal = new ModalBuilder()
                .setCustomId(`${id}_embed_color_hex_modal`)
                .setTitle(`Alterar Cor da Embed`);
            const text = new TextInputBuilder()
                .setCustomId(`text`)
                .setLabel(`Coloque a cor em hexadecimal!`)
                .setStyle(1)
                .setRequired(true)

            modal.addComponents(new ActionRowBuilder().addComponents(text))

            await interaction.showModal(modal)
        }
        if (interaction.isModalSubmit() && interaction.customId.endsWith(`embed_color_hex_modal`)) {
            const id = customId.split(`_`)[0];
            const text = interaction.fields.getTextInputValue(`text`)
            function isValidHexColor(hexColor) {
                return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexColor);
            }

            if (!isValidHexColor(text)) {
                interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`❌ | Coloque um valor hexadecimal verdadeiro!`)
                    ],
                    ephemeral: true
                })
                return;
            }
            await db.set(`${id}.preco.embed.cor`, text)

            personalizarConfig()

        };

        if (interaction.isButton() && interaction.customId.endsWith(`_commitSourceP`)) {
            const id = interaction.customId.split("_")[0];

            const modal = new ModalBuilder()
                .setCustomId(`${id}_modalNextSource`)
                .setTitle(`Confirmar Continuação`)

            const sim = new TextInputBuilder()
                .setCustomId(`confimEnvio`)
                .setLabel(`DIGITE (SIM) PARA CONFIRMAR`)
                .setPlaceholder(`SIM`)
                .setRequired(true)
                .setStyle("Short")
                .setMinLength(3)
                .setMaxLength(3)

            const simConst = new ActionRowBuilder().addComponents(sim)

            modal.addComponents(simConst);
            await interaction.showModal(modal);

        };

        if (interaction.isModalSubmit() && interaction.customId.endsWith(`modalNextSource`)) {
            const id = interaction.customId.split("_")[0];

            const confirmText = interaction.fields.getTextInputValue("confimEnvio").toLowerCase()

            if (confirmText !== "sim") { return interaction.reply({ content: `${Emojis.get('warn_emoji')} Tente novamente! Você escreveu **SIM** incorretamente`, ephemeral: true }) }

            if (confirmText === "sim") {

                const msg = await interaction.update({
                    content: `${interaction.user}`,
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: `${interaction.user.username} - Enviar Arquivo Bot (ALUGUEL)`, iconURL: interaction.user.displayAvatarURL() })
                            .setDescription(`-# \`📁\` Coletando arquivo **.zip**!`)
                            .addFields(
                                { name: `Formatação`, value: `\`.zip\``, inline: true },
                                { name: `Necessário`, value: `\`package.json/squarecloud.config\``, inline: true }
                            )
                            .setColor(`#FFFF00`)
                            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                            .setTimestamp()
                    ],
                    components: []
                });

                const collector = interaction.channel.createMessageCollector({
                    filter: m => m.attachments.first() && m.attachments.first().name.endsWith('.zip'),
                    max: 1,
                });

                collector.on('collect', async (message) => {
                    if (message.author.id !== interaction.user.id) return;
                    const attachment = message.attachments.first();
                    const zip = new JSZip();


                    const data = await fetch(attachment.url).then(res => res.arrayBuffer());
                    const zipFile = await zip.loadAsync(data);

                    msg.edit({
                        content: `${Emojis.get('loading')} Aguarde... Estamos verificando o arquivo enviado!`,
                        embeds: [],
                        components: []
                    });

                    message.delete().catch(error => { });
                    if (zipFile.files['package.json'] && (zipFile.files['squarecloud.config'] || zipFile.files['squarecloud.app'])) {
                        const packageJson = JSON.parse(await zipFile.file('package.json').async('string'));

                        zipFile.file('package.json', JSON.stringify(packageJson));

                        const dir = './source';
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir);
                        };

                        fs.writeFileSync(`${dir}/${id}.zip`, await zipFile.generateAsync({ type: `nodebuffer` }))

                        msg.edit({
                            content: `${Emojis.get('checker')} Pronto! Sua source de aluguel \`${id}\` teve suas informações alteradas com êxito.`,
                            embeds: [],
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId(`${id}_volatasd`)
                                            .setEmoji(`1246953097033416805`)
                                            .setStyle(2)
                                    )
                            ]
                        });
                    } else {
                        msg.edit({
                            content: `${Emojis.get('negative')} Ops... Infelizmente a source \`${id}\` está com algum problema.\n\n-# Verifique se o BOT tenha **package.json** ou **squarecloud.app/squarecloud.config**!`,
                            embeds: [],
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId(`${id}_volatasd`)
                                            .setStyle(2)
                                            .setEmoji(`1246953097033416805`)
                                    )
                            ]
                        })
                    }
                });

            };

        };

        if (interaction.isButton() && interaction.customId.endsWith(`_altType`)) {
            const id = customId.split(`_`)[0];

            if (db.get(`${id}.type`) === "embed") {
                await db.set(`${id}.type`, "content");
                personalizarConfig();
            } else if (db.get(`${id}.type`) === "content") {
                await db.set(`${id}.type`, "embed");
                personalizarConfig();
            }
        }

        if (interaction.isButton() && interaction.customId.endsWith(`_altValoresP`)) {

            precosConfig()

        }

        if (interaction.isButton() && interaction.customId.endsWith(`_altEmbedP`)) {
            const id = customId.split(`_`)[0];

            personalizarConfig()

        }

        if (interaction.isButton() && interaction.customId.endsWith("_altPreviewEmbedP")) {
            const id = customId.split(`_`)[0];

            const modal = new ModalBuilder()
                .setCustomId(`${id}_preview`)
                .setTitle("💢 - Alterar Preview do [PRODUTO]");
            const text = new TextInputBuilder()
                .setCustomId("text")
                .setStyle(1)
                .setLabel("Coloque a URL do preview!")
                .setPlaceholder(`Digite: "remover" para podê retirar`);

            modal.addComponents(new ActionRowBuilder().addComponents(text));
            return interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.endsWith("_preview")) {
            const id = customId.split(`_`)[0];

            const text = interaction.fields.getTextInputValue(`text`)
            if (text === "remover") {
                interaction.reply({
                    content: `O Botão de preview foi removido com sucesso!`,
                    ephemeral: true,
                });
                return;
            }
            try {
                interaction.reply({
                    content: `Seu Novo botão de preview:`,
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setStyle(5)
                                    .setURL(text)
                                    .setLabel("PREVIEW")
                            )
                    ],
                    ephemeral: true
                }).then(() => {
                    db.set(`${id}.link`, text);
                })
            } catch {
                interaction.reply({
                    content: `Coloque um Link valido!`,
                    ephemeral: true
                })
            }
        };

        if (interaction.isButton() && interaction.customId.endsWith(`_volatasd`)) {
            const id = interaction.customId.split(`_`)[0];

            interaction.update({
                content: ``,
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.username} - Gerenciando Bots Alugueis Existentes`, iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(`-# \`🔧\` Gerenciamento dos **Bots Alugueis Existentes**.`)
                        .addFields(
                            { name: `Bot Aluguel`, value: `\`${id}\``, inline: true }
                        )
                        .setColor(`#00FFFF`)
                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                        .setTimestamp()
                ],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`${id}_altEmbedP`).setLabel(`Comércio`).setEmoji(`1302021583128231946`).setStyle(1),
                            new ButtonBuilder().setCustomId(`${id}_altValoresP`).setLabel(`Valores`).setEmoji(`1302019727471804416`).setStyle(3),
                            new ButtonBuilder().setCustomId(`${id}_commitSourceP`).setLabel(`Commit`).setEmoji(`1302018409701052501`).setStyle(2)
                        )
                ]
            });
        };

        if (interaction.isButton() && interaction.customId.endsWith("_anualConfigPreco")) {
            const id = customId.split("_")[0];

            anualConfigPreco(id);
        };

        if (interaction.isButton() && interaction.customId.endsWith("_onOffAnual")) {
            const id = customId.split("_")[0];

            const sistema = await db.get(`${id}.preco.anual.onoff`);

            if (sistema) {
                await db.set(`${id}.preco.anual.onoff`, false);
            } else {
                await db.set(`${id}.preco.anual.onoff`, true);
            };

            anualConfigPreco(id);

        };

        if (interaction.isButton() && interaction.customId.endsWith("_anualPrecoConfig")) {
            const id = customId.split("_")[0];

            const modal = new ModalBuilder()
            .setCustomId(`${id}_modalAnualPrecoC`)
            .setTitle(`Preço Plano Anual`)

            const option1 = new TextInputBuilder()
            .setCustomId(`preco`)
            .setLabel(`QUAL SERÁ O VALOR DO PLANO ANUAL?`)
            .setPlaceholder(`EX: 10`)
            .setStyle("Short")

            const optionx1 = new ActionRowBuilder().addComponents(option1);

            modal.addComponents(optionx1);
            await interaction.showModal(modal);

        };

        if (interaction.isModalSubmit() && interaction.customId.endsWith("_modalAnualPrecoC")) {
            const preco = interaction.fields.getTextInputValue("preco");

            const id = customId.split("_")[0];

            if (isNaN(preco)) {
                return interaction.reply({ content: `${Emojis.get('negative')} O valor está incorreto.`, ephemeral: true });
            };

            if (preco < 0.01) {
                return interaction.reply({ content: `${Emojis.get('negative')} O valor não pode ser menos que 0.01!`, ephemeral: true });
            };

            await db.set(`${id}.preco.anual.preco`, Number(preco));
            anualConfigPreco(id);

        };

        if (interaction.isButton() && interaction.customId.endsWith("_trimenConfigPreco")) {
            const id = customId.split("_")[0];

            trimenConfigPreco(id);
        };

        if (interaction.isButton() && interaction.customId.endsWith("_onOffTrimen")) {
            const id = customId.split("_")[0];

            const sistema = await db.get(`${id}.preco.trimensal.onoff`);

            if (sistema) {
                await db.set(`${id}.preco.trimensal.onoff`, false);
            } else {
                await db.set(`${id}.preco.trimensal.onoff`, true);
            };

            trimenConfigPreco(id);

        };

        if (interaction.isButton() && interaction.customId.endsWith("_trimenPrecoConfig")) {
            const id = customId.split("_")[0];

            const modal = new ModalBuilder()
            .setCustomId(`${id}_modalTrimenPrecoC`)
            .setTitle(`Preço Plano Trimensal`)

            const option1 = new TextInputBuilder()
            .setCustomId(`preco`)
            .setLabel(`QUAL SERÁ O VALOR DO PLANO TRIMENSAL?`)
            .setPlaceholder(`EX: 8.50`)
            .setStyle("Short")

            const optionx1 = new ActionRowBuilder().addComponents(option1);

            modal.addComponents(optionx1);
            await interaction.showModal(modal);

        };

        if (interaction.isModalSubmit() && interaction.customId.endsWith("_modalTrimenPrecoC")) {
            const preco = interaction.fields.getTextInputValue("preco");

            const id = customId.split("_")[0];

            if (isNaN(preco)) {
                return interaction.reply({ content: `${Emojis.get('negative')} O valor está incorreto.`, ephemeral: true });
            };

            if (preco < 0.01) {
                return interaction.reply({ content: `${Emojis.get('negative')} O valor não pode ser menos que 0.01!`, ephemeral: true });
            };

            await db.set(`${id}.preco.trimensal.preco`, Number(preco));
            trimenConfigPreco(id);

        };

        if (interaction.isButton() && interaction.customId.endsWith("_mensalConfigPreco")) {
            const id = customId.split("_")[0];

            mensalConfigPreco(id);
        };

        if (interaction.isButton() && interaction.customId.endsWith("_onOffMensal")) {
            const id = customId.split("_")[0];

            const sistema = await db.get(`${id}.preco.mensal.onoff`);

            if (sistema) {
                await db.set(`${id}.preco.mensal.onoff`, false);
            } else {
                await db.set(`${id}.preco.mensal.onoff`, true);
            };

            mensalConfigPreco(id);

        };

        if (interaction.isButton() && interaction.customId.endsWith("_mensalPrecoConfig")) {
            const id = customId.split("_")[0];

            const modal = new ModalBuilder()
            .setCustomId(`${id}_modalMensalPrecoC`)
            .setTitle(`Preço Plano Mensal`)

            const option1 = new TextInputBuilder()
            .setCustomId(`preco`)
            .setLabel(`QUAL SERÁ O VALOR DO PLANO MENSAL?`)
            .setPlaceholder(`EX: 5`)
            .setStyle("Short")

            const optionx1 = new ActionRowBuilder().addComponents(option1);

            modal.addComponents(optionx1);
            await interaction.showModal(modal);

        };

        if (interaction.isModalSubmit() && interaction.customId.endsWith("_modalMensalPrecoC")) {
            const preco = interaction.fields.getTextInputValue("preco");

            const id = customId.split("_")[0];

            if (isNaN(preco)) {
                return interaction.reply({ content: `${Emojis.get('negative')} O valor está incorreto.`, ephemeral: true });
            };

            if (preco < 0.01) {
                return interaction.reply({ content: `${Emojis.get('negative')} O valor não pode ser menos que 0.01!`, ephemeral: true });
            };

            await db.set(`${id}.preco.mensal.preco`, Number(preco));
            mensalConfigPreco(id);

        };

        async function personalizarConfig() {
            const id = customId.split(`_`)[0];

            if (db.get(`${id}.type`) === "embed") {

                const embed = new EmbedBuilder()
                    .setTitle(`${db.get(`${id}.preco.embed.titulo`)}`)
                    .setDescription(`${db.get(`${id}.preco.embed.desc`)}`)
                    .setColor(`${db.get(`${id}.preco.embed.cor`)}`)

                if (db.get(`${id}.banner`)) {
                    embed.setImage(db.get(`${id}.banner`))
                };

                interaction.update({
                    content: ``,
                    embeds: [embed],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`${id}_altTitleEmbedP`)
                                    .setStyle(1)
                                    .setLabel(`Personalizar Titulo`)
                                    .setEmoji(`1302019715727626260`),
                                new ButtonBuilder()
                                    .setCustomId(`${id}_altDescEmbedP`)
                                    .setStyle(1)
                                    .setLabel(`Personalizar Descrição`)
                                    .setEmoji(`1302020457276375050`),
                                new ButtonBuilder()
                                    .setCustomId(`${id}_altColorsEmbedP`)
                                    .setStyle(1)
                                    .setLabel(`Personalizar Cor`)
                                    .setEmoji(`1294425656796381219`)
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`${id}_altBannerEmbedP`)
                                    .setStyle(1)
                                    .setLabel(`Personalizar Banner`)
                                    .setEmoji(`1246953177002278972`),
                                new ButtonBuilder()
                                    .setCustomId(`${id}_altPreviewEmbedP`)
                                    .setStyle(1)
                                    .setLabel(`Preview (VÍDEO)`)
                                    .setEmoji(`1302020475760934973`),
                                new ButtonBuilder()
                                    .setCustomId(`${id}_altType`)
                                    .setStyle(2)
                                    .setLabel(db.get(`${id}.type`) === "embed" ? "Mode Content" : "Mode Embed")
                                    .setEmoji(`1297641351164203120`)
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`${id}_volatasd`)
                                    .setEmoji(`1246953097033416805`)
                                    .setStyle(2)
                            )

                    ]
                });

            };

            if (db.get(`${id}.type`) === "content") {

                interaction.update({
                    content: db.get(`${id}.preco.content.content`),
                    embeds: [],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`${id}_altContent`)
                                    .setStyle(1)
                                    .setLabel(`Personalizar Content`)
                                    .setEmoji(`1302020493779402872`),
                                new ButtonBuilder()
                                    .setCustomId(`${id}_altBannerEmbedP`)
                                    .setStyle(1)
                                    .setLabel(`Personalizar Banner`)
                                    .setEmoji(`1246953177002278972`),
                                new ButtonBuilder()
                                    .setCustomId(`${id}_altPreviewEmbedP`)
                                    .setStyle(1)
                                    .setLabel(`Preview (VÍDEO)`)
                                    .setEmoji(`1302020475760934973`)
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`${id}_altType`)
                                    .setStyle(2)
                                    .setLabel(db.get(`${id}.type`) === "embed" ? "Mode Content" : "Mode Embed")
                                    .setEmoji(`1297641351164203120`),
                                new ButtonBuilder()
                                    .setCustomId(`${id}_volatasd`)
                                    .setEmoji(`1246953097033416805`)
                                    .setStyle(2)
                            )

                    ]
                })

            };

        };

        async function precosConfig() {

            const id = customId.split(`_`)[0];

            interaction.update({
                content: ``,
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.username} - Gerenciando Valores de Aluguel`, iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(`-# \`💸\` Gerenciamento dos **Valores de Aluguel**.`)
                        .addFields(
                            { name: `Anual`, value: `\`${db.get(`${id}.preco.anual.onoff`) ? `\`🟢 Ativo | R$${Number(db.get(`${id}.preco.anual.preco`)).toFixed(2)}\`` : "\`🔴 Desativo\`"}\``, inline: true },
                            { name: `Trimensal`, value: `\`${db.get(`${id}.preco.trimensal.onoff`) ? `\`🟢 Ativo | R$${Number(db.get(`${id}.preco.trimensal.preco`)).toFixed(2)}\`` : "\`🔴 Desativo\`"}\``, inline: true },
                            { name: `Mensal`, value: `\`${db.get(`${id}.preco.mensal.onoff`) ? `\`🟢 Ativo | R$${Number(db.get(`${id}.preco.mensal.preco`)).toFixed(2)}\`` : "\`🔴 Desativo\`"}\``, inline: true }
                        )
                        .setColor(`#00FFFF`)
                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                        .setTimestamp()
                ],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`${id}_anualConfigPreco`).setLabel(`Plano Anual`).setEmoji(`1302020457276375050`).setStyle(1),
                            new ButtonBuilder().setCustomId(`${id}_trimenConfigPreco`).setLabel(`Plano Trimensal`).setEmoji(`1302020457276375050`).setStyle(1),
                            new ButtonBuilder().setCustomId(`${id}_mensalConfigPreco`).setLabel(`Plano Mensal`).setEmoji(`1302020457276375050`).setStyle(1)
                        ),
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`${id}_volatasd`)
                                .setEmoji(`1246953097033416805`)
                                .setStyle(2)
                        )
                ]
            });

        };

        async function anualConfigPreco(id) {

            const sistema = await db.get(`${id}.preco.anual.onoff`);

            interaction.update({
                content: `${interaction.user}`,
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.username} - Gerenciando Aluguel Anual`, iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(`-# \`📅\` Gerenciamento do **Aluguel Anual**.`)
                        .addFields(
                            { name: `Sistema`, value: `\`${sistema ? "\`🟢 Ativo\`" : "\`🔴 Desativo\`"}\``, inline: true },
                            { name: `Valor`, value: `\`R$${Number(db.get(`${id}.preco.anual.preco`)).toFixed(2)}\``, inline: true }
                        )
                        .setColor(`#00FFFF`)
                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                        .setTimestamp()
                ],
                components: [
                    new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`${id}_onOffAnual`).setLabel(sistema ? "Ativado" : "Desativado").setEmoji(sistema ? "1236021048470933575" : "1236021106662707251").setStyle(sistema ? 3 : 4),
                        new ButtonBuilder().setCustomId(`${id}_anualPrecoConfig`).setLabel(`Mudar Valor`).setEmoji(`1302019727471804416`).setStyle(1)
                    ),
                    new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`${id}_altValoresP`).setEmoji(`1246953097033416805`).setStyle(2)
                    )
                ],
                ephemeral: true
            });

        };

        async function trimenConfigPreco(id) {

            const sistema = await db.get(`${id}.preco.trimensal.onoff`);

            interaction.update({
                content: `${interaction.user}`,
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.username} - Gerenciando Aluguel Trimensal`, iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(`-# \`📅\` Gerenciamento do **Aluguel Trimensal**.`)
                        .addFields(
                            { name: `Sistema`, value: `\`${sistema ? "\`🟢 Ativo\`" : "\`🔴 Desativo\`"}\``, inline: true },
                            { name: `Valor`, value: `\`R$${Number(db.get(`${id}.preco.trimensal.preco`)).toFixed(2)}\``, inline: true }
                        )
                        .setColor(`#00FFFF`)
                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                        .setTimestamp()
                ],
                components: [
                    new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`${id}_onOffTrimen`).setLabel(sistema ? "Ativado" : "Desativado").setEmoji(sistema ? "1236021048470933575" : "1236021106662707251").setStyle(sistema ? 3 : 4),
                        new ButtonBuilder().setCustomId(`${id}_trimenPrecoConfig`).setLabel(`Mudar Valor`).setEmoji(`1302019727471804416`).setStyle(1)
                    ),
                    new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`${id}_altValoresP`).setEmoji(`1246953097033416805`).setStyle(2)
                    )
                ],
                ephemeral: true
            });

        };

        async function mensalConfigPreco(id) {

            const sistema = await db.get(`${id}.preco.mensal.onoff`);

            interaction.update({
                content: `${interaction.user}`,
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.username} - Gerenciando Aluguel Mensal`, iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(`-# \`📅\` Gerenciamento do **Aluguel Mensal**.`)
                        .addFields(
                            { name: `Sistema`, value: `\`${sistema ? "\`🟢 Ativo\`" : "\`🔴 Desativo\`"}\``, inline: true },
                            { name: `Valor`, value: `\`R$${Number(db.get(`${id}.preco.mensal.preco`)).toFixed(2)}\``, inline: true }
                        )
                        .setColor(`#00FFFF`)
                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                        .setTimestamp()
                ],
                components: [
                    new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`${id}_onOffMensal`).setLabel(sistema ? "Ativado" : "Desativado").setEmoji(sistema ? "1236021048470933575" : "1236021106662707251").setStyle(sistema ? 3 : 4),
                        new ButtonBuilder().setCustomId(`${id}_mensalPrecoConfig`).setLabel(`Mudar Valor`).setEmoji(`1302019727471804416`).setStyle(1)
                    ),
                    new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`${id}_altValoresP`).setEmoji(`1246953097033416805`).setStyle(2)
                    )
                ],
                ephemeral: true
            });

        };

    }
}