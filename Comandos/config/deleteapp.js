const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ApplicationCommandType
} = require("discord.js");
const { SquareCloudAPI } = require("@squarecloud/api");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { api, db2, auto } = require("../../databases/index");

// ID do canal onde os backups serão enviados
const BACKUP_CHANNEL_ID = "CANAL BACKUP"; // 🛠️ Substitua pelo canal correto

// Garante que a pasta de backups exista
const backupFolder = path.join(__dirname, "..", "..", "backups");
if (!fs.existsSync(backupFolder)) fs.mkdirSync(backupFolder);

module.exports = {
    name: "deletarbot",
    description: "[⚙️] Deleta um bot da SquareCloud",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008",

    run: async (client, interaction) => {
        if (interaction.user.id !== "1367134558935318631") {
            return interaction.reply({ content: "❌ Você não tem permissão para usar este comando.", ephemeral: true });
        }

        const bots = db2.all();
        if (!bots || bots.length === 0) {
            return interaction.reply({ content: "⚠️ Nenhum bot encontrado no banco de dados.", ephemeral: true });
        }

  const options = bots.map(bot => ({
      label: `${bot.data.nome}`,
      description: `Plano: ${bot.data.plano} | ID: ${bot.ID}`,
      value: bot.ID
      }));

        const menu = new StringSelectMenuBuilder()
            .setCustomId("delete_bot_select")
            .setPlaceholder("Selecione um bot para excluir")
            .addOptions(options.slice(0, 25));

        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.reply({
            content: "🗑️ Selecione abaixo o bot que deseja **excluir permanentemente**:",
            components: [row],
            ephemeral: true
        });

        const collector = interaction.channel.createMessageComponentCollector({
            componentType: 3,
            time: 60_000,
        });

        collector.on("collect", async i => {
            if (i.user.id !== interaction.user.id)
                return i.reply({ content: "❌ Apenas quem usou o comando pode interagir.", ephemeral: true });

            const appId = i.values[0];
            const botData = db2.get(appId);
            if (!botData) return i.update({ content: "❌ Bot não encontrado no banco de dados.", components: [] });

            try {
                await i.update({
                    content: "⏳ Progresso iniciado! Criando backup, por favor aguarde...",
                    components: [],
                });

                const apiClient = new SquareCloudAPI(api.get("square"));
                const app = await apiClient.applications.get(appId);

                await app.backups.create();
                await new Promise(resolve => setTimeout(resolve, 5000));

                await i.followUp({ content: "📦 Backup criado! Baixando o arquivo .zip...", ephemeral: true });

                const backups = await app.backups.list();
                if (!backups || backups.length === 0) throw new Error("Nenhum backup foi encontrado.");
                const latestBackup = backups[0];
                const downloadURL = latestBackup.url;

                const fileName = `${botData.owner} - ${botData.produto || botData.plano}.zip`;
                const filePath = path.join(backupFolder, fileName);

                const response = await axios.get(downloadURL, { responseType: "stream" });
                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on("finish", resolve);
                    writer.on("error", reject);
                });

                await i.followUp({ content: "📤 Backup baixado! Enviando ao canal de logs...", ephemeral: true });

                const backupChannel = client.channels.cache.get(BACKUP_CHANNEL_ID);
                if (backupChannel) {
                    await backupChannel.send({
                        content: `🗑️ **Backup de exclusão de bot**\n📆 Data: <t:${Math.floor(Date.now() / 1000)}:F>\n📦 Produto: \`${botData.produto || botData.plano}\`\n👤 Dono: <@${botData.owner}>`,
                        files: [filePath]
                    });
                }

                fs.unlinkSync(filePath);
                await i.followUp({ content: "🗑️ Arquivo enviado com sucesso. Deletando bot...", ephemeral: true });

                await app.delete();
                db2.delete(appId);
                auto.delete(`${botData.owner}_owner`);

                await i.followUp({
                    content: `✅ O bot \`${botData.nome}\` foi excluído com sucesso da SquareCloud e removido do banco de dados.`,
                    ephemeral: true
                });

            } catch (err) {
                console.error("Erro ao excluir o bot:", err);
                await i.followUp({
                    content: "❌ Ocorreu um erro ao excluir o bot. Verifique o console.",
                    ephemeral: true
                });
            }

            collector.stop();
        });

        collector.on("end", collected => {
            if (!collected.size) {
                interaction.editReply({ content: "⏳ Tempo esgotado. Nenhuma ação foi feita.", components: [] });
            }
        });
    }
};
