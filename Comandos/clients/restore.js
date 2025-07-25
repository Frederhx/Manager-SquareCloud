const Discord = require("discord.js");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const { Emojis } = require("../../databases/index.js");

// Centralized temporary storage for verification codes
const tempStorage = new Map();
const APPLICATIONS_FILE_PATH = path.join(__dirname, "../../databases/applications.json");

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "ryzensolutions.app@gmail.com",
    pass: "rwtn ufnx vprg jpre", // It's highly recommended to use environment variables for sensitive data
  },
});

/**
 * Generates a 6-digit random code.
 * @returns {string} The generated code.
 */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Loads application data from the JSON file.
 * @returns {object} The loaded applications data.
 */
function loadApplications() {
  try {
    const rawData = fs.readFileSync(APPLICATIONS_FILE_PATH, "utf8");
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error loading applications:", error);
    return {}; // Return empty object if file doesn't exist or is invalid
  }
}

/**
 * Saves application data to the JSON file.
 * @param {object} apps - The applications data to save.
 */
function saveApplications(apps) {
  try {
    fs.writeFileSync(APPLICATIONS_FILE_PATH, JSON.stringify(apps, null, 2));
  } catch (error) {
    console.error("Error saving applications:", error);
  }
}

// Command definition
module.exports = {
  name: "restore",
  description: "[👥|Clientes] Recupere seus bots usando seu email.",
  type: Discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "email",
      description: "Email para envio do código de recuperação.",
      type: Discord.ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  /**
   * Main run function for the restore command.
   * @param {Discord.Client} client - The Discord client.
   * @param {Discord.ChatInputCommandInteraction} interaction - The interaction object.
   */
  run: async (client, interaction) => {
    const userId = interaction.user.id;
    const email = interaction.options.getString("email").toLowerCase(); // Normalize email to lowercase

    // Input validation
    if (!email || !email.includes("@") || !email.includes(".")) {
      return interaction.reply({
        content: `${Emojis.get("negative")} Por favor, forneça um e-mail válido.`,
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: `${Emojis.get("loading")} Verificando informações...`,
      ephemeral: true,
    });

    let applications = loadApplications();

    // Check if the email is already linked to the user's current bots
    const isAlreadyLinked = Object.values(applications).some(
      (app) => app.owner === userId && app.email === email
    );

    if (isAlreadyLinked) {
      return interaction.followUp({
        content: `${Emojis.get("negative")} Este e-mail já está vinculado aos seus bots.`,
        ephemeral: true,
      });
    }

    // Filter bots associated with the provided email, excluding those already owned by the user
    const botsWithEmail = Object.entries(applications).filter(
      ([_, app]) => app.email === email && app.owner !== userId
    );

    // Scenario: Email is linked to bots owned by another account
    if (botsWithEmail.length > 0) {
      const transferButton = new Discord.ButtonBuilder()
        .setCustomId("send_transfer_code")
        .setLabel("Enviar E-mail de Recuperação")
        .setEmoji("1383669752286806188") // Ensure this emoji ID is correct and accessible
        .setStyle(Discord.ButtonStyle.Secondary);

      const actionRow = new Discord.ActionRowBuilder().addComponents(transferButton);

      await interaction.followUp({
        content: `${Emojis.get("info")} Este e-mail está vinculado a **${botsWithEmail.length} bot(s)** cadastrados em outra conta. Se você perdeu o acesso a essa conta, clique no botão abaixo para enviar um código de recuperação e transferir seus aplicativos.`,
        components: [actionRow],
        ephemeral: true,
      });

      // Await button interaction
      const filter = (i) => i.customId === "send_transfer_code" && i.user.id === userId;
      try {
        const buttonInteraction = await interaction.channel.awaitMessageComponent({
          filter,
          time: 300000, // 5 minutes
          errors: ["time"],
        });

        await buttonInteraction.deferUpdate();

        const transferCode = generateCode();
        tempStorage.set(userId, {
          email,
          code: transferCode, // Using 'code' for consistency
          botsToTransfer: botsWithEmail.map(([id]) => id),
          type: "transfer", // Indicate this is a transfer operation
        });

        // Send transfer code via email
        try {
          await transporter.sendMail({
            from: "ilusionsolutionsrobot@gmail.com",
            to: email,
            subject: "Código de Recuperação de Propriedade - Sky Apps",
            html: `<p>Olá!</p>
                   <p>Seu código de recuperação para transferir a propriedade dos seus bots é: <strong>${transferCode}</strong></p>
                   <p>Este código é válido por 6 minutos.</p>
                   <p>Atenciosamente,<br>Sky Apps</p>`,
          });
        } catch (mailError) {
          console.error("Error sending transfer email:", mailError);
          tempStorage.delete(userId); // Clear temporary data
          return interaction.followUp({
            content: `${Emojis.get("negative")} Não foi possível enviar o código para esse e-mail. Por favor, verifique se o e-mail está correto e tente novamente.`,
            ephemeral: true,
          });
        }

        const endTime = Math.floor((Date.now() + 360000) / 1000); // 6 minutes from now

        const codePromptMessage = await interaction.followUp({
          content: `${Emojis.get("email")} Um código de recuperação foi enviado para \`${email}\`. Por favor, digite-o aqui neste canal em até <t:${endTime}:R>.`,
          ephemeral: true,
        });

        // Await user's code input
        const messageCollector = interaction.channel.createMessageCollector({
          filter: (m) => m.author.id === userId,
          time: 360000, // 6 minutes
          max: 1,
        });

        messageCollector.on("collect", async (msg) => {
          const userResponse = msg.content.trim();
          const storedData = tempStorage.get(userId);

          if (!storedData || userResponse !== storedData.code || storedData.type !== "transfer") {
            tempStorage.delete(userId);
            if (codePromptMessage) await codePromptMessage.delete().catch(() => {});
            return interaction.followUp({
              content: `${Emojis.get("negative")} Código de recuperação inválido ou expirado.`,
              ephemeral: true,
            });
          }

          // Perform bot ownership transfer
          storedData.botsToTransfer.forEach((botId) => {
            if (applications[botId]) {
              applications[botId].owner = userId;
              applications[botId].email = email; // Also update the email to the new owner's email
            }
          });
          saveApplications(applications);
          tempStorage.delete(userId);

          if (codePromptMessage) await codePromptMessage.delete().catch(() => {});
          return interaction.followUp({
            content: `${Emojis.get("checker")} **${storedData.botsToTransfer.length} bot(s)** foram transferidos para sua conta com sucesso.`,
            ephemeral: true,
          });
        });

        messageCollector.on("end", async (_, reason) => {
          if (reason === "time") {
            tempStorage.delete(userId); // Clear data if time expires
            if (codePromptMessage) await codePromptMessage.delete().catch(() => {});
            await interaction.followUp({
              content: "⏰ Tempo para digitar o código expirou. Por favor, utilize o comando novamente.",
              ephemeral: true,
            });
          }
        });

        return; // Exit after handling transfer flow
      } catch (awaitError) {
        if (awaitError.message.includes("time")) {
          return interaction.followUp({
            content: "⏰ Tempo para interagir com o botão expirou. Por favor, utilize o comando novamente.",
            ephemeral: true,
          });
        }
        console.error("Error awaiting button interaction:", awaitError);
        return interaction.followUp({
          content: `${Emojis.get("negative")} Ocorreu um erro inesperado. Por favor, tente novamente.`,
          ephemeral: true,
        });
      }
    }

    // Scenario: No bots linked to this email or linked to user's current account.
    // Proceed to link the email to the user's existing bots (if any) or prepare for future linking.

    const verificationCode = generateCode();
    tempStorage.set(userId, {
      code: verificationCode,
      email: email,
      type: "verification", // Indicate this is a general verification operation
    });

    try {
      await transporter.sendMail({
        from: "ilusionsolutionsrobot@gmail.com",
        to: email,
        subject: "Código de Verificação - Sky Apps",
        html: `<p>Olá!</p>
               <p>Seu código de verificação é: <strong>${verificationCode}</strong></p>
               <p>Este código é válido por 6 minutos.</p>
               <p>Atenciosamente,<br>Sky Apps</p>`,
      });
    } catch (mailError) {
      console.error("Error sending verification email:", mailError);
      tempStorage.delete(userId);
      return interaction.followUp({
        content: `${Emojis.get("negative")} Não foi possível enviar o código para esse e-mail. Por favor, verifique se o e-mail está correto e tente novamente.`,
        ephemeral: true,
      });
    }

    const endTime = Math.floor((Date.now() + 360000) / 1000); // 6 minutes from now

    const codePromptMessage = await interaction.followUp({
      content: `${Emojis.get("email")} Enviamos um código para \`${email}\`. Por favor, digite-o aqui neste canal em até <t:${endTime}:R>.`,
      ephemeral: true,
    });

    const collector = interaction.channel.createMessageCollector({
      filter: (m) => m.author.id === userId,
      time: 360000, // 6 minutes
      max: 1,
    });

    collector.on("collect", async (msg) => {
      const userResponse = msg.content.trim();
      const storedData = tempStorage.get(userId);

      if (!storedData || userResponse !== storedData.code || storedData.type !== "verification") {
        tempStorage.delete(userId);
        if (codePromptMessage) await codePromptMessage.delete().catch(() => {});
        return interaction.followUp({
          content: `${Emojis.get("negative")} O código está incorreto ou expirou.`,
          ephemeral: true,
        });
      }

      const confirmedEmail = storedData.email;
      tempStorage.delete(userId); // Clear the temporary storage

      // Reload applications to ensure the most current data before saving
      applications = loadApplications();

      // Find bots currently owned by the user
      const userOwnedBots = Object.entries(applications).filter(
        ([_, app]) => app.owner === userId
      );

      if (userOwnedBots.length > 0) {
        // Update the email for all bots owned by the current user
        userOwnedBots.forEach(([id, app]) => {
          app.email = confirmedEmail;
          applications[id] = app;
        });
        saveApplications(applications);

        if (codePromptMessage) await codePromptMessage.delete().catch(() => {});
        return interaction.followUp({
          content: `${Emojis.get("checker")} E-mail \`${confirmedEmail}\` vinculado a **${userOwnedBots.length} bot(s)** com sucesso.`,
          ephemeral: true,
        });
      } else {
        // If the user has no bots, and the email also has no record, inform them
        if (codePromptMessage) await codePromptMessage.delete().catch(() => {});
        return interaction.followUp({
          content: `${Emojis.get("info")} Voce nao possui nenhum bot para o seu email ser vinculado.`,
          ephemeral: true,
        });
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        tempStorage.delete(userId); // Clear data if time expires
        if (codePromptMessage) await codePromptMessage.delete().catch(() => {});
        await interaction.followUp({
          content: "⏰ Tempo para digitar o código expirou. Por favor, utilize o comando novamente.",
          ephemeral: true,
        });
      }
    });
  },
};