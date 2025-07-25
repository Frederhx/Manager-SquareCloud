const { ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { token, channelId } = require("../../config.json");
const colors = require("colors");
const axios = require("axios");
const { UploadEmojis } = require('../../FunctionEmojis/EmojisFunction.js');
const emojis = require("../../databases/emojis.json");
const { db2 } = require("../../databases/index"); // Assuming db2 is where applications are stored
const nodemailer = require("nodemailer"); // Make sure to install nodemailer: npm install nodemailer

// --- Email Transporter Configuration (FROM YOUR EXAMPLE) ---
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "email da sua apps pae",
        pass: "senha do google aq pae",
    },
});

// --- Temporary Storage for Recovery Process ---
const recoveryTempStorage = {}; // To store data during the multi-step recovery process

// --- Helper Functions (Adapted from your example, adjusted for db2) ---
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const Emojis = {
    get: (name) => emojis[name] || ""
};

// --- System Message Loop Configuration ---
const SYSTEM_MESSAGE_SETTINGS = {
    messageContent: "📡 Neste canal serão publicadas todas as atualizações recentes dos nossos sistemas.",
    buttonLabel: "Mensagem do Sistema",
    displayDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
    cooldownBeforeResend: 30 * 1000, // 30 seconds in milliseconds
};

module.exports = {
    name: "ready",
    run: async (client) => {
        console.log(`${colors.green(`[+Positive] - Estou online em ${client.user.displayName} | ${client.user.id}!`)}`);
        console.log(`${colors.green(`[+Positive] - Servindo ${client.users.cache.size} users.`)}`);
        console.log(`${colors.green(`[+Positive] - Estou em ${client.guilds.cache.size} servidores!`)}`);
        await UploadEmojis(client).then(() => console.log('\x1b[36m[Emojis]\x1b[0m Todos os emojis foram carregados com sucesso.')).catch(err => console.error('\x1b[31m[Emojis]\x1b[0m Erro ao carregar os emojis:', err));
        console.log(`${colors.blue(`[$Codder] - Exclusive manager, developed by @frederhx`)}`);

        client.user.setPresence({
            activities: [{
                name: `Manager 🤖`,
                type: ActivityType.Streaming,
                url: "https://twitch.tv/discord"
            }]
        });
        client.user.setStatus("idle");

        setDesc();
        sendMessage();
        startSystemMessageLoop(client); // Start the new system message loop

        // 🔁 Sempre escuta as interações
        client.on("interactionCreate", async (interaction) => {
            if (interaction.isButton()) {
                if (interaction.customId === "abrir_apps") {
                    const userApps = db2.all().filter(app => app.data.owner === interaction.user.id);

                    if (userApps.length === 0) {
                        return interaction.reply({
                            content: `${Emojis.get('negative')} | Você não tem nenhum bot em nosso sistema.`,
                            ephemeral: true
                        });
                    }

                    const select = new StringSelectMenuBuilder()
                        .setCustomId("appsconfig")
                        .setPlaceholder("🤖 Selecione uma Aplicação");

                    userApps.forEach(app => {
                        select.addOptions({
                            label: `${app.data.nome} - ${app.data.idapp}`,
                            description: `${app.data.produto}`,
                            value: `${app.data.idapp}`
                        });
                    });

                    await interaction.reply({
                        content: `Selecione abaixo a aplicação que deseja gerenciar:`,
                        components: [new ActionRowBuilder().addComponents(select)],
                        ephemeral: true
                    });
                } else if (interaction.customId === "recuperar_aplicacao") {
                    // Show a modal to get the user's email
                    const modal = new ModalBuilder()
                        .setCustomId('recovery_email_modal')
                        .setTitle('Recuperação de Aplicação');

                    const emailInput = new TextInputBuilder()
                        .setCustomId('recovery_email_input')
                        .setLabel("Qual o email cadastrado na aplicação?")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("seuemail@exemplo.com")
                        .setRequired(true);

                    const firstActionRow = new ActionRowBuilder().addComponents(emailInput);
                    modal.addComponents(firstActionRow);

                    await interaction.showModal(modal);

                } else if (interaction.customId === "send_recovery_code") {
                    // This button is clicked after the email check, to send the code
                    await interaction.deferUpdate(); // Acknowledge button click immediately

                    const userId = interaction.user.id;
                    const recoveryData = recoveryTempStorage[userId];

                    if (!recoveryData || !recoveryData.email) {
                        return interaction.followUp({
                            content: `${Emojis.get('negative')} | Algo deu errado na sua sessão de recuperação. Tente novamente.`,
                            ephemeral: true
                        });
                    }

                    const email = recoveryData.email;
                    const transferCode = generateCode();
                    recoveryTempStorage[userId].transferCode = transferCode;

                    try {
                        await transporter.sendMail({
                            from: "ryzensolutions.app@gmail.com",
                            to: email,
                            subject: "Código de Transferência de Propriedade - Sky Apps",
                            text: `Olá! Você solicitou um código para recuperar a propriedade de suas aplicações na Sky Apps.\n\nSeu código de transferência é: ${transferCode}\n\nEste código é válido por 6 minutos. Digite-o no Discord para continuar a recuperação.\n\nSe você não solicitou isso, pode ignorar este e-mail.`,
                        });
                    } catch (err) {
                        console.error("Erro ao enviar e-mail de recuperação:", err);
                        return interaction.followUp({
                            content: `${Emojis.get("negative")} | Não foi possível enviar o código para este e-mail. Verifique se o e-mail está correto e tente novamente.`,
                            ephemeral: true,
                        });
                    }

                    const expirationTime = Math.floor((Date.now() + 360 * 1000) / 1000); // 6 minutos

                    const msgCodigoEnviado = await interaction.followUp({
                        content: `${Emojis.get("email")} Um código de recuperação foi enviado para \`${email}\`. Digite-o aqui neste canal em até <t:${expirationTime}:R>.`,
                        ephemeral: true,
                    });

                    // Start collecting the next message for the code
                    const collector = interaction.channel.createMessageCollector({
                        filter: (m) => m.author.id === userId,
                        time: 360 * 1000, // 6 minutes
                        max: 1,
                    });

                    collector.on("collect", async (msg) => {
                        const responseCode = msg.content.trim();
                        const storedData = recoveryTempStorage[userId];

                        if (!storedData || responseCode !== storedData.transferCode) {
                            delete recoveryTempStorage[userId]; // Clear data on incorrect code
                            try { await msgCodigoEnviado.delete(); } catch {} // Try to delete the prompt message

                            return interaction.followUp({
                                content: `${Emojis.get("negative")} | Código de recuperação inválido ou expirado. Por favor, tente novamente.`,
                                ephemeral: true,
                            });
                        }

                        // Code is correct, proceed with transfer
                        let apps = db2.all(); // Reload apps to ensure latest state
                        let transferredBotsCount = 0;

                        if (storedData.botsToRecover && storedData.botsToRecover.length > 0) {
                            storedData.botsToRecover.forEach(appId => {
                                // Find the bot in db2 by idapp
                                const appIndex = apps.findIndex(app => app.data.idapp === appId);
                                if (appIndex !== -1) {
                                    apps[appIndex].data.owner = userId; // Update owner
                                    db2.set(apps[appIndex].ID, apps[appIndex].data); // Save the updated data back
                                    transferredBotsCount++;
                                }
                            });
                        }
                        
                        delete recoveryTempStorage[userId]; // Clear temp data after successful transfer

                        try { await msgCodigoEnviado.delete(); } catch {}

                        if (transferredBotsCount > 0) {
                            return interaction.followUp({
                                content: `${Emojis.get("checker")} | ${transferredBotsCount} bot(s) foram transferidos para sua conta com sucesso!`,
                                ephemeral: true,
                            });
                        } else {
                            return interaction.followUp({
                                content: `${Emojis.get("info")} | Nenhuma aplicação encontrada para transferir ou já vinculada à sua conta.`,
                                ephemeral: true,
                            });
                        }
                    });

                    collector.on("end", async (_, reason) => {
                        if (reason === "time") {
                            delete recoveryTempStorage[userId]; // Clear temp data on timeout
                            try { await msgCodigoEnviado.delete(); } catch {}
                            await interaction.followUp({
                                content: `⏰ Tempo para inserir o código expirou. Por favor, inicie a recuperação novamente.`,
                                ephemeral: true,
                            });
                        }
                    });
                }
                 // Prevent interaction with the system message button
                if (interaction.customId === "system_message_button") {
                    await interaction.deferUpdate(); // Acknowledge the interaction without doing anything visible
                    return;
                }

            } else if (interaction.isModalSubmit()) {
                if (interaction.customId === 'recovery_email_modal') {
                    const email = interaction.fields.getTextInputValue('recovery_email_input');
                    const userId = interaction.user.id;

                    if (!email || !email.includes("@")) {
                        return interaction.reply({
                            content: `${Emojis.get("negative")} | Por favor, forneça um e-mail válido.`,
                            ephemeral: true,
                        });
                    }

                    await interaction.deferReply({ ephemeral: true }); // Defer to show loading

                    const allApps = db2.all();
                    const botsWithEmail = allApps.filter(app => app.data.email === email);

                    if (botsWithEmail.length > 0) {
                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("send_recovery_code")
                                .setLabel("Enviar Código de Recuperação")
                                .setEmoji(Emojis.get('email')) // Using your email emoji
                                .setStyle(2) // Green button for sending code
                        );

                        // Store relevant data for the next step (sending code)
                        recoveryTempStorage[userId] = {
                            email: email,
                            botsToRecover: botsWithEmail.map(app => app.data.idapp), // Store IDs of bots to recover
                        };

                        await interaction.editReply({
                            content: `${Emojis.get("info")} | Encontramos **${botsWithEmail.length} aplicação(ões)** registrada(s) com o e-mail \`${email}\`.\n\nPara transferir a propriedade para sua conta do Discord, clique no botão abaixo para receber um código de recuperação por e-mail.`,
                            components: [row],
                            ephemeral: true,
                        });
                    } else {
                        return interaction.editReply({
                            content: `${Emojis.get("negative")} | Não encontramos nenhuma aplicação registrada com o e-mail \`${email}\` em nosso sistema.`,
                            ephemeral: true,
                        });
                    }
                }
            } else if (interaction.isStringSelectMenu()) {
                if (interaction.customId === "appsconfig") {
                    // Your existing select menu handling for 'appsconfig'
                    // No changes needed here, just ensuring it's still present
                }
            }
        });

        function setDesc() {
            axios.patch('https://discord.com/api/v10/applications/@me', {
                description: `**F$ SysteM Apps**`
            },
            {
                headers: {
                    Authorization: `Bot ${token}`,
                    'Content-Type': `application/json`
                }
            }).catch(() => {});
        }

        async function sendMessage() {
            const channel = client.channels.cache.get(channelId);
            if (!channel) return console.error(`\x1b[31m[Erro]\x1b[0m Canal não encontrado: ${channelId}`);
            
            const guild = channel.guild;
            const iconURL = guild.iconURL({ dynamic: true, size: 1024 });

            const embed = new EmbedBuilder()
                .setColor("#5865F2")
                .setAuthor({ name: `${guild.name} - Centro de Gerenciamento`, iconURL })
                .setThumbnail(iconURL)
                .setTitle("Gerencie suas Aplicações")
                .setDescription(
                    "- **Utilize </apps:1383692327243219082> Para Gerenciar sua Aplicação de Vendas ou Ticket & Entre Outros**\n" +
                    "- **Utilize </auth:1383874202029002853> Para Gerenciar sua Aplicação de Auth02**\n"+
                    "- **Utilize </restore:1383692327243219083> Para Recuperar Seus Bots**"
                )
                .setFooter({ text: "Sky Apps", iconURL });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("abrir_apps")
                        .setLabel("Acessar Painel de Controle")
                        .setEmoji("1383550271057166356")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("recuperar_aplicacao") // New custom ID for recovery button
                        .setLabel("Recuperar Aplicação")
                        .setEmoji("1383861893671686164") // Example emoji, replace with a relevant one
                        .setStyle(2)
                );

            // Fetch existing messages in the channel to avoid sending duplicate panels
            const messages = await channel.messages.fetch({ limit: 10 });
            const existingPanel = messages.find(m =>
                m.embeds.length > 0 &&
                m.embeds[0].title === "Gerencie suas Aplicações" &&
                m.components.some(comp =>
                    comp.components.some(btn => btn.customId === "abrir_apps")
                )
            );

            if (!existingPanel) {
                await channel.send({ embeds: [embed], components: [row] }).catch(err => console.error("Erro ao enviar a mensagem: ", err));
                console.log(`📩 Painel de gerenciamento de aplicações enviado automaticamente para ${channel.name}.`);
            } else {
                console.log(`✅ Painel de gerenciamento de aplicações já existe em ${channel.name}. Não foi necessário enviar novamente.`);
            }
        }

        /**
         * Starts a looping system message in the specified channel.
         * The message displays for a set duration, then gets deleted,
         * waits a cooldown, and then resends.
         * @param {Client} client The Discord client instance.
         */
        async function startSystemMessageLoop(client) {
            const channel = client.channels.cache.get(`1377743859064504371`);
            if (!channel) {
                console.error(`\x1b[31m[Erro]\x1b[0m Canal para mensagem do sistema não encontrado: ${channelId}`);
                return;
            }

            const sendSystemMessage = async () => {
                const systemButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("system_message_button")
                        .setLabel(SYSTEM_MESSAGE_SETTINGS.buttonLabel)
                        .setStyle(2)
                        .setDisabled(true) // Make it non-clickable
                );

                try {
                    const sentMessage = await channel.send({
                        content: SYSTEM_MESSAGE_SETTINGS.messageContent,
                        components: [systemButton]
                    });

                    // Set a timeout to delete the message
                    setTimeout(async () => {
                        try {
                            await sentMessage.delete();
                            console.log(`[Sistema] Mensagem do sistema deletada.`);
                        } catch (err) {
                            console.error(`[Sistema] Erro ao deletar mensagem do sistema:`, err);
                        } finally {
                            // After deleting, wait for cooldown then send again
                            setTimeout(sendSystemMessage, SYSTEM_MESSAGE_SETTINGS.cooldownBeforeResend);
                        }
                    }, SYSTEM_MESSAGE_SETTINGS.displayDuration);

                } catch (err) {
                    console.error(`[Sistema] Erro ao enviar mensagem do sistema:`, err);
                    // If sending fails, wait for cooldown and try again
                    setTimeout(sendSystemMessage, SYSTEM_MESSAGE_SETTINGS.cooldownBeforeResend);
                }
            };

            // Initial call to start the loop
            sendSystemMessage();
        }
    }
};