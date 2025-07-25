const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle } = require("discord.js");
const { api, db2, auto, db1, Emojis, logs, perms, db } = require("../../databases/index");
const fs = require("fs");
const JSZip = require('jszip');

module.exports = {
    name: "projects-msgvendas",
    description: `[🤖] Seta a Mensagem de Algum Produto Registrado`,
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008",
    options: [
        {
            name: `alugueis`,
            description: `Veja todos os seus alugueis registrados`,
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        },
    ],

    async autocomplete(interaction) {
        const value = interaction.options.getFocused().toLowerCase();
        let choices = db.all().filter(pd => pd.data.nomeproduto);

        const filtered = choices.filter(choice => choice.data.nomeproduto.toLowerCase().includes(value)).slice(0, 25);

        if (!interaction) return;
        if (choices.length === 0) {
            await interaction.respond([{ name: `Crie um BOT!`, value: `a29183912asd92384XASDASDSADASDSADASDASD12398212222` }]);
        } else if (filtered.length === 0) {
            await interaction.respond([{ name: `Não achei nenhum BOT`, value: `a29183912asd92384XASDASDSADASDSADASDASD1239821` }]);
        } else {
            await interaction.respond(filtered.map(choice => ({ name: choice.data.nomeproduto, value: choice.data.nomeproduto })));
        };
    },

    run: async (client, interaction) => {
        if (!perms.get(`usersPerms`).includes(interaction.user.id)) {
            return interaction.reply({ content: `${Emojis.get('negative')} Você não tem permissão para usar este comando.`, ephemeral: true });
        };

        const id = interaction.options.getString(`alugueis`);
        if (id === `a29183912asd92384XASDASDSADASDSADASDASD1239821`) {
            return interaction.reply({ content: `${Emojis.get('negative')} Bot aluguel não encontrado.`, ephemeral: true });
        };

        if (id === `a29183912asd92384XASDASDSADASDSADASDASD12398212222`) {
            return interaction.reply({ content: `${Emojis.get('negative')} Não existe nenhum bot aluguel ainda.`, ephemeral: true });
        };

        if (id !== db.get(`${id}.nomeproduto`)) {
            return interaction.reply({ content: `${Emojis.get('negative')} Bot aluguel não encontrado.`, ephemeral: true });
        };

        interaction.reply({ content: `${Emojis.get('checker')} Bot aluguel enviado com êxito`, ephemeral: true });

        const planoMensal = Number(db.get(`${id}.preco.mensal.preco`)).toFixed(2);
        const planoTrimen = Number(db.get(`${id}.preco.trimensal.preco`)).toFixed(2);
        const planoAnual = Number(db.get(`${id}.preco.anual.preco`)).toFixed(2);
        const previewLink = db.get(`${id}.link`);
        const previewDisabled = previewLink === "remover";
        const previewURL = previewDisabled ? "https://example.com" : previewLink;

        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`${id}_selectPlano`)
                .setPlaceholder(`💻 Selecione o Plano Clicando Aqui`)
                .addOptions(
                    {
                        value: `mensalPlanBuy`,
                        label: `Mensal`,
                        description: `R$${planoMensal}`,
                        emoji: Emojis.get(`sifrao`)
                    },
                    {
                        value: `trimenPlanBuy`,
                        label: `Trimensal`,
                        description: `R$${planoTrimen}`,
                        emoji: Emojis.get(`sifrao`)
                    },
                    {
                        value: `anualPlanBuy`,
                        label: `Anual`,
                        description: `R$${planoAnual}`,
                        emoji: Emojis.get(`sifrao`)
                    }
                )
        );

        const previewButton = new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setURL(previewURL)
            .setLabel("Tutorial/Preview")
            .setEmoji("1302020475760934973")
            .setDisabled(previewDisabled);

        const previewRow = new ActionRowBuilder().addComponents(previewButton);

        if (await db.get(`${id}.type`) === "embed") {
            const embed = new EmbedBuilder()
                .setDescription(`${db.get(`${id}.preco.embed.desc`)}`)
                .setTitle(`${db.get(`${id}.preco.embed.titulo`)}`)
                .setColor(`${db.get(`${id}.preco.embed.cor`)}`)
                .setFooter({ text: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            if (db.get(`${id}.banner`) !== null) {
                embed.setImage(`${db.get(`${id}.banner`)}`);
            };

            interaction.channel.send({
                embeds: [embed],
                components: [selectMenu, previewRow]
            });

        } else {
            const content1 = `${await db.get(`${id}.preco.content.content`)}`;
            const banner = await db.get(`${id}.banner`);

            if (!banner) {
                interaction.channel.send({
                    content: content1,
                    components: [selectMenu, previewRow]
                });
            } else {
                interaction.channel.send({
                    content: content1,
                    components: [selectMenu, previewRow],
                    files: [banner]
                });
            };
        }
    }
};
