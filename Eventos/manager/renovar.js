const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ChannelType, EmbedBuilder, ModalBuilder, TextInputBuilder, AttachmentBuilder } = require("discord.js");
const { api, db2, auto, db1,Emojis ,logs, perms, db } = require("../../databases/index");
const mercadopago = require("mercadopago");
const axios = require("axios");
const fs = require("fs");
let mp = api.get("mp");

let copyCode = null;

module.exports = {
    name: `interactionCreate`,

    run: async (interaction, client) => {
        const { customId } = interaction;
        if (!customId) return;

        let id = interaction.customId.split("_")[0];
        let idApp = interaction.customId.split("_")[1];

        if (customId === "copyCodeR") {

            interaction.reply({
                content: copyCode || "\`🔴\` Chave não encontrada!",
                ephemeral: true
            });

        };

        if (customId.endsWith("_renovApp")) {

            const plano = db2.get(`${idApp}.plano`);

            const valor = parseFloat(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * db2.get(`${idApp}.quantia`)).toFixed(2);

            if (!api.get("mp")) {
                return interaction.reply({ content: `\`❌\` A forma de pagamento não foi configurada ainda!`, ephemeral: true });
            };

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

                    const dias = await db2.get(`${idApp}.dias`);
                    const quantia = await db2.get(`${idApp}.quantia`);

                    const embed = new EmbedBuilder()
                        .setTitle(`${Emojis.get(`pix_stamp_emoji`)} Pagamento via PIX criado`)
                        .setAuthor({ name: `${interaction.guild.name} - Sistema de Renovar`, iconURL: interaction.guild.iconURL() })
                        .addFields(
                            { name: `${Emojis.get(`brand_emoji`)} Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(quantia)).toFixed(2)}\``, inline: true },
                            { name: `${Emojis.get(`time_emoji`)} Expira em:`, value: `<t:${Math.floor(Date.now() / 1000) + 600}:R>` },
                            { name: `${Emojis.get(`information_emoji`)} Código Copia e Cola:`, value: `\`\`\`${qrCode}\`\`\``, inline: true }
                        )
                        .setColor(`#00FFFF`)
                        .setFooter({ text: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
                        .setTimestamp()

                    embed.setImage(`attachment://payment.png`)

                    interaction.update({
                        content: `${interaction.user}`,
                        embeds: [embed],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`copyCodeR`).setLabel(`Copiar Codigo`).setEmoji(`1218967168960434187`).setStyle(1),
                                    new ButtonBuilder().setURL(data.point_of_interaction.transaction_data.ticket_url).setLabel(`Pagar por site`).setEmoji(`1302020475760934973`).setStyle(5)
                                )
                        ],
                        files: [attachment]
                    }).then(async (msg) => {

                        copyCode = qrCode;

                        const checkPaymentStatus = setInterval(() => {
                            axios.get(`https://api.mercadopago.com/v1/payments/${data?.id}`, {
                                headers: {
                                    'Authorization': `Bearer ${mp}`
                                }
                            }).then(async (doc) => {

                                if (doc?.data.status === "approved") {
                                    clearInterval(checkPaymentStatus);

                                    const blockedBanks = api.get("banksOff");
                                    const longName = doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name.toLowerCase();
                                    const encontrado = blockedBanks.some(banco => longName.includes(banco.toLowerCase()));

                                    const plano = db2.get(`${idApp}.plano`);

                                    if (encontrado) {

                                        await msg.edit({
                                            content: `${interaction.user}`,
                                            embeds: [
                                                new EmbedBuilder()
                                                .setAuthor({ name: `${interaction.user.username} - Anti Fraude Detectada`, iconURL: interaction.user.displayAvatarURL() })
                                                .setDescription(`-# \`🔎\` Por questão de segurança a sua renovação com o banco \`${doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name}\` foi cancelada.\n-# \`❓\` Está em dúvida ou precisa de ajuda com algo? Contate o suporte!`)
                                                .addFields(
                                                    { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(quantia)).toFixed(2)}\``, inline: true },
                                                    { name: `Plano`, value: `\`x${Number(quantia)} | ${plano}/${Number(dias)}d\``, inline: true },
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
                                                        .setDescription(`-# \`❌\` Renovação cancelada por **Anti Fraude Detectada**.`)
                                                        .addFields(
                                                            { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(quantia)).toFixed(2)}\``, inline: true },
                                                            { name: `Plano`, value: `\`x${Number(quantia)} | ${plano}/${Number(dias)}d\``, inline: true },
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

                                        return;

                                    };

                                    auto.set(`${db2.get(`${idApp}.owner`)}_owner.butecos`, {
                                        nome: db2.get(`${idApp}.nome`),
                                        dias: Number(dias),
                                        plano: db2.get(`${idApp}.plano`),
                                        quantia: db2.get(`${idApp}.quantia`),
                                        dataExpiracao: new Date(Date.now() + dias * 24 * 60 * 60 * 1000),
                                        idapp: idApp,
                                        token: db2.get(`${idApp}.token`),
                                        produto: db2.get(`${idApp}.produto`),
                                        notify: false
                                    });
                        
                                    db2.set(`${idApp}`, {
                                        nome: db2.get(`${idApp}.nome`),
                                        dias: Number(dias),
                                        plano: db2.get(`${idApp}.plano`),
                                        quantia: db2.get(`${idApp}.quantia`),
                                        dataExpiracao: new Date(Date.now() + dias * 24 * 60 * 60 * 1000),
                                        idapp: idApp,
                                        token: db2.get(`${idApp}.token`),
                                        produto: db2.get(`${idApp}.produto`),
                                        owner: db2.get(`${idApp}.owner`)
                                    });

                                    await msg.edit({
                                        content: `${interaction.user}`,
                                        embeds: [
                                            new EmbedBuilder()
                                            .setAuthor({ name: `${interaction.user.username} - Aluguel Renovado`, iconURL: interaction.user.displayAvatarURL() })
                                            .setDescription(`-# \`✅\` Aluguel plano \`${plano}\` renovado com êxito!\n-# \`🔎\` Veja algumas informações abaixo:`)
                                            .addFields(
                                                { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(quantia)).toFixed(2)}\``, inline: true },
                                                { name: `Plano`, value: `\`x${Number(quantia)} | ${plano}/${Number(dias)}d\``, inline: true },
                                                { name: `Banco`, value: `\`${doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name || "\`🔴 Não encontrado.\`"}\`` }
                                            )
                                            .setColor(`#00FF00`)
                                            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                            .setTimestamp()
                                        ],
                                        components: [],
                                        files: []
                                    });

                                    if (logs.get("renov")) {
                                        const channel = interaction.guild.channels.cache.get(logs.get("renov"));
                        
                                        channel.send({
                                            content: ``,
                                            embeds: [
                                                new EmbedBuilder()
                                                .setAuthor({ name: `${interaction.user.username} - Aluguel Pago`, iconURL: interaction.user.displayAvatarURL() })
                                                .setDescription(`-# \`✅\` Aluguel plano \`${plano}\` renovado com êxito!\n-# \`🔎\` Veja algumas informações abaixo:`)
                                                .addFields(
                                                    { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(quantia)).toFixed(2)}\``, inline: true },
                                                    { name: `Plano`, value: `\`x${Number(quantia)} | ${plano}/${Number(dias)}d\``, inline: true },
                                                    { name: `Banco`, value: `\`${doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name || "\`🔴 Não encontrado.\`"}\`` }
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

                                } else { };

                            });
                        }, 2000);

                    });

                });

        };

    }
}