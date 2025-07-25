const {
    ApplicationCommandType,
    StringSelectMenuBuilder,
    ActionRowBuilder
} = require("discord.js");
const { SquareCloudAPI } = require("@squarecloud/api");
const fs = require("fs");
const path = require("path");
const { api, db2 } = require("../../databases/index"); // Assumindo que estas são inicializadas corretamente em outro lugar

const backupFolder = path.join(__dirname, "..", "..", "backups");

module.exports = {
    name: "restaurar-backups",
    description: "[⚙️] Restaura bots que foram salvos no backup",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008", // Permissão de Administrador

    run: async (client, interaction) => {
        // Verificação de permissão: Apenas um usuário específico pode usar este comando
        if (interaction.user.id !== "1258164990104571914") {
            return interaction.reply({
                content: "❌ Você não tem permissão para usar este comando.",
                ephemeral: true
            });
        }

        // Verifica se a pasta de backups existe
        if (!fs.existsSync(backupFolder)) {
            return interaction.reply({
                content: "⚠️ A pasta de backups não existe.",
                ephemeral: true
            });
        }

        // Lê e filtra os arquivos de backup (apenas arquivos .zip)
        const backupFiles = fs.readdirSync(backupFolder).filter(f => f.endsWith(".zip"));

        // Verifica se algum arquivo de backup foi encontrado
        if (!backupFiles.length) {
            return interaction.reply({
                content: "⚠️ Nenhum arquivo de backup `.zip` encontrado na pasta `/backups`.",
                ephemeral: true
            });
        }

        // Prepara as opções para o menu de seleção, limitando a 25 conforme limites da API do Discord
        const selectOptions = backupFiles.slice(0, 25).map(file => ({
            label: file.length > 99 ? file.slice(0, 99) : file, // Trunca nomes de arquivos longos para exibição
            value: file
        }));

        // Adiciona uma opção para restaurar todos os bots
        selectOptions.push({ label: "🔁 Restaurar TODOS os bots", value: "todos" });

        // Cria o componente do menu de seleção
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("restaurar_backup_select")
            .setPlaceholder("Selecione o backup que deseja restaurar")
            .addOptions(selectOptions);

        // Cria uma action row para conter o menu de seleção
        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        // Responde à interação com o menu de seleção
        await interaction.reply({
            content: "💾 Selecione o backup que deseja restaurar:",
            components: [actionRow],
            ephemeral: true
        });

        // Cria um coletor de componentes de mensagem para ouvir interações com o menu de seleção
        const collector = interaction.channel.createMessageComponentCollector({
            componentType: 3, // Corresponde a StringSelect
            time: 60_000 // Coletor ativo por 60 segundos
        });

        // Listener de evento para quando uma seleção é feita
        collector.on("collect", async i => {
            // Garante que apenas o usuário que iniciou o comando pode interagir
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: "❌ Apenas quem usou o comando pode interagir.",
                    ephemeral: true
                });
            }

            // Confirma a interação e remove os componentes
            await i.update({
                content: "⏳ Iniciando restauração, por favor aguarde...",
                components: []
            });

            // Determina quais arquivos restaurar: todos ou um específico
            const filesToRestore = i.values[0] === "todos" ?
                backupFiles :
                [i.values[0]];

            const squareCloudClient = new SquareCloudAPI(api.get("square"));
            const restorationResults = [];

            // Itera sobre cada arquivo a ser restaurado
            for (let file of filesToRestore) { // 'let' para permitir a reatribuição de 'file' se renomeado
                try {
                    const originalFilePath = path.join(backupFolder, file);

                    // Extrai o nome do bot do nome do arquivo
                    // Exemplo: "NomeDoBot E Timestamp.zip" -> "NomeDoBot"
                    const botNameFromZip = path.basename(file).replace(/\.zip+$/, "").split(" E ")[0];

                    // Encontra os dados antigos do bot no banco de dados usando o nome extraído
                    const oldBotData = db2.all().find(bot => bot.data.nome === botNameFromZip);

                    if (!oldBotData) {
                        restorationResults.push(`❌ Dados antigos não encontrados para: \`${file}\`. Pulei a restauração.`);
                        continue;
                    }

                    // Define o novo nome do arquivo usando o ID antigo do bot para o upload na SquareCloud
                    const newFileName = `${oldBotData.ID}.zip`;
                    const newPathForUpload = path.join(backupFolder, newFileName);

                    // Renomeia o arquivo se o seu nome não corresponder ao formato esperado de ID.zip
                    if (file !== newFileName) {
                        fs.renameSync(originalFilePath, newPathForUpload);
                        // Atualiza a variável 'file' para refletir o novo nome na iteração atual
                        file = newFileName;
                    }

                    // Verifica se o arquivo existe antes de tentar lê-lo
                    if (!fs.existsSync(newPathForUpload)) {
                        restorationResults.push(`❌ Arquivo não encontrado após renomeação ou caminho incorreto: \`${file}\``);
                        continue;
                    }

                    // Verifica se o arquivo está vazio
                    const fileStats = fs.statSync(newPathForUpload);
                    if (fileStats.size === 0) {
                        restorationResults.push(`❌ Arquivo vazio: \`${file}\`. Pulei a restauração.`);
                        continue;
                    }

                    // Lê o conteúdo do arquivo como um Buffer para upload
                    const fileBuffer = fs.readFileSync(newPathForUpload);

                    // Faz o upload do aplicativo para a SquareCloud
                    const app = await squareCloudClient.applications.create(fileBuffer);
                    const newAppDetails = await squareCloudClient.applications.get(app.id);

                    // Atualiza o banco de dados com o novo ID do aplicativo, mantendo os dados antigos
                    db2.set(newAppDetails.id, {
                        nome: botNameFromZip,
                        produto: oldBotData.data.produto || "Desconhecido",
                        plano: oldBotData.data.plano || "Desconhecido",
                        dias: oldBotData.data.dias || 0,
                        owner: oldBotData.data.owner || "desconhecido",
                        dataExpiracao: oldBotData.data.dataExpiracao || null,
                        idapp: newAppDetails.id
                    });

                    // Deleta a entrada antiga do banco de dados
                    db2.delete(oldBotData.ID);

                    console.log(`✅ Bot restaurado: ${botNameFromZip} (${newAppDetails.id})`);
                    restorationResults.push(`✅ \`${botNameFromZip}\` restaurado com sucesso! (ID: \`${newAppDetails.id}\`)`);

                    // Adiciona um atraso para evitar limites de taxa da API da SquareCloud
                    await new Promise(resolve => setTimeout(resolve, 10_000));
                } catch (error) {
                    console.error(`❌ Erro ao restaurar ${file}:`, error.message);
                    restorationResults.push(`❌ Erro ao restaurar \`${file}\`: ${error.message}`);
                }
            }

            // Compila e envia os resultados finais da restauração
            const finalContent = restorationResults.join("\n").slice(0, 2000); // Trunca se for muito longo
            await interaction.followUp({
                content: `📦 Processo finalizado!\n\n${finalContent}`,
                ephemeral: true
            });

            collector.stop(); // Para o coletor após o processamento
        });

        // Listener de evento para quando o coletor termina (por exemplo, por tempo esgotado)
        collector.on("end", collected => {
            if (!collected.size) {
                // Se nenhuma seleção foi feita dentro do tempo limite
                interaction.editReply({
                    content: "⏳ Tempo esgotado. Nenhuma restauração foi feita.",
                    components: []
                });
            }
        });
    }
};