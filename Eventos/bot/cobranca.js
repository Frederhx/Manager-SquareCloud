const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require("discord.js");
const mercadopago = require("mercadopago");
const axios = require("axios");
const { JsonDatabase } = require("wio.db");
const { api, db2, auto, db1, logs, perms, db } = require("../../databases/index");
const schedule = require('node-schedule');
const JSZip = require('jszip');
const path = require('path');
const fs = require("fs");
const { SquareCloudAPI } = require('@squarecloud/api');
const pix = new JsonDatabase({databasePath:"./config.json"});


module.exports = {
    name:"ready",
    run: async(client) => {
        const intervalo = 2000

        async function verificarExpiracao() {
            const api1 = new SquareCloudAPI(api.get(`square`));
            const donos = db2.all()
        
            donos.map(async (dono) => {
                const dataExpiracao = new Date(dono.data.dataExpiracao);
                    const agora = new Date();
        
                    if (agora > dataExpiracao) {
                        const a = client.users.cache.get(dono.data.owner) 
                        if(a) {
                            a.send({
                                content: `${a}`,
                                embeds: [
                                    new EmbedBuilder()
                                    .setAuthor({ name: `${a.displayName} - Alerta Plano Expirado`, iconURL: a.displayAvatarURL() })
                                    .setDescription(`-# \`📅\` Alerta de **plano expirado**!`)
                                    .setFields(
                                        { name: `Info App`, value: `\`${dono.ID} | ${dono.data.nome}\``, inline: true },
                                        { name: `Plano Perdido`, value: `\`${dono.data.plano} | ${dono.data.dias}d\``, inline: true },
                                        { name: `Expirou`, value: `\`🔎 Agora, sua aplicação foi excluida.\``, inline: false }
                                    )
                                    .setColor(`#00FFFF`)
                                    .setFooter({ text: `${a.username}`, iconURL: a.displayAvatarURL() })
                                    .setTimestamp()
                                ],
                                components: [
                                    new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`botN`).setLabel(`Mensagem do Sistema`).setStyle(2).setDisabled(true)
                                    )
                                ]
                            });
                        }
                        try {
                            const application = await api1.applications.get(dono.ID);
                            await application.delete();
                        } catch { };

                        db2.delete(dono.ID);
                        auto.delete(`${dono.data.owner}_owner`);
                    } else if (agora > new Date(dataExpiracao.getTime() - 2 * 24 * 60 * 60 * 1000)) {
                        var timestamp = Math.floor(new Date(dataExpiracao).getTime() / 1000)
                        if (!dono.data.notify) {
                            await db2.set(`${dono.ID}.notify`, true);

                            const a = client.users.cache.get(dono.data.owner);

                            client.users.cache.get(dono.data.owner).send({
                                content: `${a}`,
                                embeds: [
                                    new EmbedBuilder()
                                    .setAuthor({ name: `${a.displayName} - Alerta Para Renovação`, iconURL: a.displayAvatarURL() })
                                    .setDescription(`-# \`📅\` Alerta para realizar uma **renovação de plano**!`)
                                    .setFields(
                                        { name: `Info App`, value: `\`${dono.ID} | ${dono.data.nome}\``, inline: true },
                                        { name: `Seu Plano`, value: `\`${dono.data.plano} | ${dono.data.dias}d\``, inline: true },
                                        { name: `Expira`, value: `<t:${timestamp}:f> (<t:${timestamp}:R>)`, inline: false }
                                    )
                                    .setColor(`#00FFFF`)
                                    .setFooter({ text: `${a.username}`, iconURL: a.displayAvatarURL() })
                                    .setTimestamp()
                                ],
                                components: [
                                    new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`botN`).setLabel(`Mensagem do Sistema`).setStyle(2).setDisabled(true)
                                    )
                                ]
                            });
                        }
                    }
            });
        }
        setInterval(verificarExpiracao, intervalo);


    }
}