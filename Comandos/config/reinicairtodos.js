const {
    ApplicationCommandType,
    ApplicationCommandOptionType
} = require("discord.js");
const { SquareCloudAPI } = require('@squarecloud/api');
const { api, db2, db, Emojis, perms, db1 } = require("../../databases/index");

module.exports = {
    name: "projects-restart",
    description: "[🔁] Reinicie todas as aplicações de um produto",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008",
    options: [
        {
            name: "aluguel",
            description: "Escolha o produto desejado",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }
    ],

    async autocomplete(interaction) {
        const value = interaction.options.getFocused().toLowerCase();
        let choices = db.all().filter(prod => prod.data.nomeproduto);

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

        if (!produto) {
            return interaction.reply({
                content: `${Emojis.get("negative")} Produto não encontrado.`,
                ephemeral: true
            });
        }

        await interaction.reply({
            content: `${Emojis.get("loading")} Reiniciando todas as aplicações de \`${produto.nomeproduto}\`...`
        });

        const apps = db2.all().filter(a => a.data.produto === nomeproduto);
        let contador = 0;

        // Defina aqui o canal de logs
        const canalDeLogs = client.channels.cache.get("1388928452337340537"); // 🔁 Substitua pelo ID do canal de logs

        for (const app of apps) {
            const apiSquare = new SquareCloudAPI(api.get("square"));

            try {
                const application = await apiSquare.applications.get(app.ID);

                if (application) {
                    await application.restart().then(async () => {
                        contador++;

                        const ownerId = db1.get(`${app.ID}.owner`) || "Usuário desconhecido";
                        const mention = ownerId.startsWith('<@') ? ownerId : `<@${ownerId}>`;

                        if (canalDeLogs) {
                            canalDeLogs.send({
                                content: `${Emojis.get("repeat")} A aplicação \`${application.name}\`  foi **reiniciada com sucesso!**`
                            });
                        }

                    }).catch(err => {
                        interaction.channel.send(`${Emojis.get("negative")} Falha ao reiniciar \`${app.ID}\`: ${err.message}`);
                    });

                    await new Promise(resolve => setTimeout(resolve, 4000));
                }

            } catch (err) {
                interaction.channel.send(`${Emojis.get("negative")} Erro ao acessar \`${app.ID}\`: ${err.message}`);
            }
        }

        interaction.channel.send(`${Emojis.get("checker")} ${interaction.user}, ${contador} aplicação(ões) foram reiniciadas com sucesso!`);
    }
};
