const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ChannelType, EmbedBuilder, ModalBuilder, TextInputBuilder } = require("discord.js");
const { api, db2, auto, db1, logs, Emojis, perms, db } = require("../../databases/index");

module.exports = {
    name: `interactionCreate`,

    run: async (interaction, client) => {
        const { customId } = interaction;
        if (!customId) return;

        let id = interaction.customId.split("_")[0];

        if (customId.endsWith("_buy")) {

            const sistemaM = await db.get(`${id}.preco.mensal.onoff`);
            const sistemaT = await db.get(`${id}.preco.trimensal.onoff`);
            const sistemaA = await db.get(`${id}.preco.anual.onoff`);

            if (!logs.get("sistema")) {
                return interaction.reply({ content: `${Emojis.get(`negative`)} Ops... O sistema de aluguel está atualmente fora de serviço.`, ephemeral: true });
            };

            if (!api.get("sistemaMp") && !logs.get("semi.sistema")) {
                return interaction.reply({ content: `${Emojis.get(`negative`)}  Todos os metodos de pagamento estão desativados.`, ephemeral: true });
            };

            if (!api.get("mp") && !logs.get("semi.tipo")) {
                return interaction.reply({ content: `${Emojis.get(`negative`)}  Todos os metodos de pagamento estão mal configurados.`, ephemeral: true });
            };

            if (!sistemaM && !sistemaT && !sistemaA) {
                return interaction.reply({ content: `${Emojis.get(`negative`)}  Todos os planos estão offline no momento.`, ephemeral: true });
            };


            interaction.reply({
                content: `# ${interaction.guild.name} - Seleçao de Planos\n> - **Escolha qual plano voce ira querer logo abaixo.**`,
                embeds: [],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`${id}_selectPlano`)
                                .setPlaceholder(`💻 Selecione o Plano Clicando Aqui`)
                                .addOptions(
                                    {
                                        value: `mensalPlanBuy`,
                                        label: `Mensal`,
                                        description: `R$${Number(db.get(`${id}.preco.mensal.preco`)).toFixed(2)}`,
                                        emoji: `${Emojis.get(`sifrao`)}`
                                    },
                                    {
                                        value: `trimenPlanBuy`,
                                        label: `Trimensal`,
                                        description: `R$${Number(db.get(`${id}.preco.trimensal.preco`)).toFixed(2)}`,
                                        emoji: `${Emojis.get(`sifrao`)}`
                                    },
                                    {
                                        value: `anualPlanBuy`,
                                        label: `Anual`,
                                        description: `R$${Number(db.get(`${id}.preco.anual.preco`)).toFixed(2)}`,
                                        emoji: `${Emojis.get(`sifrao`)}`
                                    }
                                )
                        )
                ],
                ephemeral: true
            });

        };

if (customId.endsWith("_selectPlano")) {

    const option = interaction.values[0];


    if (option === "mensalPlanBuy") {

        const sistemaM = await db.get(`${id}.preco.mensal.onoff`);

        if (!sistemaM) {
            return interaction.reply({ content: `${Emojis.get(`negative`)}  O plano está atualmente desativado para alugueis.`, ephemeral: true });
        };

        const exist = interaction.channel.threads.cache.find(thread => thread.name === `🛒・${interaction.user.username}`);

        if (exist) {
            return interaction.reply({ content: `${Emojis.get(`negative`)}  Você já tem um canal aberto em ${exist.url}`, ephemeral: true });
        };

        if (!interaction.message.channel.permissionsFor(client.user).has("CreatePrivateThreads")) {
            return interaction.reply({ content: `${Emojis.get(`negative`)}  Eu não consigo abrir um tópico!`, ephemeral: true });
        };

        // Envia a mensagem de "loading" antes de iniciar a criação do carrinho
        await interaction.reply({ content: `${Emojis.get(`loading`)} Criando seu Carrinho Aguarde um Momento...`, ephemeral: true });

        const permission = logs.get("roleAprove") ? [
            {
                id: interaction.guild.roles.cache.find(role => role.id === logs.get("roleAprove")),
                allow: ['VIEW_CHANNEL']
            }
        ] : [];

        interaction.channel.threads.create({
            name: `🛒・${interaction.user.username}`,
            type: ChannelType.PrivateThread,
            reason: 'Needed a separate thread for moderation',
            autoArchiveDuration: 60,
            permissionOverwrites: permission
        }).then(async (thread) => {

            // Após criar o carrinho, edita a mensagem com o botão do link e confirmação
            await interaction.editReply({
                content: `${Emojis.get(`checker`)}  Carrinho criado com êxito.`,
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setURL(thread.url)
                                .setLabel(`・Ir Para o Carrinho`)
                                .setStyle(5)
                                .setEmoji(`${Emojis.get(`_cart_emoji`)}`)
                        )
                ]
            });
                    thread.send({
                        content: `# Finalizando suas Compras\n👋 Olá, ${interaction.user} Por favor, escolha no botão abaixo o que deseja fazer.\n\n- \`📦\` Produtos no Carrinho: \`${id}\`\n- \`📡\` Plano: \`x1 | Mensal/30d\`\n- \`💰\` Valor da Assinatura: \`R$${Number(db.get(`${id}.preco.mensal.preco`)).toFixed(2)}\`\n- \`🏷️\` Cupom de desconto: \`Não aplicado\`\n\n> - \`🔧\` Utilize os botoes abaixo para gerenciar seu carrinho, caso tiver duvidas nao hesite em entrar em contato com o suporte`,
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`${id}_semiAutoPay`).setLabel(`Prosseguir para o Pagamento`).setEmoji(`<:payments_24dp_E3E3E3_FILL0_wght4:1385829310220468365>`).setStyle(3),
                                    new ButtonBuilder().setCustomId(`${id}_Mensal_editEstoque`).setLabel(`Editar Tempo da Assinatura`).setEmoji(`<:event_upcoming_24dp_E3E3E3_FILL0:1385829543901659147>`).setStyle(2),
                                    new ButtonBuilder().setCustomId(`${id}_Mensal_cancel`).setEmoji(`${Emojis.get(`_trash_emoji`)}`).setStyle(2)
                                )
                        ]
                    }).then(send => {
                        db1.set(thread.id, {
                            quantia: 1,
                            userid: interaction.user.id,
                            aluguel: id,
                            plano: "Mensal",
                            dias: 30,
                            status: "proccess",
                            msg: {
                                id: send.id,
                                channel: interaction.channel.id,
                                guild: interaction.guild.id
                            }
                        });

                        if (logs.get("channel_logs")) {
                            const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));

                            channel.send({
                                content: ``,
                                embeds: [
                                    new EmbedBuilder()
                                        .setAuthor({ name: `${interaction.user.username} - Pendência Criada`, iconURL: interaction.user.displayAvatarURL() })
                                        .setDescription(`-# \`📋\` Pendência criada com êxito.`)
                                        .addFields(
                                            { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.mensal.preco`)).toFixed(2)}\``, inline: true },
                                            { name: `Plano`, value: `\`x1 | Mensal/30d\``, inline: true },
                                            { name: `Canal/User`, value: `${thread.url} | ${interaction.user}` }
                                        )
                                        .setColor(`#00FF00`)
                                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                        .setTimestamp()
                                ],
                                components: [
                                    new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder().setCustomId(`botN`).setLabel(`Mensagem do Sistema`).setStyle(2).setDisabled(true)
                                        )
                                ]
                            }).catch(error => { });

                        };
                    }).catch(error => { });
                });

            };

    if (option === "trimenPlanBuy") {

    const sistemaT = await db.get(`${id}.preco.trimensal.onoff`);

    if (!sistemaT) {
        return interaction.reply({ content: `${Emojis.get(`negative`)}  O plano está atualmente desativado para alugueis.`, ephemeral: true });
    };

    const exist = interaction.channel.threads.cache.find(thread => thread.name === `🛒・${interaction.user.username}`);

    if (exist) {
        return interaction.reply({ content: `${Emojis.get(`negative`)}  Você já tem um canal aberto em ${exist.url}`, ephemeral: true });
    };

    if (!interaction.message.channel.permissionsFor(client.user).has("CreatePrivateThreads")) {
        return interaction.reply({ content: `${Emojis.get(`negative`)}  Eu não consigo abrir um tópico!`, ephemeral: true });
    };

    // Envia a mensagem de "loading" antes de iniciar a criação do carrinho
    await interaction.reply({ content: `${Emojis.get(`loading`)} Criando seu Carrinho Aguarde um Momento...`, ephemeral: true });

    const permission = logs.get("roleAprove") ? [
        {
            id: interaction.guild.roles.cache.find(role => role.id === logs.get("roleAprove")),
            allow: ['VIEW_CHANNEL']
        }
    ] : [];

    interaction.channel.threads.create({
        name: `🛒・${interaction.user.username}`,
        type: ChannelType.PrivateThread,
        reason: 'Needed a separate thread for moderation',
        autoArchiveDuration: 60,
        permissionOverwrites: permission
    }).then(async (thread) => {

        // Após criar o carrinho, edita a mensagem com o botão do link e confirmação
        await interaction.editReply({
            content: `${Emojis.get(`checker`)}  Aluguel trimensal criado com êxito.`,
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setURL(thread.url)
                            .setLabel(`・Ir Para o Carrinho`)
                            .setStyle(5)
                            .setEmoji(`${Emojis.get(`_cart_emoji`)}`)
                    )
            ]
        });
                    thread.send({
                        content: `# Finalizando suas Compras\n👋 Olá, ${interaction.user} Por favor, escolha no botão abaixo o que deseja fazer.\n\n- \`📦\` Produtos no Carrinho: \`${id}\`\n- \`📡\` Plano: \`x1 | Trimensal/90d\`\n- \`💰\` Valor da Assinatura: \`R$${Number(db.get(`${id}.preco.trimensal.preco`)).toFixed(2)}\`\n- \`🏷️\` Cupom de desconto: \`Não aplicado\`\n\n> - \`🔧\` Utilize os botoes abaixo para gerenciar seu carrinho, caso tiver duvidas nao hesite em entrar em contato com o suporte`,
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`${id}_semiAutoPay`).setLabel(`Prosseguir para o Pagamento`).setEmoji(`<:payments_24dp_E3E3E3_FILL0_wght4:1385829310220468365>`).setStyle(3),
                                    new ButtonBuilder().setCustomId(`${id}_Trimensal_editEstoque`).setLabel(`Editar Tempo da Assinatura`).setEmoji(`<:event_upcoming_24dp_E3E3E3_FILL0:1385829543901659147>`).setStyle(2),
                                    new ButtonBuilder().setCustomId(`${id}_Trimensal_cancel`).setEmoji(`${Emojis.get(`_trash_emoji`)}`).setStyle(2)
                                )
                        ]
                    }).then(send => {
                        db1.set(thread.id, {
                            quantia: 1,
                            userid: interaction.user.id,
                            aluguel: id,
                            plano: "Trimensal",
                            dias: 90,
                            status: "proccess",
                            msg: {
                                id: send.id,
                                channel: interaction.channel.id,
                                guild: interaction.guild.id
                            }
                        });

                        if (logs.get("channel_logs")) {
                            const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));

                            channel.send({
                                content: ``,
                                embeds: [
                                    new EmbedBuilder()
                                        .setAuthor({ name: `${interaction.user.username} - Pendência Criada`, iconURL: interaction.user.displayAvatarURL() })
                                        .setDescription(`-# \`📋\` Pendência criada com êxito.`)
                                        .addFields(
                                            { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.trimensal.preco`)).toFixed(2)}\``, inline: true },
                                            { name: `Plano`, value: `\`x1 | Trimensal/90d\``, inline: true },
                                            { name: `Canal/User`, value: `${thread.url} | ${interaction.user}` }
                                        )
                                        .setColor(`#00FF00`)
                                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                        .setTimestamp()
                                ],
                                components: [
                                    new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder().setCustomId(`botN`).setLabel(`Mensagem do Sistema`).setStyle(2).setDisabled(true)
                                        )
                                ]
                            }).catch(error => { });

                        };
                    }).catch(error => { });
                });

            };

if (option === "anualPlanBuy") {

    const sistemaA = await db.get(`${id}.preco.anual.onoff`);

    if (!sistemaA) {
        return interaction.reply({ content: `${Emojis.get(`negative`)}  O plano está atualmente desativado para alugueis.`, ephemeral: true });
    };

    const exist = interaction.channel.threads.cache.find(thread => thread.name === `🛒・${interaction.user.username}`);

    if (exist) {
        return interaction.reply({ content: `${Emojis.get(`negative`)}  Você já tem um canal aberto em ${exist.url}`, components: [], ephemeral: true });
    };

    if (!interaction.message.channel.permissionsFor(client.user).has("CreatePrivateThreads")) {
        return interaction.reply({ content: `${Emojis.get(`negative`)}  Eu não consigo abrir um tópico!`, ephemeral: true });
    };

    // Envia a mensagem de "loading" antes de iniciar a criação do carrinho
    await interaction.reply({ content: `${Emojis.get(`loading`)} Criando seu Carrinho... Aguarde.`, ephemeral: true });

    const permission = logs.get("roleAprove") ? [
        {
            id: interaction.guild.roles.cache.find(role => role.id === logs.get("roleAprove")),
            allow: ['VIEW_CHANNEL']
        }
    ] : [];

    interaction.channel.threads.create({
        name: `🛒・${interaction.user.username}`,
        type: ChannelType.PrivateThread,
        reason: 'Needed a separate thread for moderation',
        autoArchiveDuration: 60,
        permissionOverwrites: permission
    }).then(async (thread) => {

        // Após criar o carrinho, edita a mensagem com o botão do link e confirmação
        await interaction.editReply({
            content: `${Emojis.get(`checker`)}  Aluguel anual criado com êxito.`,
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setURL(thread.url)
                            .setLabel(`・Ir Para o Carrinho`)
                            .setStyle(5)
                            .setEmoji(`${Emojis.get(`_cart_emoji`)}`)
                    )
            ]
        });
                    thread.send({
                        content: `# Finalizando suas Compras\n👋 Olá, ${interaction.user} Por favor, escolha no botão abaixo o que deseja fazer.\n\n- \`📦\` Produtos no Carrinho: \`${id}\`\n- \`📡\` Plano: \`x1 | Anual/365d\`\n- \`💰\` Valor da Assinatura: \`R$${Number(db.get(`${id}.preco.anual.preco`)).toFixed(2)}\`\n- \`🏷️\` Cupom de desconto: \`Não aplicado\`\n\n> - \`🔧\` Utilize os botoes abaixo para gerenciar seu carrinho, caso tiver duvidas nao hesite em entrar em contato com o suporte`,
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`${id}_semiAutoPay`).setLabel(`Prosseguir para o Pagamento`).setEmoji(`<:payments_24dp_E3E3E3_FILL0_wght4:1385829310220468365>`).setStyle(3),
                                    new ButtonBuilder().setCustomId(`${id}_Anual_editEstoque`).setLabel(`Editar Tempo da Assinatura`).setEmoji(`<:event_upcoming_24dp_E3E3E3_FILL0:1385829543901659147>`).setStyle(2),
                                    new ButtonBuilder().setCustomId(`${id}_Anual_cancel`).setEmoji(`${Emojis.get(`_trash_emoji`)}`).setStyle(2)
                                )
                        ]
                    }).then(send => {
                        db1.set(thread.id, {
                            quantia: 1,
                            userid: interaction.user.id,
                            aluguel: id,
                            plano: "Anual",
                            dias: 365,
                            status: "proccess",
                            msg: {
                                id: send.id,
                                channel: interaction.channel.id,
                                guild: interaction.guild.id
                            }
                        });

                        if (logs.get("channel_logs")) {
                            const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));

                            channel.send({
                                content: ``,
                                embeds: [
                                    new EmbedBuilder()
                                        .setAuthor({ name: `${interaction.user.username} - Pendência Criada`, iconURL: interaction.user.displayAvatarURL() })
                                        .setDescription(`-# \`📋\` Pendência criada com êxito.`)
                                        .addFields(
                                            { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.anual.preco`)).toFixed(2)}\``, inline: true },
                                            { name: `Plano`, value: `\`x1 | Anual/365d\``, inline: true },
                                            { name: `Canal/User`, value: `${thread.url} | ${interaction.user}` }
                                        )
                                        .setColor(`#00FF00`)
                                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                        .setTimestamp()
                                ],
                                components: [
                                    new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder().setCustomId(`botN`).setLabel(`Mensagem do Sistema`).setStyle(2).setDisabled(true)
                                        )
                                ]
                            }).catch(error => { });

                        };
                    }).catch(error => { });
                });

            };

        };

        if (customId.endsWith("_editEstoque")) {

            const plano = interaction.customId.split("_")[1];

            const modal = new ModalBuilder()
                .setCustomId(`${id}_${plano}_modalMultiplique`)
                .setTitle(`Multiplicador`)

            const option1 = new TextInputBuilder()
                .setCustomId(`mult`)
                .setLabel(`QUANTOS MULTIPLOS DESEJA SETAR?`)
                .setPlaceholder(`EX: 2`)
                .setMaxLength(4)
                .setStyle("Short")

            const optionx1 = new ActionRowBuilder().addComponents(option1);

            modal.addComponents(optionx1);
            await interaction.showModal(modal);

        };

        if (customId.endsWith("_modalMultiplique")) {
            const mult = interaction.fields.getTextInputValue("mult");

            const plano = interaction.customId.split("_")[1];

            if (!/^\d+$/.test(mult)) {
                return interaction.reply({ content: `${Emojis.get(`negative`)}  Quantia inválida, tente novamente!`, ephemeral: true }).catch(error => { });
            };

            if (mult < 1) {
                return interaction.reply({ content: `${Emojis.get(`negative`)}  A quantia mínima é de: **x1**!`, ephemeral: true }).catch(error => { });
            };

            const planDias = plano.toLowerCase() === "mensal" ? 30 : plano.toLowerCase() === "trimensal" ? 90 : 365;

            const dias = planDias * Number(mult);

            await db1.set(`${interaction.channel.id}.quantia`, Number(mult));
            await db1.set(`${interaction.channel.id}.dias`, dias);
            interaction.update({
                content: `# Finalizando suas Compras\n👋 Olá, ${interaction.user} Por favor, escolha no botão abaixo o que deseja fazer.\n\n- \`📦\` Produtos no Carrinho: \`${id}\`\n- \`📡\` Plano: \`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${dias}d\`\n- \`💰\` Valor da Assinatura: \`R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\`\n- \`🏷️\` Cupom de desconto: \`Não aplicado\`\n\n> - \`🔧\` Utilize os botoes abaixo para gerenciar seu carrinho, caso tiver duvidas nao hesite em entrar em contato com o suporte`,
                embeds: []
            });

        };

        if (customId.endsWith("_cancel")) {

            const plano = interaction.customId.split("_")[1];

            interaction.update({
                content: `${Emojis.get(`time_emoji`)}  Tudo bem, seu carrinho sera deletado  <t:${Math.floor((Date.now() + 15000) / 1000)}:R>`,
                embeds: [],
                components: []
            });

            if (logs.get("channel_logs")) {
                const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));

                channel.send({
                    content: ``,
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: `${interaction.user.username} - Pendência Encerrada`, iconURL: interaction.user.displayAvatarURL() })
                            .setDescription(`-# \`❌\` Pendência cancelada com êxito.`)
                            .addFields(
                                { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                                { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true },
                                { name: `User`, value: `${interaction.user}` }
                            )
                            .setColor(`#FF0000`)
                            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                            .setTimestamp()
                    ],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(`botN`).setLabel(`Mensagem do Sistema`).setStyle(2).setDisabled(true)
                            )
                    ]
                }).catch(error => { });

            };

            db1.delete(interaction.channel.id);

            setTimeout(() => {
                try {
                    interaction.channel.delete();
                } catch { };
            }, 15000);

        };

        if (customId.endsWith("_prosseguir")) {

            interaction.update({
                content: `Qual será a forma de pagamento?`,
                embeds: [],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`${id}_semiAutoPay`).setLabel(`Automático`).setEmoji(`1256808767325081683`).setStyle(1).setDisabled(!api.get("sistemaMp")),
                            new ButtonBuilder().setCustomId(`${id}_semiAutoPay`).setLabel(`Semi Auto`).setEmoji(`1302020615192187031`).setStyle(1).setDisabled(!logs.get("semi.sistema")),
                            new ButtonBuilder().setCustomId(`${id}_${db1.get(`${interaction.channel.id}.plano`)}_cancel`).setEmoji(`1302020774709952572`).setStyle(2)
                        )
                ]
            });

        };

    }
}