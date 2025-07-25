const {
    InteractionType,
    ChannelType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { SquareCloudAPI } = require("@squarecloud/api");
const AdmZip = require("adm-zip");
const emojis = require("../../databases/emojis.json");

// --- Caminhos dos arquivos e pastas ---
const NOTIFY_PATH = path.resolve(__dirname, "../../databases/notify.json");
const APPS_PATH = path.resolve(__dirname, "../../databases/applications.json");
const APIS_PATH = path.resolve(__dirname, "../../databases/apis.json");
const SOURCES_PATH = path.resolve(__dirname, "../../source");
const RESGATES_PATH = path.resolve(__dirname, "../../databases/resgates.json");
const CLIENT_TEMP_PATH = path.resolve(__dirname, "../../client"); // Pasta temporária para extração

// --- ID DO CANAL ONDE OS TÓPICOS SERÃO CRIADOS ---
// VOCÊ PRECISA DEFINIR O ID DE UM CANAL DE TEXTO EXISTENTE AQUI!
const THREAD_PARENT_CHANNEL_ID = '1234566789000988776';

// --- Inicialização de arquivos de banco de dados ---
function initializeDatabaseFile(filePath, defaultContent) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 4));
    }
}

initializeDatabaseFile(NOTIFY_PATH, []);
initializeDatabaseFile(APPS_PATH, {});
initializeDatabaseFile(RESGATES_PATH, {});

// --- Carregar API Key da Square Cloud ---
let squareApiKey;
try {
    const apis = JSON.parse(fs.readFileSync(APIS_PATH, "utf-8"));
    squareApiKey = apis.square;
    if (!squareApiKey) {
        console.error("❌ ERRO: A chave da API da Square Cloud não está configurada no arquivo 'apis.json'.");
        process.exit(1);
    }
} catch (err) {
    console.error(`❌ ERRO ao ler o arquivo 'apis.json': ${err.message}`);
    process.exit(1);
}

const squareCloudApi = new SquareCloudAPI(squareApiKey);

// --- Função auxiliar para ler JSON ---
function readJsonFile(filePath, defaultValue = {}) {
    try {
        if (!fs.existsSync(filePath)) {
            return defaultValue;
        }
        const data = fs.readFileSync(filePath, "utf-8");
        const parsedData = JSON.parse(data);
        return Array.isArray(defaultValue) && !Array.isArray(parsedData) ? defaultValue : parsedData;
    } catch (err) {
        console.error(`⚠️ AVISO: Erro ao ler ou parsear o arquivo JSON '${filePath}': ${err.message}`);
        return defaultValue;
    }
}

// --- Função auxiliar para escrever JSON ---
function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        return true;
    } catch (err) {
        console.error(`❌ ERRO ao escrever no arquivo JSON '${filePath}': ${err.message}`);
        return false;
    }
}

const EmojiMap = {
    bolaamarela: '🟡',
    bolaverde: '🟢',
    negative: '❌'
};

const Emojis = {
    loading: EmojiMap.bolaamarela,
    success: EmojiMap.bolaverde,
    error: EmojiMap.negative
};

// --- Evento de Interação ---
module.exports = {
    name: "interactionCreate",
    run: async (interaction, client) => {
        try {
            // Lida com comandos de aplicação (slash commands)
            if (interaction.type === InteractionType.ApplicationCommand) {
                const cmd = client.slashCommands.get(interaction.commandName);
                if (!cmd) {
                    return interaction.reply({ content: "❌ Comando não encontrado.", ephemeral: true });
                }
                interaction.member = interaction.guild.members.cache.get(interaction.user.id);
                return cmd.run(client, interaction);
            }

            // Lida com autocompletes
            if (interaction.isAutocomplete()) {
                const cmd = client.slashCommands.get(interaction.commandName);
                if (!cmd || !cmd.autocomplete) return;
                try {
                    await cmd.autocomplete(interaction);
                } catch (err) {
                    console.warn(`⚠️ ERRO no autocomplete do comando '${interaction.commandName}': ${err.message}`);
                }
                return;
            }

            // --- Lida com interações de botão ---
            if (interaction.isButton()) {
                const userId = interaction.user.id;

                // Botão para ativar/desativar notificações
                if (interaction.customId === "toggle_notify") {
                    let notifyList = readJsonFile(NOTIFY_PATH, []);
                    let messageContent;

                    if (notifyList.includes(userId)) {
                        notifyList = notifyList.filter(id => id !== userId);
                        messageContent = "🔕 Notificações desativadas.";
                    } else {
                        notifyList.push(userId);
                        messageContent = "🔔 Notificações ativadas!";
                    }
                    
                    if (writeJsonFile(NOTIFY_PATH, notifyList)) {
                        await interaction.reply({ content: messageContent, ephemeral: true });
                    } else {
                        await interaction.reply({ content: "❌ Houve um erro ao atualizar suas preferências de notificação.", ephemeral: true });
                    }
                    return;
                }

                // Botão para realizar teste de 24 horas
                if (interaction.customId === "realizar_teste_24hr") {
                    await interaction.deferReply({ ephemeral: true });

                    const userNameClean = interaction.user.username.replace(/\./g, ""); 
                    
                    const allAvailableProducts = fs.readdirSync(SOURCES_PATH)
                                                  .filter(file => file.toLowerCase().endsWith(".zip"));

                    if (allAvailableProducts.length === 0) {
                        return interaction.editReply({ content: "❌ Nenhum produto disponível para teste no momento. Contate o suporte.", ephemeral: true });
                    }

                    const parentChannel = client.channels.cache.get(THREAD_PARENT_CHANNEL_ID);
                    if (!parentChannel || parentChannel.type !== ChannelType.GuildText) {
                        console.error(`❌ ERRO: O ID do canal para para tópicos (${THREAD_PARENT_CHANNEL_ID}) é inválido ou não é um canal de texto.`);
                        return interaction.editReply({ 
                            content: "❌ Erro na configuração do bot: Canal de testes inválido. Contate um administrador.", 
                            ephemeral: true 
                        });
                    }

                    // --- VERIFICAÇÃO DE PERMISSÕES PARA CRIAR TÓPICO ---
                    const botPermissionsInChannel = parentChannel.permissionsFor(client.user);
                    if (!botPermissionsInChannel.has(PermissionFlagsBits.ManageThreads) || 
                        !botPermissionsInChannel.has(PermissionFlagsBits.SendMessages) ||
                        !botPermissionsInChannel.has(PermissionFlagsBits.ViewChannel)) {
                        console.error(`❌ ERRO: Bot não tem permissões suficientes para criar ou gerenciar tópicos no canal ${parentChannel.name} (${parentChannel.id}).`);
                        return interaction.editReply({
                            content: `❌ O bot não tem as permissões necessárias (Ver Canal, Enviar Mensagens, Gerenciar Tópicos) no canal de testes <#${parentChannel.id}>. Contate um administrador.`,
                            ephemeral: true
                        });
                    }
                    // --- FIM DA VERIFICAÇÃO DE PERMISSÕES ---

                    // --- VERIFICAÇÃO DE TÓPICO EXISTENTE PARA O USUÁRIO ---
                    // Busca por tópicos ativos que o usuário está no nome ou já participou (apenas os visíveis ao bot)
                    const existingThreads = await parentChannel.threads.fetchActive(); // Pega tópicos ativos
                    const userExistingThread = existingThreads.threads.find(thread => 
                        thread.name.includes(userNameClean) && thread.members.cache.has(userId)
                    );
                    // Se não encontrar em ativos, pode estar em arquivados (requer mais fetches e tempo)
                    // Para simplificar, vamos verificar os ativos primeiro.

                    if (userExistingThread) {
                        const goToThreadButton = new ButtonBuilder()
                            .setLabel("Cloque aqui para ser Redirecionado")
                            .setStyle(ButtonStyle.Link)
                            .setURL(userExistingThread.url);

                        const actionRowButton = new ActionRowBuilder().addComponents(goToThreadButton);

                        return interaction.editReply({
                            content: `⚠️ ${interaction.user}, você já possui um painel de testes ativo. Por favor, clique abaixo para ser redirecionado`,
                            components: [actionRowButton],
                            ephemeral: true
                        });
                    }
                    // --- FIM DA VERIFICAÇÃO DE TÓPICO EXISTENTE ---


                    const testThread = await parentChannel.threads.create({
                        name: `🎁・${userNameClean}-teste`,
                        type: ChannelType.PrivateThread,
                        reason: `Teste gratuito de 24 horas para ${userNameClean}`
                    });

                    // Adiciona o usuário ao tópico privado (obrigatório para tópicos privados)
                    // Isso é importante, pois o usuário não "entra" no tópico privado automaticamente.
                    await testThread.members.add(userId);

                    const productSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId("selecionar_produto_trial")
                        .setPlaceholder("Selecione um produto para testar")
                        .addOptions(allAvailableProducts.map(file => ({
                            label: file.replace(".zip", ""),
                            value: file
                        })));

                    const actionRow = new ActionRowBuilder().addComponents(productSelectMenu);

                    await testThread.send({
                        content: `Olá ${interaction.user}, seja bem-vindo(a) ao seu painel de testes! Por favor, selecione um produto para iniciar:`,
                        components: [actionRow]
                    });

                    // --- Botão para redirecionar para o tópico criado ---
                    const goToThreadButton = new ButtonBuilder()
                        .setLabel("Ir para o Painel de Testes")
                        .setStyle(ButtonStyle.Link)
                        .setURL(testThread.url); // URL do tópico

                    const actionRowRedir = new ActionRowBuilder().addComponents(goToThreadButton);

                    return interaction.editReply({
                        content: `🎁 Seu painel de teste foi criado com sucesso: ${testThread}!`,
                        components: [actionRowRedir], // Adiciona o botão à mensagem efêmera
                        ephemeral: true
                    });
                }
            }

            // --- Lida com seleção de produto no menu suspenso ---
            if (interaction.isStringSelectMenu() && interaction.customId === "selecionar_produto_trial") {
                await interaction.deferReply({ ephemeral: true });

                const selectedProduct = interaction.values[0];
                const userNameClean = interaction.user.username.replace(/\./g, ""); 
                const userId = interaction.user.id;
                const productFilePath = path.join(SOURCES_PATH, selectedProduct);

                // --- Verificação de Resgate DUPLICADO ---
                const userResgates = readJsonFile(RESGATES_PATH, {});
                const userProductsResgated = userResgates[userId] || [];

                if (userProductsResgated.includes(selectedProduct)) {
                    const allAvailableProducts = fs.readdirSync(SOURCES_PATH)
                                                  .filter(file => file.toLowerCase().endsWith(".zip"));

                    const productSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId("selecionar_produto_trial")
                        .setPlaceholder("Selecione um produto para testar")
                        .addOptions(allAvailableProducts.map(file => ({
                            label: file.replace(".zip", ""),
                            value: file
                        })));
                    const actionRow = new ActionRowBuilder().addComponents(productSelectMenu);

                    await interaction.message.delete();

                    await interaction.editReply({
                        content: `${Emojis.error} Você já resgatou o produto **${selectedProduct.replace(".zip", "")}**. É possível resgatar cada bot apenas 1 vez.`,
                        ephemeral: true
                    });
                    
                    await interaction.channel.send({
                        content: `Por favor, ${interaction.user}, selecione outro produto para testar:`,
                        components: [actionRow]
                    });

                    return;
                }
                // --- Fim: Verificação de Resgate DUPLICADO ---

                if (interaction.deferred && interaction.ephemeral) {
                     await interaction.deleteReply();
                }

                await interaction.message.delete(); 
                let feedbackMessage = await interaction.channel.send({
                    content: `${Emojis.loading} Iniciando Processo`
                });

                const novoZipPath = path.resolve(__dirname, `../../temp_upload_${Date.now()}.zip`);
                let squareCloudAppData;

                try {
                    // Processo: Extraindo Arquivos
                    await feedbackMessage.edit({
                        content: `${Emojis.success} Processo Iniciado\n${Emojis.loading} Extraindo Arquivos`
                    });

                    if (!fs.existsSync(productFilePath)) {
                        await feedbackMessage.edit({
                            content: `${Emojis.success} Processo Iniciado\n${Emojis.error} Erro: O arquivo do produto \`${selectedProduct}\` não foi encontrado.`
                        });
                        return;
                    }

                    if (fs.existsSync(CLIENT_TEMP_PATH)) {
                        fs.rmSync(CLIENT_TEMP_PATH, { recursive: true, force: true });
                    }
                    fs.mkdirSync(CLIENT_TEMP_PATH);

                    const zip = new AdmZip(productFilePath);
                    zip.extractAllTo(CLIENT_TEMP_PATH, true);

                    // Processo: Compactando Arquivo
                    await feedbackMessage.edit({
                        content: `${Emojis.success} Processo Iniciado\n${Emojis.success} Extraindo Arquivos\n${Emojis.loading} Compactando Arquivo`
                    });

                    const configPaths = [
                        path.join(CLIENT_TEMP_PATH, "squarecloud.config"),
                        path.join(CLIENT_TEMP_PATH, "squarecloud.app")
                    ];

                    let configFilePath = null;
                    for (const p of configPaths) {
                        if (fs.existsSync(p)) {
                            configFilePath = p;
                            break;
                        }
                    }

                    if (!configFilePath) {
                        await feedbackMessage.edit({
                            content: `${Emojis.success} Processo Iniciado\n${Emojis.success} Extraindo Arquivos\n${Emojis.error} Erro: Arquivo de configuração não encontrado no ZIP.`
                        });
                        return;
                    }

                    let fileContent = fs.readFileSync(configFilePath, "utf-8");
                    const newDisplayNameLine = `DISPLAY_NAME=${userNameClean} Bot Free`;
                    const updatedContent = fileContent.replace(/^DISPLAY_NAME=.+$/m, newDisplayNameLine);
                    fs.writeFileSync(configFilePath, updatedContent);

                    const newZip = new AdmZip();
                    newZip.addLocalFolder(CLIENT_TEMP_PATH);
                    newZip.writeZip(novoZipPath);

                    // Processo: Preparando Ambiente
                    await feedbackMessage.edit({
                        content: `${Emojis.success} Processo Iniciado\n${Emojis.success} Extraindo Arquivos\n${Emojis.success} Compactando Arquivo\n${Emojis.loading} Preparando Ambiente`
                    });
                    await new Promise(resolve => setTimeout(resolve, 1000)); 

                    // Processo: Enviando para o nosso sistema (Squarecloud)
                    await feedbackMessage.edit({
                        content: `${Emojis.success} Processo Iniciado\n${Emojis.success} Extraindo Arquivos\n${Emojis.success} Compactando Arquivo\n${Emojis.success} Preparando Ambiente\n${Emojis.loading} Enviando para o nosso sistema`
                    });

                    try {
                        squareCloudAppData = await squareCloudApi.applications.create(novoZipPath);
                    } catch (squareCloudError) {
                        console.error("[ERRO] A criação do aplicativo na API da SquareCloud falhou:", squareCloudError);
                        await feedbackMessage.edit({
                            content: `${Emojis.success} Processo Iniciado\n${Emojis.success} Extraindo Arquivos\n${Emojis.success} Compactando Arquivo\n${Emojis.success} Preparando Ambiente\n${Emojis.error} Erro: Falha ao enviar para a SquareCloud.`
                        });
                        return;
                    } finally {
                        fs.unlink(novoZipPath, (err) => {
                            if (err) console.error("Erro ao apagar arquivo temporário após tentativa de upload:", err);
                        });
                    }

                    const appId = squareCloudAppData?.id ?? "ID_NAO_ENCONTRADO";
                    
                    if (appId === "ID_NAO_ENCONTRADO") {
                        console.error("❌ Falha crítica: ID do aplicativo não encontrado na resposta da Square Cloud API.", squareCloudAppData);
                        await feedbackMessage.edit({ 
                            content: `${Emojis.success} Processo Iniciado\n${Emojis.success} Extraindo Arquivos\n${Emojis.success} Compactando Arquivo\n${Emojis.success} Preparando Ambiente\n${Emojis.error} Erro: ID do bot não retornado pela SquareCloud.`
                        });
                        return;
                    }

                    // Processo: Cadastrando seu bot em nosso sistema
                    await feedbackMessage.edit({
                        content: `${Emojis.success} Processo Iniciado\n${Emojis.success} Extraindo Arquivos\n${Emojis.success} Compactando Arquivo\n${Emojis.success} Preparando Ambiente\n${Emojis.success} Enviando para o nosso sistema\n${Emojis.loading} Cadastrando seu bot em nosso sistema`
                    });
                    
                    const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
                    const expirationDateISO = expirationDate.toISOString();

                    const applications = readJsonFile(APPS_PATH, {});
                    applications[appId] = {
                        nome: `${userNameClean} Bot Free`,
                        dias: 1,
                        plano: "Teste Gratis",
                        quantia: 1,
                        dataExpiracao: expirationDateISO,
                        idapp: appId,
                        token: " ",
                        produto: selectedProduct,
                        owner: userId
                    };
                    writeJsonFile(APPS_PATH, applications);

                    // --- Registro do Resgate no resgates.json ---
                    const currentResgates = readJsonFile(RESGATES_PATH, {});
                    if (!currentResgates[userId]) {
                        currentResgates[userId] = [];
                    }
                    currentResgates[userId].push(selectedProduct);
                    writeJsonFile(RESGATES_PATH, currentResgates);
                    // --- Fim do Registro ---

                    // Processo: Bot cadastrado com sucesso!
                    await feedbackMessage.edit({
                        content: `${Emojis.success} Processo Iniciado\n${Emojis.success} Extraindo Arquivos\n${Emojis.success} Compactando Arquivo\n${Emojis.success} Preparando Ambiente\n${Emojis.success} Enviando para o nosso sistema\n${Emojis.success} Cadastrando seu bot em nosso sistema\n${Emojis.success} Bot cadastrado com sucesso!`
                    });

                    // --- Criação e Envio da Embed com Botões na thread ---
                    const embed = new EmbedBuilder()
                        .setColor("Green")
                        .setTitle(`Configure o seu bot`)
                        .setDescription("- Agora acesse o canal <#1383680669061746769> e use o comando `/apps` e gerencie seu bot\n\n-# Dica: Lembre-se de trocar o token do seu bot e após adicioná-lo em seu server, reinicie o bot!")
                        .setThumbnail(`https://images-ext-1.discordapp.net/external/DNZoVZTaco_m9cmpIopJ6x8OA7Dye9dK0wwfct5hxUQ/https/public-blob.squarecloud.dev/1057518718378324009/updatediscord_m9qfoswb-36fa.png?format=webp&quality=lossless`)
                        .setFooter({ text: "Este tópico será excluído automaticamente em 10 segundos." })
                        .setTimestamp();

                    const buttonRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel("Canal de Suporte")
                                .setStyle(ButtonStyle.Link)
                                .setURL("https://discord.com/channels/1377740528275296297/1377744107107123310"),
                            new ButtonBuilder()
                                .setLabel("Gerencie seu App aqui")
                                .setStyle(ButtonStyle.Link)
                                .setURL("https://discord.com/channels/1377740528275296297/1378788810695119009")
                        );

                    await interaction.channel.send({
                        embeds: [embed],
                        components: [buttonRow]
                    });

                    // --- Exclusão do Tópico após 10 segundos (com retry) ---
                    const deleteThread = async (thread, attempt = 1) => {
                        try {
                            if (!thread) {
                                console.warn(`[AVISO] Tentativa de deletar tópico falhou: Tópico não encontrado (null/undefined).`);
                                return;
                            }
                            if (!thread.isThread()) {
                                console.warn(`[AVISO] Tentativa de deletar canal '${thread.name}' (${thread.id}): Não é um tópico. Pulando exclusão.`);
                                return;
                            }

                            await thread.delete();
                            console.log(`[INFO] Tópico '${thread.name}' (${thread.id}) excluído com sucesso após ${attempt} tentativa(s).`);
                        } catch (deleteError) {
                            console.error(`❌ ERRO ao tentar deletar o tópico '${thread?.name}' (${thread?.id}) na tentativa ${attempt}:`, deleteError.message);
                            
                            if (attempt < 3 && deleteError.code === 50001) {
                                console.log(`[INFO] Retentando exclusão do tópico em 2 segundos... (Tentativa ${attempt + 1})`);
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                await deleteThread(thread, attempt + 1);
                            } else {
                                if (thread && !thread.deleted) {
                                    try {
                                        await thread.send({
                                            content: `${Emojis.error} Erro: Não foi possível excluir este tópico automaticamente. Por favor, um administrador deve excluí-lo manualmente.`,
                                            embeds: [], components: []
                                        });
                                    } catch (sendError) {
                                        console.error(`❌ ERRO ao enviar mensagem de falha na exclusão do tópico:`, sendError);
                                    }
                                }
                            }
                        }
                    };

                    setTimeout(() => deleteThread(interaction.channel), 10 * 1000);
                } catch (err) {
                    console.error("❌ ERRO ao processar o upload do produto:", err);
                    const novoZipPathExists = fs.existsSync(novoZipPath);
                    if (novoZipPathExists) {
                        fs.unlink(novoZipPath, (unlinkErr) => {
                            if (unlinkErr) console.error("Erro ao apagar arquivo temporário no catch geral:", unlinkErr);
                        });
                    }
                    await feedbackMessage.edit({ 
                        content: `${Emojis.error} Ocorreu um erro crítico durante o processo. Por favor, contate o suporte.\nErro: \`${err.message}\``
                    });
                } finally {
                    if (fs.existsSync(CLIENT_TEMP_PATH)) {
                       fs.rmSync(CLIENT_TEMP_PATH, { recursive: true, force: true });
                    }
                }
            }
        } catch (error) {
            console.error("❌ Ocorreu um erro geral na interação:", error);
            if (!interaction.deferred && !interaction.replied) {
                await interaction.reply({ content: "❌ Ocorreu um erro inesperado ao processar sua interação. Por favor, tente novamente.", ephemeral: true });
            } else if (interaction.deferred) {
                await interaction.editReply({ content: "❌ Ocorreu um erro inesperado ao processar sua interação. Por favor, tente novamente." });
            }
        }
    }
};