const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ChannelType, EmbedBuilder, ModalBuilder, TextInputBuilder, AttachmentBuilder } = require("discord.js");
const { api, db2, auto, db1, logs, perms, db } = require("../../databases/index");
const mercadopago = require("mercadopago");
const axios = require("axios");
const fs = require("fs");
let mp = api.get("mp");
const emojis = require("../../databases/emojis.json");

const Emojis = {
    get: (name) => emojis[name] || ""
};

const activePaymentTimers = new Map();
const activeReminderTimers = new Map();

module.exports = {
    name: `interactionCreate`,

    run: async (interaction, client) => {
        const { customId } = interaction;
        if (!customId) return;

        let id = interaction.customId.split("_")[0];

        if (customId === "copyCode") {
            const codigo = db1.get(`${interaction.channel.id}.copyCola`);
            if (codigo) {
                interaction.reply({
                    content: codigo,
                    ephemeral: true
                });
            } else {
                interaction.reply({
                    content: `${Emojis.get('negative')} Não há código para copiar no momento.`,
                    ephemeral: true
                });
            }
        };

        if (customId === "remindCopyCode") {
            const codigo = db1.get(`${interaction.channel.id}.copyCola`);
            if (codigo) {
                interaction.reply({
                    content: `${Emojis.get('information_emoji')} Aqui está o seu código Pix para copiar e colar:\n\`\`\`${codigo}\`\`\``,
                    ephemeral: true
                });
            } else {
                interaction.reply({
                    content: `${Emojis.get('negative')} Não consegui encontrar o código Pix. Por favor, tente novamente ou gere um novo pagamento.`,
                    ephemeral: true
                });
            }
        };

        if (customId.endsWith("_reembolAluguel")) {
            const axios = require('axios');
            await axios.post(`https://api.mercadopago.com/v1/payments/${id}/refunds`, {}, {
                headers: {
                    'Authorization': `Bearer ${mp}`
                }
            }).catch(error => {
                console.error("Error refunding payment:", error);
            });

            clearTimeout(activePaymentTimers.get(interaction.channel.id));
            clearTimeout(activeReminderTimers.get(interaction.channel.id));
            activePaymentTimers.delete(interaction.channel.id);
            activeReminderTimers.delete(interaction.channel.id);


            interaction.update({
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`reembolsado`).setLabel(`Reembolsado`).setEmoji(`1246952363143729265`).setStyle(3).setDisabled(true)
                        )
                ]
            });
        };

        // --- NEW LOGIC FOR CANCELLATION ---
        if (customId.endsWith("_cancel")) {
            // Defer the update to give the bot time to process
            await interaction.deferUpdate();

            // Clear any active timers for this channel
            clearTimeout(activePaymentTimers.get(interaction.channel.id));
            clearTimeout(activeReminderTimers.get(interaction.channel.id));
            activePaymentTimers.delete(interaction.channel.id);
            activeReminderTimers.delete(interaction.channel.id);

            // Delete all messages in the channel
            try {
                // Fetch all messages in the channel and delete them
                let fetched;
                do {
                    fetched = await interaction.channel.messages.fetch({ limit: 100 });
                    await interaction.channel.bulkDelete(fetched, true); // `true` to not error on messages older than 14 days
                } while (fetched.size >= 2); // Keep fetching until fewer than 2 messages (the defer reply might count as 1)
            } catch (error) {
                console.error("Error deleting messages during cancellation:", error);
                // Can send a private ephemeral message to the user if needed
                // interaction.followUp({ content: `${Emojis.get('negative')} Houve um erro ao limpar as mensagens do canal. Por favor, tente novamente.`, ephemeral: true });
            }

            // Send "Cancelando Carrinho..." message
            const cancellingMessage = await interaction.channel.send({ content: `${Emojis.get('loading')} Cancelando Carrinho...` });

            // Delete data related to the channel
            db1.delete(interaction.channel.id);

            // Edit the message to "Carrinho Cancelado com Sucesso!"
            await cancellingMessage.edit({ content: `${Emojis.get('checker')} Carrinho Cancelado com Sucesso!` }).catch(console.error);

            // Delete the channel after 2 seconds
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (e) {
                    console.error("Error deleting channel after cancellation:", e);
                }
            }, 2000); // 2 seconds
        };
        // --- END NEW LOGIC ---

        if (customId.endsWith("_automaticPay")) {
            // Deferir a interação para que o bot tenha tempo de processar
            await interaction.deferUpdate();

            // Deletar todas as mensagens do canal
            try {
                await interaction.channel.bulkDelete(100); // Tenta deletar 100 mensagens (limite da API)
            } catch (error) {
                console.error("Erro ao deletar mensagens do canal:", error);
                // Pode adicionar um log aqui ou enviar uma mensagem de erro se preferir
            }

            // Enviar a nova mensagem "Gerando Pagamento..."
            const generatingMessage = await interaction.channel.send({ content: `${Emojis.get('loading')} Gerando Pagamento...` });

            const aluguel = db1.get(`${interaction.channel.id}`);
            const plano = db1.get(`${interaction.channel.id}.plano`);

            const valor = parseFloat(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * aluguel.quantia).toFixed(2);

            if (!api.get("mp")) {
                await generatingMessage.edit({ content: `${Emojis.get('negative')} A forma de pagamento não foi configurada ainda!` }).catch(console.error);
                return;
            };

            const paymentTimeoutDuration = api.get("tempoPay") * 60 * 1000;
            const reminderOffset = 5 * 60 * 1000;

            const timer = setTimeout(async () => {
                try {
                    const currentChannelName = interaction.channel.name;
                    const userId = aluguel.userid;
                    const user = await client.users.fetch(userId).catch(() => null);

                    if (user) {
                        let baseName = user.username;
                        // Try to extract the name part after the initial emoji and separator
                        const match = currentChannelName.match(/^(?:🛒・|⏳・)(.+)$/);
                        if (match && match[1]) {
                            baseName = match[1];
                        }
                        // Discord automatically sanitizes channel names:
                        // - Converts to lowercase.
                        // - Replaces spaces with hyphens.
                        // - Removes certain special characters.
                        // We will build the new name with the desired emoji and the extracted base name.
                        const desiredNewName = `⏰・${baseName}`;
                        // Let Discord's API handle the final sanitization, but we provide a clean base.
                        const sanitizedNameForDiscord = desiredNewName.toLowerCase().normalize("NFKD").replace(/[^\w\-・⏳🛒]/g, '').substring(0, 100);
 // Allow hyphens, underscores, periods, and ampersands
                        
                        await interaction.channel.setName(sanitizedNameForDiscord).catch(console.error);
                    }
                } catch (e) {
                    console.error("Could not rename channel on timeout:", e);
                }

                await generatingMessage.edit({ content: `${Emojis.get('time_emoji')} Olá ${interaction.user}, o tempo para realizar o pagamento se esgotou, tente novamente abrindo outro carrinho.`, components: [] }).catch(error => { });

                if (logs.get("channel_logs")) {
                    const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));

                    channel.send({
                        content: ``,
                        embeds: [
                            new EmbedBuilder()
                                .setAuthor({ name: `${interaction.user.username} - Pendência Encerrada`, iconURL: interaction.user.displayAvatarURL() })
                                .setDescription(`-# \`⏰\` Pendência cancelada por inatividade.`)
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
                activePaymentTimers.delete(interaction.channel.id);

                setTimeout(() => {
                    try {
                        interaction.channel.delete();
                    } catch { };
                }, 15000);
            }, paymentTimeoutDuration);

            activePaymentTimers.set(interaction.channel.id, timer);

const reminderTimer = setTimeout(async () => {
    const currentAluguel = await db1.get(`${interaction.channel.id}`);
    if (currentAluguel && currentAluguel.status !== "aprovado") {
        try {
            const user = await client.users.fetch(currentAluguel.userid).catch(() => null);
            if (user) {
                const currentChannelName = interaction.channel.name;
                let baseName = user.username;

                // Extrai o nome base removendo prefixo de emoji, se existir
                const match = currentChannelName.match(/^(?:🛒・|⏳・)(.+)$/);
                if (match && match[1]) {
                    baseName = match[1];
                }

                // Define o novo nome com o emoji ⏳ e mantém todos os caracteres originais
                const desiredNewName = `⏳・${baseName}`.substring(0, 100);

                await interaction.channel.setName(desiredNewName).catch(console.error);
                        }
                    } catch (e) {
                        console.error("Could not rename channel for reminder:", e);
                    }

                    interaction.channel.send({
                        content: `${Emojis.get('time_emoji')} Olá ${interaction.user}! Faltam apenas **5 minutos** para o seu carrinho ser fechado por inatividade. Por favor, finalize o pagamento!`,
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`remindCopyCode`).setLabel(`Ver Código Pix`).setEmoji(`1218967168960434187`).setStyle(2)
                                )
                        ]
                    }).catch(error => {
                        console.error("Error sending reminder message:", error);
                    });
                }
                activeReminderTimers.delete(interaction.channel.id);
            }, paymentTimeoutDuration - reminderOffset);

            activeReminderTimers.set(interaction.channel.id, reminderTimer);

            const payment_data = {
                transaction_amount: Number(valor),
                description: `Cobrança - ${interaction.user.username}`,
                payment_method_id: "pix",
                payer: {
                    email: `${interaction.user?.id}@gmail.com`,
                }
            };

            mercadopago.configurations.setAccessToken(mp);
            await mercadopago.payment.create(payment_data)
                .then(async (paymentResponse) => {

                    const data = paymentResponse.body;
                    const qrCode = data.point_of_interaction.transaction_data.qr_code;
                    const { qrGenerator } = require('../../Lib/QRCodeLib')
                    const qr = new qrGenerator({ imagePath: './Lib/aaaaa.png' })
                    const qrcode = await qr.generate(qrCode)

                    const buffer = Buffer.from(qrcode.response, "base64");
                    const attachment = new AttachmentBuilder(buffer, { name: "payment.png" });

                    let agora = new Date();
                    agora.setMinutes(agora.getMinutes() + Number(api.get("tempoPay")));
                    const time = Math.floor(agora.getTime() / 1000);

                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.username} - Pagina Checkout`, iconURL: interaction.user.displayAvatarURL() })
                        .setTitle(`${Emojis.get(`pix_stamp_emoji`)} Pagamento via PIX criado`)
                        .setDescription(`Para pagar sua compra de \`R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\` referente a ${id}, utilize o QR Code abaixo ou o código copia e cola.Assim que o pagamento for confirmado, o sistema processará automaticamente!`)
                        .addFields(
                            { name: `${Emojis.get(`brand_emoji`)} Valor`, value: `\`R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                            { name: `${Emojis.get(`time_emoji`)} Expira em:`, value: `<t:${time}:R>`, inline: true },
                            { name: `${Emojis.get(`information_emoji`)} Código Copia e Cola:`, value: `\`\`\`${qrCode}\`\`\``, inline: false }
                        )
                        .setColor(`#00FFFF`)
                        .setFooter({ text: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
                        .setTimestamp()

                    embed.setImage(`attachment://payment.png`)

                    // Edita a mensagem "Gerando Pagamento..." para mostrar as informações do PIX
                    await generatingMessage.edit({
                        content: `<@${aluguel.userid}>`,
                        embeds: [embed],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`copyCode`).setLabel(`Copiar Codigo`).setEmoji(`1218967168960434187`).setStyle(2),
                                    new ButtonBuilder().setURL(data.point_of_interaction.transaction_data.ticket_url).setLabel(`Pagar por site`).setEmoji(`1302020475760934973`).setStyle(5),
                                    new ButtonBuilder().setCustomId(`${id}_${db1.get(`${interaction.channel.id}.plano`)}_cancel`).setEmoji(`1316141716146884608`).setStyle(2)
                                )
                        ],
                        files: [attachment]
                    }).then(async (msg) => {

                        await db1.set(`${interaction.channel.id}.copyCola`, qrCode);

                        const checkPaymentStatus = setInterval(() => {

                            if (!interaction.channel) {
                                clearInterval(checkPaymentStatus);
                                return;
                            }

                            axios.get(`https://api.mercadopago.com/v1/payments/${data?.id}`, {
                                headers: {
                                    'Authorization': `Bearer ${mp}`
                                }
                            }).then(async (doc) => {

                                if (doc?.data.status === "approved") {
                                    // Renomeia o canal para algo como 'pago-{nome-do-usuario}'
                                    try {
                                        const user = await client.users.fetch(aluguel.userid).catch(() => null);
                                        if (user) {
                                            const newChannelName = `✅・${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 99);
                                            await interaction.channel.setName(newChannelName).catch(console.error);
                                        }
                                    } catch (e) {
                                        console.error("Could not rename channel on approval:", e);
                                    }


                                    const blockedBanks = api.get("banksOff");
                                    const longName = doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name.toLowerCase();
                                    const encontrado = blockedBanks.some(banco => longName.includes(banco.toLowerCase()));

                                    const plano = db1.get(`${interaction.channel.id}.plano`);

                                    if (encontrado) {
                                        clearInterval(checkPaymentStatus);
                                        clearTimeout(activePaymentTimers.get(interaction.channel.id));
                                        clearTimeout(activeReminderTimers.get(interaction.channel.id));
                                        activePaymentTimers.delete(interaction.channel.id);
                                        activeReminderTimers.delete(interaction.channel.id);


                                        await generatingMessage.edit({ // Edita a mensagem para o anti-fraude
                                            content: `${interaction.user} **Fechando carrinho por Anti Fraude...**`,
                                            embeds: [
                                                new EmbedBuilder()
                                                    .setAuthor({ name: `${interaction.user.username} - Anti Fraude Detectada`, iconURL: interaction.user.displayAvatarURL() })
                                                    .setDescription(`-# \`🔎\` Por questão de segurança a sua transferência com o banco \`${doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name}\` foi cancelada.\n-# \`❓\` Está em dúvida ou precisa de ajuda com algo? Contate o suporte!`)
                                                    .addFields(
                                                        { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                                                        { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true },
                                                        { name: `User/Banco`, value: `<@${db1.get(`${interaction.channel.id}.userid`)}>/\`${doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name || "\`🔴 Não encontrado.\`"}\`` }
                                                    )
                                                    .setColor(`#FF0000`)
                                                    .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                                    .setTimestamp()
                                            ],
                                            components: [],
                                            files: []
                                        }).catch(error => { });

                                        if (logs.get("channel_logs")) {
                                            const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));

                                            channel.send({
                                                content: ``,
                                                embeds: [
                                                    new EmbedBuilder()
                                                        .setAuthor({ name: `${interaction.user.username} - Anti Fraude Detectada`, iconURL: interaction.user.displayAvatarURL() })
                                                        .setDescription(`-# \`❌\` Pendência cancelada por **Anti Fraude Detectada**.`)
                                                        .addFields(
                                                            { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                                                            { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true },
                                                            { name: `User/Banco`, value: `<@${db1.get(`${interaction.channel.id}.userid`)}>/\`${doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name || "\`🔴 Não encontrado.\`"}\`` }
                                                        )
                                                        .setColor(`#FF0000`)
                                                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                                        .setTimestamp()
                                                ],
                                                components: [
                                                    new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`botN`).setLabel(`Notificação do Anti Fraude`).setStyle(2).setDisabled(true)
                                                        )
                                                ]
                                            }).catch(error => { });

                                        };

                                        const axios = require('axios');
                                        await axios.post(`https://api.mercadopago.com/v1/payments/${data?.id}/refunds`, {}, {
                                            headers: {
                                                'Authorization': `Bearer ${mp}`
                                            }
                                        }).catch(error => { });

                                        db1.delete(interaction.channel.id);

                                        setTimeout(() => {
                                            try {
                                                interaction.channel.delete();
                                            } catch { };
                                        }, 15000);

                                        return;

                                    };

                                    await db1.set(`${interaction.channel.id}.status`, "aprovado");

                                } else { };

                                const aluguel = await db1.get(`${interaction.channel.id}`);

                                if (aluguel.status === "aprovado") {
                                    clearInterval(checkPaymentStatus);
                                    clearTimeout(activePaymentTimers.get(interaction.channel.id));
                                    clearTimeout(activeReminderTimers.get(interaction.channel.id));
                                    activePaymentTimers.delete(interaction.channel.id);
                                    activeReminderTimers.delete(interaction.channel.id);

                                    const plano = db1.get(`${interaction.channel.id}.plano`);

                                    const user = client.users.cache.get(`${aluguel.userid}`);
                                    const member = interaction.guild.members.cache.get(`${aluguel.userid}`);

                                    if (user) {

                                        const role = await interaction.guild.roles.cache.get(logs.get(`cargo_client`));

                                        if (role) {
                                            if (!member.roles.cache.has(role)) {
                                                member.roles.add(role?.id).catch(error => { });
                                            };
                                        };

                                    };

                                    await generatingMessage.edit({ // Edita a mensagem para a confirmação de pagamento
                                        content: `# O Pagamento foi aprovado! \n${Emojis.get('warn_emoji')} **Irei precisar** de algumas **informações** para enviar o seu bot, **são elas:**\n\n- **Nome que você irá querer na aplicação;**\n- **Token do Bot,**\n\n${Emojis.get('infus')} **Obs:** Mantenha o token do bot seguro. Não compartilhe com ninguém!\n\n-# **Siga o tutorial** disponível nos **botões abaixo**, qualquer dúvida estamos à **disposição!**`,
                                        embeds: [],
                                        components: [
                                            new ActionRowBuilder()
                                                .addComponents(
                                                    new ButtonBuilder().setCustomId(`${aluguel.dias}_${id}_uparbot`).setLabel(`Enviar Bot`).setEmoji(`1302019443916017714`).setStyle(2),
                                                    new ButtonBuilder().setURL(`https://discord.com/developers/applications`).setLabel(`Discord Developer`).setEmoji(`1302021603915337879`).setStyle(5),
                                                    new ButtonBuilder().setURL(`https://discord.com/developers/applications`).setLabel(`Video Tutorial`).setStyle(5).setDisabled(true)
                                                )
                                        ],
                                        files: []
                                    });

                                    if (logs.get("channel_logs")) {
                                        const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));

                                        channel.send({
                                            content: ``,
                                            embeds: [
                                                new EmbedBuilder()
                                                    .setAuthor({ name: `${interaction.user.username} - Aluguel Pago`, iconURL: interaction.user.displayAvatarURL() })
                                                    .setDescription(`-# \`✅\` Aluguel plano \`${aluguel.plano}\` pago com êxito!\n-# \`🔎\` Veja algumas informações abaixo:`)
                                                    .addFields(
                                                        { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                                                        { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true },
                                                        { name: `Banco`, value: `\`${doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name || "\`🔴 Não encontrado.\`"}\`` }
                                                    )
                                                    .setColor(`#00FF00`)
                                                    .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                                    .setTimestamp()
                                            ],
                                            components: [
                                                new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`${doc.data.id}_reembolAluguel`).setLabel(`Realizar Reembolso`).setEmoji(`1246953228655132772`).setStyle(2).setDisabled(doc?.data.status !== "approved")
                                                    )
                                            ]
                                        }).catch(error => { });

                                    };

                                    if (logs.get("vendas")) {
                                        const channel = interaction.guild.channels.cache.get(logs.get("vendas"));

                                        channel.send({
                                            content: ``,
                                            embeds: [
                                                new EmbedBuilder()
                                                    .setAuthor({ name: `${interaction.user.username} - Pedido Entregue`, iconURL: interaction.user.displayAvatarURL() })
                                                    .setDescription(`Um pedido foi realizado e entregue com êxito.`)
                                                    .addFields(
                                                        { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                                                        { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true }
                                                    )
                                                    .setColor(`#00FF00`)
                                                    .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                                    .setTimestamp()
                                            ],
                                            components: [
                                                new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setURL(`https://discord.com/channels/${db1.get(`${interaction.channel.id}.msg.guild`)}/${db1.get(`${interaction.channel.id}.msg.channel`)}/${db1.get(`${interaction.channel.id}.msg.id`)}`).setLabel(`Alugar também`).setEmoji(`1302020274681675896`).setStyle(5)
                                                    )
                                            ]
                                        }).catch(error => { });

                                    };
                                } else { };

                            });
                        }, 2000);

                    });

                })
                .catch(error => {
                    console.error("Error creating MercadoPago payment:", error);
                    // Edita a mensagem "Gerando Pagamento..." em caso de erro
                    generatingMessage.edit({ content: `${Emojis.get('negative')} Ocorreu um erro ao gerar o pagamento. Por favor, tente novamente mais tarde.` }).catch(console.error);
                    clearTimeout(activePaymentTimers.get(interaction.channel.id));
                    clearTimeout(activeReminderTimers.get(interaction.channel.id));
                    activePaymentTimers.delete(interaction.channel.id);
                    activeReminderTimers.delete(interaction.channel.id);
                });
        };
    }
}