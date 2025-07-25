const {
    ApplicationCommandType,
    StringSelectMenuBuilder,
    ActionRowBuilder
} = require("discord.js");
const { SquareCloudAPI } = require("@squarecloud/api");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { api, db2 } = require("../../databases/index"); // Assumindo que 'api' e 'db2' estão corretamente inicializados

const backupFolder = path.join(__dirname, "..", "..", "backups");

// Garante que a pasta de backups existe; cria se não existir.
if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true }); // Adicionado { recursive: true } para criar pastas aninhadas se necessário
}

module.exports = {
    name: "backupall",
    description: "[⚙️] Faz backup de um ou todos os bots e salva localmente",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008", // Permissão de Administrador

    run: async (client, interaction) => {
        // --- 1. Verificação de Permissão ---
        if (interaction.user.id !== ownerID) {
            return interaction.reply({
                content: "❌ Você não tem permissão para usar este comando.",
                ephemeral: true
            });
        }

        // --- 2. Carrega Bots do Banco de Dados ---
        const allBots = db2.all();
        if (!allBots || allBots.length === 0) {
            return interaction.reply({
                content: "⚠️ Nenhum bot encontrado no banco de dados para fazer backup.",
                ephemeral: true
            });
        }

        // --- 3. Cria Opções para o Menu de Seleção ---
        // Limita a 25 opções para cumprir os limites do Discord
        const selectOptions = allBots.slice(0, 25).map(bot => ({
            label: bot.data.nome,
            value: bot.ID
        }));

        // Adiciona a opção para fazer backup de todos os bots
        selectOptions.push({ label: "🔁 Fazer backup de TODOS os bots", value: "todos" });

        // --- 4. Constrói e Envia o Menu de Seleção ---
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("backup_select")
            .setPlaceholder("Selecione um bot ou escolha 'TODOS'")
            .addOptions(selectOptions);

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            content: "📦 Selecione o bot(s) para fazer backup:",
            components: [actionRow],
            ephemeral: true
        });

        // --- 5. Coleta a Interação do Menu de Seleção ---
        const collector = interaction.channel.createMessageComponentCollector({
            componentType: 3, // Corresponde a StringSelect
            time: 60_000 // Coletor ativo por 60 segundos
        });

        collector.on("collect", async i => {
            // Garante que apenas o usuário que iniciou o comando pode interagir
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: "❌ Apenas quem executou o comando pode usar este menu.",
                    ephemeral: true
                });
            }

            await i.update({ content: "⏳ Iniciando o processo de backup, por favor, aguarde...", components: [] });

            const squareCloudClient = new SquareCloudAPI(api.get("square"));
            const botsToBackup = i.values[0] === "todos" ?
                allBots :
                allBots.filter(bot => bot.ID === i.values[0]);

            const backupResults = []; // Para armazenar os resultados de cada backup

            // --- 6. Processa o Backup para Cada Bot Selecionado ---
            for (const bot of botsToBackup) {
                const appId = bot.ID;
                const botName = bot.data.nome || "Desconhecido";
                // Limpa o nome do arquivo para evitar caracteres inválidos em nomes de caminho
                const cleanedFileName = `${botName}_${Date.now()}.zip`.replace(/[<>:"/\\|?*]+/g, "_");
                const filePath = path.join(backupFolder, cleanedFileName);

                let attempts = 0;
                const maxAttempts = 3;
                let success = false;

                while (attempts < maxAttempts && !success) {
                    try {
                        // Obtém detalhes da aplicação na SquareCloud
                        const app = await squareCloudClient.applications.get(appId);
                        console.log(`🌀 Iniciando backup para: ${botName} (ID: ${appId})`);

                        // Solicita a criação de um backup na SquareCloud
                        await app.backups.create();
                        // Pequeno atraso para dar tempo ao SquareCloud para processar o backup
                        await new Promise(r => setTimeout(r, 5000));

                        // Lista os backups disponíveis e pega o mais recente (presume-se que seja o primeiro)
                        const backups = await app.backups.list();
                        if (!backups || backups.length === 0) {
                            throw new Error("Nenhum backup encontrado para download.");
                        }

                        const downloadURL = backups[0].url; // Pega a URL do backup mais recente
                        const response = await axios.get(downloadURL, { responseType: "stream" });
                        const writer = fs.createWriteStream(filePath);

                        response.data.pipe(writer);

                        // Espera o download ser concluído
                        await new Promise((resolve, reject) => {
                            writer.on("finish", resolve);
                            writer.on("error", reject);
                        });

                        console.log(`✅ Backup salvo para: ${botName} em ${filePath}`);
                        backupResults.push(`✅ Backup de \`${botName}\` salvo.`);
                        success = true; // Marca como sucesso para sair do loop de tentativas

                    } catch (error) {
                        if (error.message.includes("Rate Limit") || (error.response && error.response.status === 429)) {
                            attempts++;
                            console.warn(`⚠️ Rate limit atingido para ${botName}. Tentando novamente em 60 segundos... (tentativa ${attempts}/${maxAttempts})`);
                            backupResults.push(`⚠️ Rate limit atingido para \`${botName}\`. Tentando novamente... (${attempts}/${maxAttempts})`);
                            await new Promise(resolve => setTimeout(resolve, 60_000)); // Espera 1 minuto
                        } else {
                            console.error(`❌ Erro ao fazer backup de ${botName}:`, error.message);
                            backupResults.push(`❌ Falha no backup de \`${botName}\`: ${error.message}`);
                            break; // Sai do loop de tentativas em caso de erro não relacionado a rate limit
                        }
                    }
                }
                // Adiciona um atraso entre o processamento de cada bot para evitar sobrecarregar a API
                await new Promise(resolve => setTimeout(resolve, 30_000)); // Atraso de 30 segundos
            }

            // --- 7. Finaliza e Envia os Resultados ---
            const finalMessage = backupResults.length > 0 ?
                backupResults.join("\n").slice(0, 2000) : // Trunca se a mensagem for muito longa
                "Nenhum backup foi realizado ou os bots selecionados não foram encontrados.";

            await interaction.followUp({
                content: `📦 Processo de backup finalizado!\n\n${finalMessage}`,
                ephemeral: true
            });

            collector.stop(); // Para o coletor
        });

        // --- 8. Lida com o Fim do Coletor (Ex: Tempo Esgotado) ---
        collector.on("end", collected => {
            if (!collected.size) {
                // Se o usuário não selecionou nada dentro do tempo limite
                interaction.editReply({
                    content: "⏳ Tempo esgotado. Nenhuma seleção foi feita, e nenhum backup foi realizado.",
                    components: []
                });
            }
        });
    }
};