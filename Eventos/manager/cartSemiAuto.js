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

module.exports = {
    name: `interactionCreate`,

    run: async (interaction, client) => {
        const { customId } = interaction;
        if (!customId) return;

        let id = interaction.customId.split("_")[0];

        if (customId === "copyPix") {

            const codigo = logs.get("semi.chave");

            interaction.reply({
                content: codigo,
                ephemeral: true
            });

        };

        if (customId === "aproveCarrin") {

            if (!logs.get("semi.roleAprove")) {
                return interaction.reply({ content: `${Emojis.get('negative')} Cargo de aprovador não foi setado ainda`, ephemeral: true });
            };

            if (!interaction.member.roles.cache.has(logs.get("semi.roleAprove"))) {
                return interaction.reply({ content: `${Emojis.get('negative')} Você não tem permissão para fazer isso!`, ephemeral: true });
            };

            const currentStatus = await db1.get(`${interaction.channel.id}.status`);
            if (currentStatus === "aprovado") {
                return interaction.reply({ content: `${Emojis.get('warn_emoji')} O aluguel já foi aprovado.`, ephemeral: true });
            };

            await db1.set(`${interaction.channel.id}.status`, "aprovado");
            interaction.reply({ content: `${Emojis.get('check')} Carrinho aprovado com êxito.`, ephemeral: true });
            
        };

        if (customId.endsWith("_semiAutoPay")) {

            const aluguel = await db1.get(`${interaction.channel.id}`);
            const plano = db1.get(`${interaction.channel.id}.plano`);

            const valor = parseFloat(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * aluguel.quantia).toFixed(2);

            if (!logs.get("semi.tipo") && !logs.get("semi.chave")) {
                return interaction.reply({ content: `${Emojis.get('negative')} A forma de pagamento não foi configurada ainda!`, ephemeral: true });
            };

            const timer = setTimeout(async () => {
                interaction.update({ content: `\`⏰\` Olá ${interaction.user}, o tempo para realizar o pagamento se esgotou, tente novamente abrindo outro carrinho.`, components: [] }).catch(error => { });

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

                setTimeout(() => {
                    try {
                        interaction.channel.delete();
                    } catch { };
                }, 15000);
            }, logs.get("semi.tempoPay") * 60 * 1000);

            const { qrGenerator } = require('../../Lib/QRCodeLib.js')
            const qr = new qrGenerator({ imagePath: './Lib/aaaaa.png' })

            const { QrCodePix } = require('qrcode-pix')

            const valor2 = Number(valor);
            const qrCodePix = QrCodePix({
                version: '01',
                key: logs.get("semi.chave"),
                name: logs.get("semi.chave"),
                city: 'BRASILIA',
                cep: '28360000',
                value: valor2
            });

            const chavealeatorio = qrCodePix.payload()

            const qrcode = await qr.generate(chavealeatorio)

            const buffer = Buffer.from(qrcode.response, "base64");
            const attachment = new AttachmentBuilder(buffer, { name: "payment.png" });

            let agora = new Date();
            agora.setMinutes(agora.getMinutes() + Number(logs.get("semi.tempoPay")));
            const time = Math.floor(agora.getTime() / 1000);

            const embed = new EmbedBuilder()
                .setAuthor({ name: `${interaction.user.username} - Pendência Aluguel Realizada`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(`-# \`✅\` Pendência para realizar pagamento de plano realizada.\n-# \`❓\` Entrega manual após pagamento.\n\n**Chave Pix:**\n\`\`\`${logs.get("semi.chave")} | ${logs.get("semi.tipo")}\`\`\``)
                .addFields(
                    { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: false },
                    { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true },
                    { name: `Tempo Encerrar`, value: `<t:${time}:R>`, inline: true }
                )
                .setColor(`#00FFFF`)
                .setFooter({ text: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
                .setTimestamp()

            embed.setImage(`attachment://payment.png`)

            interaction.update({
                content: `<@${aluguel.userid}>`,
                embeds: [embed],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`copyPix`).setLabel(`MobileService`).setEmoji(`1218967168960434187`).setStyle(1),
                            new ButtonBuilder().setCustomId(`aproveCarrin`).setLabel(`Aprovar Aluguel`).setEmoji(`1246952363143729265`).setStyle(3),
                            new ButtonBuilder().setCustomId(`${id}_${db1.get(`${interaction.channel.id}.plano`)}_cancel`).setEmoji(`1302020774709952572`).setStyle(2)
                        )
                ],
                files: [attachment]
            }).then(async (msg) => {

                const checkPaymentStatus = setInterval(async () => {

                    const aluguel = await db1.get(`${interaction.channel.id}`);

                    if (aluguel.status === "aprovado") {
                        clearInterval(checkPaymentStatus);

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

                        await msg.edit({
                            content: `${interaction.user}`,
                            embeds: [
                                new EmbedBuilder()
                                    .setAuthor({ name: `${interaction.user.username} - Aluguel Pago`, iconURL: interaction.user.displayAvatarURL() })
                                    .setDescription(`-# \`✅\` Aluguel plano \`${aluguel.plano}\` pago com êxito!\n-# \`🔎\` Veja algumas informações abaixo:`)
                                    .addFields(
                                        { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                                        { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true },
                                        { name: `Banco`, value: `\`⚡ Aprovado Manualmente\`` }
                                    )
                                    .setColor(`#00FF00`)
                                    .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                    .setTimestamp()
                            ],
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`${aluguel.dias}_${id}_uparbot`).setLabel(`Logar Sistema`).setEmoji(`1302019443916017714`).setStyle(3),
                                        new ButtonBuilder().setURL(`https://discord.com/developers/applications`).setLabel(`Discord Dev`).setEmoji(`1302021603915337879`).setStyle(5)
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
                                            { name: `Banco`, value: `\`⚡ Aprovado Manualmente\`` }
                                        )
                                        .setColor(`#00FF00`)
                                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                        .setTimestamp()
                                ],
                                components: [
                                    new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder().setCustomId(`${doc.data.id}_reembolAluguel`).setLabel(`Realizar Reembolso`).setEmoji(`1246953228655132772`).setStyle(2).setDisabled(true)
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

                        clearTimeout(timer);

                    } else { };
                }, 2000);

            });

        };

    }
}