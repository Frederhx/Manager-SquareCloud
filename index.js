const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ApplicationCommandType,
  ModalBuilder, // Import ModalBuilder
  TextInputBuilder, // Import TextInputBuilder
  TextInputStyle // Import TextInputStyle
} = require("discord.js");
console.clear();
const configJson = require('./config.json');
const { perms, Emojis } = require("./databases/index"); // Ajuste o caminho se necessário
const axios = require("axios");
const fs = require('node:fs');
const path = require('node:path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User
  ]
});

module.exports = client;

client.slashCommands = new Collection();

const { token } = require("./config.json");

// --- Configuração Centralizada do Sistema de Tickets ---
const config = {
  panelChannelId: "PAINEL CANAL ID", // << Mude pelo id do canal do painel de controle
  ticketCategory: "ID CATEGORIA", // << SUBSTITUA PELO ID DA SUA CATEGORIA
  adminRoleId: "ID CARGO ADM", // ID do Cargo de Administrador

  embed: {
    author: "Central De Atendimento",
    color: "#2F3136",
    description:
      "**Bem-vindo ao painel de tickets.** Antes de abrir um ticket, leia atentamente as informações abaixo para garantir um atendimento eficiente e evitar punições.\n\n" +
      "**Horário de Atendimento**\n" +
      "Nosso suporte está disponível nos seguintes horários:\n" +
      "• Segunda a sexta-feira: 8h às 21h\n" +
      "• Exceto finais de semana e feriados\n\n" +
      "**Uso de Tickets**\n" +
      "Os tickets devem ser utilizados exclusivamente para assuntos relacionados à compra ou dúvidas sobre nossos bots. Tickets fora desse contexto serão encerrados sem resposta.",
  },
  messages: {
    noPermission: `${Emojis.get("negative")} Você não tem permissão para isso.`,
    panelSent: `${Emojis.get("checker")} Painel Gerado com sucesso!`,
    pleaseWait: `${Emojis.get("loading")} Aguarde um Momento...`,
    alreadyOpen: (channel) =>
      `${Emojis.get("negative")} Você já possui um atendimento aberto: ${channel}`,
    ticketCreated: (channel) =>
      `${Emojis.get("checker")} Canal criado com sucesso: ${channel}`,
    welcomeMessage: (user) => `Olá ${user}, em que posso te ajudar?`,
    ticketClosed: `${Emojis.get("checker")} Atendimento encerrado. Canal será deletado em 5 segundos.`,
    adminOnlyClose: `${Emojis.get("negative")} Apenas administradores podem encerrar atendimentos.`,
    ticketRenamed: (newName) => `${Emojis.get("checker")} O ticket foi renomeado para **${newName}**.`,
    notifyUserDM: (channelURL) => `Olá! Viemos te notificar que há uma atualização em seu ticket. Por favor, acesse-o para verificar: ${channelURL}`,
    notifySuccess: `${Emojis.get("checker")} O usuário foi notificado com sucesso na DM.`,
    notifyFailDM: `${Emojis.get("negative")} Não foi possível enviar a notificação para a DM do usuário.`,
    noUserInTicket: `${Emojis.get("negative")} Não foi possível identificar o usuário principal deste ticket.`,
  },
  ticketCloseDelay: 5000,
};

// --- Evento de Pronto (Bot Ligado) ---
client.on("ready", async () => {
  console.log(`✅ O bot ${client.user.tag} está online!`);

  // --- Enviar Painel de Atendimento Automaticamente ---
  try {
    const channel = await client.channels.fetch(config.panelChannelId);
    if (!channel) {
      console.error(`❌ Canal com ID ${config.panelChannelId} não encontrado.`);
      return;
    }
    if (channel.type !== ChannelType.GuildText) {
        console.error(`❌ O canal ${config.panelChannelId} não é um canal de texto.`);
        return;
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: config.embed.author })
      .setDescription(config.embed.description)
      .setColor(config.embed.color);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("abrir_ticket")
        .setLabel("Iniciar Atendimento")
        .setStyle(ButtonStyle.Secondary)
    );

    // Fetch existing messages in the channel to avoid sending duplicate panels
    const messages = await channel.messages.fetch({ limit: 10 });
    const existingPanel = messages.find(m =>
      m.embeds.length > 0 &&
      m.embeds[0].author &&
      m.embeds[0].author.name === config.embed.author &&
      m.components.some(comp =>
        comp.components.some(btn => btn.customId === "abrir_ticket")
      )
    );

    if (!existingPanel) {
      await channel.send({ embeds: [embed], components: [row] });
      console.log(`📩 Painel de atendimento enviado automaticamente para ${channel.name}.`);
    } else {
      console.log(`✅ Painel de atendimento já existe em ${channel.name}. Não foi necessário enviar novamente.`);
    }

  } catch (error) {
    console.error(`❌ Erro ao enviar o painel de atendimento automático:`, error);
  }
});

// --- Carregamento de Outros Eventos e Comandos (se você tiver handlers) ---
const evento = require("./handler/Events");
evento.run(client);

require("./handler/index")(client);

// --- Listeners de Erro do Processo ---
process.on('unhandledRejection', (reason, promise) => {
  console.log(`🚫 Erro Detectado (unhandledRejection):\n`, reason, promise);
});

process.on('uncaughtException', (error) => {
  console.log(`🚫 Erro Detectado (uncaughtException):\n`, error);
});

// --- Atualização da Descrição da Aplicação ---
const url = 'https://discord.com/api/v10/applications/@me';
const data = {
  description: `<:viptraco:1329244462110609519> | <:bot:1376297705118371962> Bot Manager
<:viptraco:1329244462110609519> | <:est_foguete:1373707438615953418> Tecnologia **Sky Apps**
<:viptraco:1329244462110609519> | <:b_link:1284945382849118259>  **Sky Apps**: https://discord.gg/ykwQ8kSVdr`,
};

axios.patch(url, data, {
  headers: {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json'
  }
}).catch((error) => {
  console.error(`❌ Erro ao atualizar descrição da aplicação: ${error}`);
});

// --- Listener de Interações (Botões 'termos', 'faq', 'abrir_ticket', 'fechar_ticket', 'notificar_usuario', 'renomear_ticket') ---
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === "termos") {
      await interaction.reply({
        content: `# Utilização dos serviços
1. Todas as transações efetuadas estão restritas a produtos virtuais, excluindo-se produtos físicos ou entregas domiciliares.
2. Ao utilizar nossos Serviços, você automaticamente concorda com nossos Termos. O não cumprimento destes pode resultar em restrição de uso.
# Seus direitos ao utilizar os Serviços da Sky Apps
3. Você tem o direito de utilizar nossos Serviços conforme suas funcionalidades, desde que não seja para atividades ilícitas como furtos ou roubos.
# Política de reembolso
4. Todas as transações são voluntárias.
5. O reembolso só é possível mediante solicitação à equipe da Sky Apps. Não será concedido em casos de violação dos termos ou políticas de uso, incluindo atos ilegais ou violações de direitos autorais.
6. Não realizamos reembolsos por arrependimento. Recomendamos a visualização dos previews do bot para esclarecer dúvidas.
7. Abrir disputa com a empresa processadora de pagamento resultará no cancelamento do direito de reembolso.
# Política de Compra de Bots
8. Comprometemo-nos a manter seu bot online 24 horas por dia até o término do plano.
9. Dias adicionais serão fornecidos somente se o bot ficar offline por mais de 48 horas. Abra um ticket em nosso suporte antes de solicitar a extensão.
10. Em caso de suspensão da conta Discord, não garantimos a devolução da aplicação. Recomendamos transferir a posse dos bots para uma conta alternativa segura.
11. Erros no ID durante a aquisição ou transferência são responsabilidade do usuário.`,
        ephemeral: true
      });
    }

    if (interaction.customId === "faq") {
      await interaction.reply({
        content: `1. **Como posso adquirir um bot?** Para adquirir um bot, explore a variedade disponível nos canais específicos dos bots, como Vendas. Clique no botão no canal específico do bot desejado para fazer a compra.

2. **Como recebo meu bot após a compra?** Após a compra, você receberá um tutorial em seu carrinho com todas as informações necessárias. Com essas informações, você poderá configurar seu bot automaticamente.

3. **Como faço para renovar minha aplicação?** Para renovar sua aplicação, simplesmente utilize o comando /renovar no canal comandos. Após o pagamento, a quantidade de dias comprada será adicionada à sua aplicação, estendendo sua validade.

4.** Meu bot fica online 24 horas por dia?** Sim, seu bot permanecerá online 24/7. Embora imprevistos possam ocorrer, caso seu bot caia, basta ligá-lo com o comando /apps em comandos. Se persistir o problema, contate nosso suporte.

5. **Como saber quando meu bot vai expirar?** Você pode verificar a data de expiração via /apps ou aguardar a mensagem de expiração enviada pelo nosso manager em sua mensagem privada (enviada 3 dias antes do vencimento).

6. **Como setar permissão no bot de vendas?** Após adicionar o seu bot em algum servidor, utilize o seguinte comando /permadd e mencione o seu perfil.`,
        ephemeral: true
      });
    }

    // --- Lógica para o botão 'abrir_ticket' (Sistema de Tickets) ---
    if (interaction.customId === "abrir_ticket") {
      await interaction.reply({
        content: config.messages.pleaseWait,
        ephemeral: true,
      });

      const user = interaction.user;
      const guild = interaction.guild;

      const sanitizedUsername = user.username.toLowerCase().replace(/[^a-z0-9-]/g, '');
      const channelName = `📞・${sanitizedUsername}`;

      const existingChannel = guild.channels.cache.find(
        (c) => c.name === channelName && c.parentId === config.ticketCategory
      );

      if (existingChannel) {
        return interaction.editReply({
          content: config.messages.alreadyOpen(existingChannel),
          ephemeral: true,
        });
      }

      try {
        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: config.ticketCategory,
          permissionOverwrites: [
            { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            {
              id: config.adminRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels,
              ],
            },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
          ],
        });

        const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("notificar_usuario")
            .setLabel("Notificar User")
            .setStyle(2)
            .setEmoji("<:notifications_active_24dp_E3E3E3:1384934820299411497>"),
         new ButtonBuilder()
            .setCustomId("renomear_ticket")
            .setLabel("Renomear")
            .setStyle(2)
            .setEmoji("<:edit_24dp_E3E3E3_FILL0_wght400_G:1384934817308872785>"),
          new ButtonBuilder()
            .setCustomId("fechar_ticket")
            .setLabel("Encerrar")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("<:delete_24dp_E3E3E3_FILL0_wght400:1384020979591806986>")

        );

        await ticketChannel.send({ content: `${config.messages.welcomeMessage(user)} <@&${config.adminRoleId}>`, components: [closeRow] });

        // --- NOVIDADE AQUI: Botão de redirecionamento para o canal do ticket ---
        const goToTicketButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Ir para o Ticket")
            .setStyle(ButtonStyle.Link) // Estilo Link para redirecionar para uma URL
            .setURL(ticketChannel.url) // A URL do canal do ticket
        );

        // A mensagem de resposta agora inclui o botão de redirecionamento
        await interaction.editReply({
            content: config.messages.ticketCreated(ticketChannel),
            components: [goToTicketButton], // Adiciona a ActionRow com o botão
            ephemeral: true
        });

      } catch (error) {
        console.error("Erro ao criar o canal do ticket:", error);
        await interaction.editReply({
          content: `${Emojis.get("negative")} Ocorreu um erro ao criar o canal de atendimento. Por favor, tente novamente mais tarde.`,
          ephemeral: true,
        });
      }
    }

    // --- Lógica para o botão 'fechar_ticket' (Sistema de Tickets) ---
    if (interaction.customId === "fechar_ticket") {
      const member = interaction.member;
      if (!member || !member.roles.cache.has(config.adminRoleId)) {
        return interaction.reply({
          content: config.messages.adminOnlyClose,
          ephemeral: true,
        });
      }

      const channelToClose = interaction.channel;
      await interaction.reply({ content: config.messages.ticketClosed, ephemeral: true });

      setTimeout(async () => {
        try {
          await channelToClose.delete();
        } catch (error) {
          console.error(`Erro ao deletar o canal do ticket ${channelToClose.name}:`, error);
        }
      }, config.ticketCloseDelay);
    }

    // --- Lógica para o botão 'notificar_usuario' (Novo) ---
    if (interaction.customId === "notificar_usuario") {
      const member = interaction.member;
      if (!member || !member.roles.cache.has(config.adminRoleId)) {
        return interaction.reply({
          content: config.messages.noPermission,
          ephemeral: true,
        });
      }

      const ticketChannel = interaction.channel;
      // Extract the user ID from the channel permissions, assuming the user is the only non-admin with view access
      const userOverwrite = ticketChannel.permissionOverwrites.cache.find(
        (overwrite) => overwrite.allow.has(PermissionFlagsBits.ViewChannel) && overwrite.id !== interaction.guild.roles.everyone.id && overwrite.id !== config.adminRoleId && overwrite.id !== client.user.id
      );

      if (!userOverwrite) {
        return interaction.reply({
          content: config.messages.noUserInTicket,
          ephemeral: true,
        });
      }

      const ticketOwner = await client.users.fetch(userOverwrite.id).catch(() => null);

      if (!ticketOwner) {
        return interaction.reply({
          content: config.messages.noUserInTicket,
          ephemeral: true,
        });
      }

      try {
        const goToTicketButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Ir para o Ticket")
            .setStyle(ButtonStyle.Link)
            .setURL(ticketChannel.url)
        );
        await ticketOwner.send({ content: config.messages.notifyUserDM(ticketChannel.url), components: [goToTicketButton] });
        await interaction.reply({ content: config.messages.notifySuccess, ephemeral: true });
      } catch (error) {
        console.error(`Erro ao notificar o usuário ${ticketOwner.tag}:`, error);
        await interaction.reply({ content: config.messages.notifyFailDM, ephemeral: true });
      }
    }

    // --- Lógica para o botão 'renomear_ticket' (Novo) ---
    if (interaction.customId === "renomear_ticket") {
      const member = interaction.member;
      if (!member || !member.roles.cache.has(config.adminRoleId)) {
        return interaction.reply({
          content: config.messages.noPermission,
          ephemeral: true,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("rename_ticket_modal")
        .setTitle("Renomear Ticket");

      const newNameInput = new TextInputBuilder()
        .setCustomId("new_ticket_name")
        .setLabel("Novo nome para o ticket")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Ex: duvida-sobre-bot")
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(newNameInput);

      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);
    }
  }

  // --- Lógica para o envio do formulário de renomear ticket (Novo) ---
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "rename_ticket_modal") {
      const member = interaction.member;
      if (!member || !member.roles.cache.has(config.adminRoleId)) {
        return interaction.reply({
          content: config.messages.noPermission,
          ephemeral: true,
        });
      }

      const newName = interaction.fields.getTextInputValue("new_ticket_name");
      const currentChannel = interaction.channel;

      try {
        await currentChannel.setName(newName);
        await interaction.reply({ content: config.messages.ticketRenamed(newName), ephemeral: true });
      } catch (error) {
        console.error(`Erro ao renomear o canal ${currentChannel.name}:`, error);
        await interaction.reply({ content: `${Emojis.get("negative")} Ocorreu um erro ao renomear o ticket.`, ephemeral: true });
      }
    }
  }
});

client.login(token);