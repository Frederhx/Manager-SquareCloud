const {
    ApplicationCommandType,
    ApplicationCommandOptionType
} = require("discord.js");
const { SquareCloudAPI } = require("@squarecloud/api");
const { api, db2, db, db1, Emojis, perms } = require("../../databases/index");
const axios = require("axios");

module.exports = {
    name: `projects-update`,
    description: `[🤖] Atualize todas as aplicações de um produto`,
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008",
    options: [
        {
            name: `aluguel`,
            description: `Escolha o produto desejado`,
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        },
        {
            name: "arquivo",
            description: "Selecione o arquivo .zip que será enviado para atualizar",
            type: ApplicationCommandOptionType.Attachment,
            required: true
        }
    ],

    async autocomplete(interaction) {
        const value = interaction.options.getFocused().toLowerCase();
        let choices = db.all().filter(p => p.data.nomeproduto);

        const filtrados = choices
            .filter(prod => prod.data.nomeproduto.toLowerCase().includes(value))
            .slice(0, 25);

        if (!interaction) return;

        if (choices.length === 0) {
            await interaction.respond([{ name: "Nenhum produto", value: "semproduto" }]);
        } else if (filtrados.length === 0) {
            await interaction.respond([{ name: "Nada encontrado", value: "vazio" }]);
        } else {
            await interaction.respond(
                filtrados.map(prod => ({
                    name: prod.data.nomeproduto,
                    value: prod.ID
                }))
            );
        }
    },

    run: async (client, interaction) => {
        if (!perms.get("usersPerms").includes(interaction.user.id)) {
            return interaction.reply({
                content: `${Emojis.get("negative")} Você não tem permissão para isso.`,
                ephemeral: true
            });
        }

        const nomeproduto = interaction.options.getString("aluguel");
        const produto = db.get(nomeproduto);
        const arquivo = interaction.options.getAttachment("arquivo");

        if (!produto) {
            return interaction.reply({
                content: `${Emojis.get("negative")} Produto não encontrado.`,
                ephemeral: true
            });
        }

        if (!arquivo.name.endsWith(".zip")) {
            return interaction.reply({
                content: `${Emojis.get("negative")} O arquivo precisa ser um \`.zip\`.`,
                ephemeral: true
            });
        }

        await interaction.reply({
            content: `${Emojis.get("loading")} Atualizando todas as aplicações de \`${produto.nomeproduto}\`...`
        });

        const response = await axios.get(arquivo.url, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response.data);
        const listaDeApps = db2.all().filter(a => a.data.produto === nomeproduto);

        const canalDeLogs = client.channels.cache.get("1388928410201489631"); // ⬅️ Substitua pelo ID do canal de logs

        let atualizados = 0;

        for (const app of listaDeApps) {
            const apiSquare = new SquareCloudAPI(api.get("square"));

            try {
                const application = await apiSquare.applications.get(app.ID);

                if (!application) continue;

                await application.commit(buffer, "source.zip", true)
                    .then(async () => {
                        atualizados++;

                        const dadosApp = db1.get(app.ID);
                        const nomeBot = dadosApp?.nome || application.name || app.ID;
                        const donoId = dadosApp?.owner;

                        const mention = donoId ? `<@${donoId}>` : "`Usuário não identificado`";

                        if (canalDeLogs) {
                            canalDeLogs.send({
                                content: `<:build_circle_24dp_E3E3E3_FILL0_w:1388930742603481168> A aplicação \`${nomeBot}\` foi **atualizada com sucesso! e sera reiniciada em breve...**`
                            });
                        }
                    })
                    .catch(err => {
                        interaction.channel.send(`${Emojis.get("negative")} Falha ao atualizar \`${app.ID}\`: ${err.message}`);
                    });

                await new Promise(resolve => setTimeout(resolve, 4000));

            } catch (err) {
                interaction.channel.send(`${Emojis.get("negative")} Erro ao acessar \`${app.ID}\`: ${err.message}`);
            }
        }

        interaction.channel.send(`${Emojis.get("checker")} ${interaction.user}, ${atualizados} aplicação(ões) foram atualizadas com sucesso!`);
    }
};
