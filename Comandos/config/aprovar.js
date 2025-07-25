const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ComponentType, ModalBuilder, TextInputBuilder, AttachmentBuilder } = require("discord.js")
const { api, db2, auto, db1, logs,Emojis,perms, db } = require("../../databases/index");
const fs = require("fs");
const { JsonDatabase } = require("wio.db");
const JSZip = require('jszip');
const mercadopago = require("mercadopago")
const axios = require("axios")
const { SquareCloudAPI } = require('@squarecloud/api');
const chave = new JsonDatabase({ databasePath: "./config.json" })

module.exports = {
    name: "aprovar",
    description: "[🤖] Aprove alguma compra!",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008",
    run: async (client, interaction) => {
        if (interaction.user.id !== ownerID) {
            return interaction.reply({ content: `${Emojis.get('negative')} Você não tem permissão para usar este comando.`, ephemeral: true });
        }


        const asd = db1.get(`${interaction.channel.id}`);
        if (!asd) {
            return interaction.reply({ content: `${Emojis.get('negative')} Nao Achei o Carrinho`, ephemeral: true });
        };

        await db1.set(`${interaction.channel.id}.status`, "aprovado");

        interaction.reply({
            content: `${Emojis.get('checker')} Carrinho Aprovado com Sucesso!`,
            ephemeral: true
        });

    }
}