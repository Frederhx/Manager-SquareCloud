const mercadopago = require("mercadopago");
const axios = require("axios");
const { SquareCloudAPI } = require('@squarecloud/api');
const Discord = require("discord.js");
const JSZip = require('jszip');
const path = require('path');
const fs = require("fs");
const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ComponentType, ModalBuilder, TextInputBuilder } = require(`discord.js`);
const { api, db2, auto, db1, logs, perms, Emojis, db } = require("../../databases/index");
const FormData = require("form-data");

module.exports = {
    name: "interactionCreate",
    /**
     * Lida com interações do Discord, especificamente submissões de modais e cliques de botões para uploads de bots.
     * @param {Discord.Interaction} interaction O objeto de interação.
     * @param {Discord.Client} client O cliente Discord.
     */
    run: async (interaction, client) => {
        // Lidar com submissões de modais para uploads de bots
        if (interaction.isModalSubmit() && interaction.customId.endsWith("_uparbot_modal")) {
            let currentContent = `${Emojis.get('loading')} Iniciando upload...`; // Conteúdo inicial da mensagem

            try {
                const [dias, id] = interaction.customId.split("_");
                const nome = interaction.fields.getTextInputValue("nomeapp");
                const iddono = interaction.user.id;
                const tokenbot = interaction.fields.getTextInputValue("tokenapp");

                // Resposta inicial
                await interaction.reply({ content: currentContent, ephemeral: true });

                // --- Extraindo, Editando e Compactando (etapa "Iniciando upload" no feedback) ---
                let zip;
                try {
                    zip = await JSZip.loadAsync(fs.readFileSync(`source/${id}.zip`));
                } catch (readZipError) {
                    console.error(`[ERRO] Falha ao ler o arquivo zip para o ID ${id}:`, readZipError);
                    await interaction.editReply({ content: `${Emojis.get('negative')} Erro ao carregar o arquivo do bot. Por favor, tente novamente mais tarde.`, ephemeral: true });
                    return;
                }

                let botResponse;
                try {
                    botResponse = await axios.get("https://discord.com/api/v10/users/@me", {
                        headers: {
                            Authorization: `Bot ${tokenbot}`
                        }
                    });
                } catch (discordApiError) {
                    console.error("[ERRO] Verificação de token da API do Discord falhou:", discordApiError);
                    await interaction.editReply({ content: `${Emojis.get('negative')} O token do bot fornecido é inválido ou ocorreu um erro ao se comunicar com a API do Discord.`, ephemeral: true });
                    return;
                }

                const botId = botResponse.data.id;
                const expirationDate = new Date(Date.now() + Number(dias) * 24 * 60 * 60 * 1000);

                if (zip.file('config.json')) {
                    zip.file('config.json', JSON.stringify({
                        token: tokenbot,
                        owner: iddono,
                        botid: botId,
                        CLIENT_ID: botId,
                        EXPIRATION: expirationDate
                    }, null, 2));
                } else if (zip.file('token.json')) {
                    zip.file('token.json', JSON.stringify({
                        token: tokenbot
                    }, null, 2));
                } else {
                    console.warn(`[AVISO] Nem config.json nem token.json encontrados no zip para o ID ${id}.`);
                }

                const configFileName = zip.files['squarecloud.config'] ? 'squarecloud.config' : (zip.files['squarecloud.app'] ? 'squarecloud.app' : null);
                if (configFileName) {
                    const configContent = (await zip.file(configFileName).async('string')).replace(/^DISPLAY_NAME=.*$/m, `DISPLAY_NAME=${nome}`);
                    zip.file(configFileName, configContent);
                } else {
                    console.warn(`[AVISO] Nem squarecloud.config nem squarecloud.app encontrados no zip para o ID ${id}.`);
                }

                const filePath = `source/client/${nome}.zip`;
                const content = await zip.generateAsync({ type: 'nodebuffer' });
                await fs.promises.writeFile(filePath, content);

                // --- Adicionando ao Sistema (Squarecloud) ---
                currentContent = `${Emojis.get('loading')} Adicionando ao sistema...`;
                await interaction.editReply({ content: currentContent, ephemeral: true });

                const squareCloudApiKey = await api.get(`square`);
                const api1 = new SquareCloudAPI(squareCloudApiKey);

                let squareCloudAppData;
                try {
                    squareCloudAppData = await api1.applications.create(filePath);
                } catch (squareCloudError) {
                    console.error("[ERRO] A criação do aplicativo na API da SquareCloud falhou:", squareCloudError);
                    await interaction.editReply({ content: `${Emojis.get('negative')} Erro ao criar o aplicativo na SquareCloud. Por favor, verifique sua chave de API ou tente novamente.`, ephemeral: true });
                    fs.unlink(filePath, (err) => { if (err) console.error("Erro ao deletar arquivo local após erro da SquareCloud:", err); });
                    return;
                } finally {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error("Erro ao apagar arquivo local no finally do SquareCloud:", err);
                    });
                }

                const plano = await db1.get(`${interaction.channel.id}.plano`);
                const quantia = await db1.get(`${interaction.channel.id}.quantia`);

                const botData = {
                    nome,
                    dias: Number(dias),
                    plano,
                    quantia,
                    dataExpiracao: expirationDate,
                    idapp: squareCloudAppData.id,
                    token: tokenbot,
                    produto: id,
                    notify: false
                };

                let ownerData = await auto.get(`${iddono}_owner`);
                if (!ownerData) {
                    ownerData = {
                        butecos: [],
                        owner: iddono
                    };
                    auto.set(`${iddono}_owner`, ownerData);
                }
                auto.push(`${iddono}_owner.butecos`, botData);

                db2.set(`${squareCloudAppData.id}`, { ...botData, owner: iddono });

                // --- Adicionado com sucesso! ---
                currentContent = `${Emojis.get('checker')} Adicionado com sucesso!\n`;
                currentContent += `**📅 Tempo de Aluguel:** \`${dias}d\`\n`;
                currentContent += `\nEste canal será deletado em 5 segundos.`; // Mensagem de exclusão
                await interaction.editReply({ content: currentContent, ephemeral: true });


                // Limpar entradas do banco de dados
                await db1.delete(interaction.channel.id);

                // Excluir o canal (tópico) após 5 segundos
                setTimeout(async () => {
                    try {
                        if (interaction.channel.deletable) {
                            await interaction.channel.delete();
                            console.log(`[INFO] Canal ${interaction.channel.id} (tópico) excluído com sucesso.`);
                        }
                    } catch (deleteChannelError) {
                        console.error("Erro ao deletar canal:", deleteChannelError);
                    }
                }, 5000);

            } catch (error) {
                console.error("[ERRO CRÍTICO] Erro não tratado durante a submissão do modal:", error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.followUp({ content: `${Emojis.get('negative')} Ocorreu um erro inesperado. Por favor, tente novamente ou contate o suporte.`, ephemeral: true });
                } else {
                    await interaction.editReply({ content: `${Emojis.get('negative')} Ocorreu um erro inesperado. Por favor, tente novamente ou contate o suporte.`, ephemeral: true });
                }
            }
        }

        // Lidar com cliques de botão para mostrar o modal de upload do bot
        if (interaction.isButton() && interaction.customId.endsWith("_uparbot")) {
            try {
                const [dias, id] = interaction.customId.split("_");
                const modal = new Discord.ModalBuilder()
                    .setTitle(`Gerenciando Infos App`)
                    .setCustomId(`${dias}_${id}_uparbot_modal`);

                const nomeInput = new Discord.TextInputBuilder()
                    .setCustomId("nomeapp")
                    .setLabel("QUAL O NOME PARA O APP?")
                    .setPlaceholder(`EX: Vendas / Ticket / OAuth2`)
                    .setStyle(Discord.TextInputStyle.Short)
                    .setRequired(true);

                const tokenbotInput = new Discord.TextInputBuilder()
                    .setCustomId("tokenapp")
                    .setLabel("QUAL O TOKEN DO BOT?")
                    .setPlaceholder(`SEU TOKEN CLIENT AQUI`)
                    .setStyle(Discord.TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new Discord.ActionRowBuilder().addComponents(nomeInput),
                    new Discord.ActionRowBuilder().addComponents(tokenbotInput)
                );

                await interaction.showModal(modal);
            } catch (error) {
                console.error("[ERRO] Erro ao mostrar o modal:", error);
                await interaction.reply({ content: `${Emojis.get('negative')} Ocorreu um erro ao abrir o formulário.`, ephemeral: true });
            }
        }
    }
};