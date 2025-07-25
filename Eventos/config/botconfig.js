const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  RoleSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  Embed,
} = require("discord.js")
const { api, db2, auto, db1, Emojis, logs, perms, db } = require("../../databases/index") // Assumindo que estes módulos de banco de dados/utilitários existem
const mercadopago = require("mercadopago")
const JSZip = require("jszip")
const fs = require("fs")
const { SquareCloudAPI } = require("@squarecloud/api")

module.exports = {
  name: `interactionCreate`,

  run: async (interaction, client) => {
    const { customId } = interaction
    if (!customId) return

    if (customId === "sistemaOnOff") {
      const sistema = await logs.get("sistema")
      if (sistema) {
        await logs.set("sistema", false)
      } else {
        await logs.set("sistema", true)
      }
      inicio()
    }

    if (customId === "channelsRolesEdit") {
      channelsRolesEdit()
    }

    if (customId === "back") {
      inicio()
    }

    if (customId === "selectChannelEdit") {
      const option = interaction.values[0]

      if (option === "logsEdit") {
        interaction.update({
          content: ``,
          embeds: [],
          components: [
            new ActionRowBuilder().addComponents(
              new ChannelSelectMenuBuilder()
                .setCustomId(`selectLogsEdit`)
                .setPlaceholder(`📫 Selecionar canal de texto`)
                .setChannelTypes(ChannelType.GuildText),
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`channelsRolesEdit`).setEmoji(`1246953097033416805`).setStyle(2),
            ),
          ],
        })
      }

      if (option === "renovEdit") {
        interaction.update({
          content: ``,
          embeds: [],
          components: [
            new ActionRowBuilder().addComponents(
              new ChannelSelectMenuBuilder()
                .setCustomId(`selectRenovEdit`)
                .setPlaceholder(`📫 Selecionar canal de texto`)
                .setChannelTypes(ChannelType.GuildText),
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`channelsRolesEdit`).setEmoji(`1246953097033416805`).setStyle(2),
            ),
          ],
        })
      }

      if (option === "vendasEdit") {
        interaction.update({
          content: ``,
          embeds: [],
          components: [
            new ActionRowBuilder().addComponents(
              new ChannelSelectMenuBuilder()
                .setCustomId(`selectVendasEdit`)
                .setPlaceholder(`📫 Selecionar canal de texto`)
                .setChannelTypes(ChannelType.GuildText),
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`channelsRolesEdit`).setEmoji(`1246953097033416805`).setStyle(2),
            ),
          ],
        })
      }

      if (option === "backupEdit") {
        interaction.update({
          content: ``,
          embeds: [],
          components: [
            new ActionRowBuilder().addComponents(
              new ChannelSelectMenuBuilder()
                .setCustomId(`selectBackupEdit`)
                .setPlaceholder(`📫 Selecionar canal de texto`)
                .setChannelTypes(ChannelType.GuildText),
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`channelsRolesEdit`).setEmoji(`1246953097033416805`).setStyle(2),
            ),
          ],
        })
      }
    }

    if (customId === "selectLogsEdit") {
      const channel = interaction.values[0]
      await logs.set("channel_logs", channel)
      channelsRolesEdit()
    }

    if (customId === "selectRenovEdit") {
      const channel = interaction.values[0]
      await logs.set("renov", channel)
      channelsRolesEdit()
    }

    if (customId === "selectVendasEdit") {
      const channel = interaction.values[0]
      await logs.set("vendas", channel)
      channelsRolesEdit()
    }

    if (customId === "selectBackupEdit") {
      const channel = interaction.values[0]
      await logs.set("logs_backup", channel)
      channelsRolesEdit()
    }

    if (customId === "selectRolesEdit") {
      const option = interaction.values[0]

      if (option === "clientEdit") {
        interaction.update({
          content: ``,
          embeds: [],
          components: [
            new ActionRowBuilder().addComponents(
              new RoleSelectMenuBuilder()
                .setCustomId(`selectClientEdit`)
                .setPlaceholder(`⚡ Selecionar cargo existente`),
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`channelsRolesEdit`).setEmoji(`1246953097033416805`).setStyle(2),
            ),
          ],
        })
      }
    }

    if (customId === "selectClientEdit") {
      const role = interaction.values[0]
      await logs.set("cargo_client", role)
      channelsRolesEdit()
    }

    if (customId === "gerenciarApps") {
      gerenciarApps()
    }

    if (customId === "createBotAluguel") {
      const modal = new ModalBuilder().setCustomId("modal_criar_bot").setTitle(`Novo Aluguel Bot`)

      const text = new TextInputBuilder()
        .setLabel("Nome do Bot (ALUGUEL)")
        .setPlaceholder("Ex: Vendas / Ticket / OAuth2")
        .setRequired(true)
        .setStyle(1)
        .setCustomId("text")

      const text1 = new TextInputBuilder()
        .setCustomId("text1")
        .setStyle(1)
        .setLabel("Arquivo Principal")
        .setPlaceholder("Ex: index.js / main.js")
        .setRequired(true)

      const textx = new ActionRowBuilder().addComponents(text)
      const textx1 = new ActionRowBuilder().addComponents(text1)

      modal.addComponents(textx, textx1)
      await interaction.showModal(modal)
    }

    if (customId === "modal_criar_bot") {
      const nome = interaction.fields.getTextInputValue("text")
      const principal = interaction.fields.getTextInputValue("text1")

      if (db.get(`${nome}`) === nome) {
        return interaction.reply({
          content: `${Emojis.get("negative")} Ops... Já existe um bot aluguel com este nome!`,
          ephemeral: true,
        })
      }

      const msg = await interaction.update({
        content: `${interaction.user}`,
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${interaction.user.username} - Enviar Arquivo Bot (ALUGUEL)`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(`-# \`📁\` Coletando arquivo **.zip**!`)
            .addFields(
              { name: `Formatação`, value: `\`.zip\``, inline: true },
              { name: `Necessário`, value: `\`package.json/squarecloud.config\``, inline: true },
            )
            .setColor(`#FFFF00`)
            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp(),
        ],
        components: [],
      })

      const collector = interaction.channel.createMessageCollector({
        filter: (m) => m.attachments.first() && m.attachments.first().name.endsWith(".zip"),
        max: 1,
      })

      collector.on("collect", async (message) => {
        if (message.author.id !== interaction.user.id) return

        const attachment = message.attachments.first()
        const zip = new JSZip()

        const data = await fetch(attachment.url).then((res) => res.arrayBuffer())
        const zipFile = await zip.loadAsync(data)

        await msg.edit({
          content: `${Emojis.get("loading")} Aguarde... Estamos verificando o arquivo enviado!`,
          embeds: [],
          components: [],
        })

        message.delete().catch(() => {})

        // 🔍 Procura o package.json dentro do ZIP, mesmo que esteja em subpastas
        const pkgEntry = Object.values(zipFile.files).find((f) => f.name.endsWith("package.json") && !f.dir)

        if (!pkgEntry) {
          return msg.edit({
            content: `${Emojis.get("error")} O arquivo enviado não contém um **package.json** válido no .zip!`,
            embeds: [],
            components: [],
          })
        }

        // 📦 Carrega e parseia o conteúdo do package.json
        const packageJson = JSON.parse(await pkgEntry.async("string"))

        packageJson.main = principal // 'principal' está acessível aqui

        const dir = "./source"
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir)
        }

        fs.writeFileSync(`${dir}/${nome}.zip`, await zipFile.generateAsync({ type: "nodebuffer" })) // 'nome' está acessível aqui

        db.set(`${nome}`, {
          nomeproduto: nome,
          type: "embed",
          preco: {
            anual: {
              onoff: true,
              preco: 10,
            },
            mensal: {
              onoff: true,
              preco: 5,
            },
            trimensal: {
              onoff: true,
              preco: 8.5,
            },
            embed: {
              cor: "Default",
              titulo: `${nome}`,
              desc: `👋 Olá, está preparado para uma esperiencia inovadora com o bot da **${interaction.guild.name}**? Clique no botão abaixo agora e adquira nosso bot **${nome}**`,
            },
            content: {
              content: `# ${nome}\n\n👋 Olá, está preparado para uma esperiencia inovadora com o bot da **${interaction.guild.name}**? Clique no botão abaixo agora e adquira nosso bot **${nome}**`,
            },
          },
          banner: null,
          link: "remover",
        })

        await msg.edit({
          content: `${interaction.user}`,
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: `${interaction.user.username} - Sucesso no envio`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setDescription(`-# \`✅\` O bot aluguel foi criado com êxito!`)
              .addFields(
                { name: `Bot Aluguel`, value: `\`${nome}\``, inline: true },
                { name: `Útil`, value: `\`/alugueis\``, inline: true },
              )
              .setColor(`#00FF00`)
              .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
              .setTimestamp(),
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId("gerenciarApps").setEmoji("1246953097033416805").setStyle(2),
            ),
          ],
        })
      })
    }

    if (customId === "removeAluguel") {
      const modal = new ModalBuilder().setCustomId(`modalRemAluguel`).setTitle(`Remover Aluguel`)

      const option1 = new TextInputBuilder()
        .setCustomId(`aluguel`)
        .setLabel(`QUAL O NOME DO BOT ALUGUEL A REMOVER?`)
        .setPlaceholder(`Ex: Vendas / Ticket / OAuth2`)
        .setStyle("Short")

      const optionx1 = new ActionRowBuilder().addComponents(option1)

      modal.addComponents(optionx1)
      await interaction.showModal(modal)
    }

    if (customId === "modalRemAluguel") {
      const aluguel = interaction.fields.getTextInputValue("aluguel")

      if (!db.get(aluguel)) {
        return interaction.reply({
          content: `${Emojis.get("negative")} Ops... Não existe nenhum bot aluguel com este nome no banco de dados.`,
          ephemeral: true,
        })
      }

      await db.delete(aluguel)
      gerenciarApps()
    }

    if (customId === "diversesAluguel") {
      interaction.reply({
        content: ``,
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`gerenciamentDev`)
              .setLabel(`Gerenciamento`)
              .setEmoji(`1302021603915337879`)
              .setStyle(1),
            new ButtonBuilder()
              .setCustomId(`deleteAppUser`)
              .setLabel(`Deletar Aplicação`)
              .setEmoji(`1246953338541441036`)
              .setStyle(4),
          ),
        ],
        ephemeral: true,
      })
    }

    if (customId === "gerenciamentDev") {
      gerenciamentDev()
    }

    if (customId === "backD") {
      diversesAluguel()
    }

    if (customId === "deleteAppUser") {
      if (db2.all().length <= 0) {
        return interaction.reply({
          content: `${Emojis.get("negative")} Não existe nenhuma aplicação existente no momento.`,
          ephemeral: true,
        })
      }

      if (db2.all().length > 25) {
        const modal = new ModalBuilder().setCustomId(`modalDeleteApp`).setTitle(`Deletar Aplicação`)

        const option1 = new TextInputBuilder()
          .setCustomId(`appid`)
          .setLabel(`QUAL O APP-ID A DELETAR?`)
          .setPlaceholder(`APP-ID AQUI`)
          .setStyle("Short")

        const optionx1 = new ActionRowBuilder().addComponents(option1)

        modal.addComponents(optionx1)
        await interaction.showModal(modal)
        return
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId(`selectMenuDeleteApp`)
        .setPlaceholder(`🔎 Deletar Aplicação`)

      for (const apps of db2.all()) {
        const app = apps.data
        const option = {
          label: `${app.nome}`,
          description: `APP-ID: ${app.idapp}`,
          value: app.idapp,
          emoji: "1246953310930473071",
        }
        select.addOptions(option)
      }

      interaction.update({
        content: ``,
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(select),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`backD`).setEmoji(`1246953097033416805`).setStyle(2),
          ),
        ],
      })
    }

    if (customId === "selectMenuDeleteApp") {
      const appid = interaction.values[0]

      if (!db2.get(appid)) {
        return interaction.reply({ content: `${Emojis.get("negative")} Aplicação não encontrada.`, ephemeral: true })
      }

      const owner = db2.get(`${appid}.owner`)

      if (auto.get(`${owner}_owner`)) {
        auto.delete(`${owner}_owner`)
      }

      await db2.delete(appid)
      diversesAluguel()
    }

    if (customId === "modalDeleteApp") {
      const appid = interaction.fields.getTextInputValue("appid")

      if (!db2.get(appid)) {
        return interaction.reply({ content: `${Emojis.get("negative")} Aplicação não encontrada.`, ephemeral: true })
      }

      await db2.delete(appid)
      diversesAluguel()
    }

    if (customId === "definitions") {
      definitions()
    }

    if (customId === "apiConfig") {
      apiConfig()
    }

    if (customId === "editApiSquare") {
      const modal = new ModalBuilder().setCustomId(`modalEditSquare`).setTitle(`Alterar Key Api`)

      const option1 = new TextInputBuilder()
        .setCustomId(`keyApi`)
        .setLabel(`QUAL SUA KEY API SQUARECLOUD?`)
        .setPlaceholder(`YOU KEY API SQUARECLOUD HERE`)
        .setStyle("Short")

      const optionx1 = new ActionRowBuilder().addComponents(option1)

      modal.addComponents(optionx1)
      await interaction.showModal(modal)
    }

    if (customId === "modalEditSquare") {
      const keyApi = interaction.fields.getTextInputValue("keyApi")
      const apiInstance = new SquareCloudAPI(keyApi)

      try {
        await apiInstance.users.get()
        await api.set("square", keyApi)
        apiConfig()
      } catch (error) {
        await interaction.reply({
          content: `${Emojis.get("negative")} A chave da API SquareCloud é inválida. Por favor, verifique e tente novamente.`,
          ephemeral: true,
        })
      }
    }

    if (customId === "paymentsConfig") {
      paymentsConfig()
    }

    if (customId === "automaticConfig") {
      automaticConfig()
    }

    if (customId === "sistemaMpOnOff") {
      const sistemaMp = await api.get("sistemaMp")
      if (sistemaMp) {
        await api.set("sistemaMp", false)
      } else {
        await api.set("sistemaMp", true)
      }
      automaticConfig()
    }

    if (customId === "setAccessToken") {
      const modal = new ModalBuilder().setCustomId(`modalAccessToken`).setTitle(`Alterar Access Token`)

      const option1 = new TextInputBuilder()
        .setCustomId(`access`)
        .setLabel(`QUAL O SEU ACCESS TOKEN?`)
        .setPlaceholder(`APP_USR-000000000000000-XX...`)
        .setStyle("Short")

      const optionx1 = new ActionRowBuilder().addComponents(option1)

      modal.addComponents(optionx1)
      await interaction.showModal(modal)
    }

    if (customId === "modalAccessToken") {
      const access = interaction.fields.getTextInputValue("access")
      mercadopago.configurations.setAccessToken(access)

      try {
        const payment_data = {
          transaction_amount: Number.parseFloat("10"),
          description: "Testando se o token é válido",
          payment_method_id: "pix",
          payer: {
            email: "skyapps2024@gmail.com",
            first_name: "Adilson Lima",
            last_name: "de Souza",
            identification: {
              type: "CPF",
              number: "63186896215",
            },
            address: {
              zip_code: "86063190",
              street_name: "Rua Jácomo Piccinin",
              street_number: "871",
              neighborhood: "Pinheiros",
              city: "Londrina",
              federal_unit: "PR",
            },
          },
        }
        await mercadopago.payment.create(payment_data)
      } catch (error) {
        const pc = "https://www.youtube.com/watch?v=w7kyGZUrkVY&t=162s"
        const mobile = "https://www.youtube.com/watch?v=ctwqHp1H0-0"

        await interaction.reply({
          content: ``,
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: `${interaction.user.username} - Erro Access Token`,
                iconURL: interaction.user.displayAvatarURL(),
              })
              .setDescription(`-# \`❌\` Erro na setagem do access token.`)
              .addFields(
                { name: `Erro`, value: `\`Access Token Inválido\``, inline: true },
                { name: `Útil`, value: `\`Assista ao tutorial\``, inline: true },
              )
              .setColor(`#FF0000`)
              .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
              .setTimestamp(),
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setURL(pc)
                .setLabel(`TUTORIAL ACCESS TOKEN (PC)`)
                .setEmoji(`1302020475760934973`)
                .setStyle(5),
              new ButtonBuilder()
                .setURL(mobile)
                .setLabel(`TUTORIAL ACCESS TOKEN (MOBILE)`)
                .setEmoji(`1302020475760934973`)
                .setStyle(5),
            ),
          ],
          ephemeral: true,
        })
        return
      }

      await api.set("mp", access)
      automaticConfig()
    }

    if (customId === "editTempPay") {
      const modal = new ModalBuilder().setCustomId(`modalTempPay`).setTitle(`Alterar Tempo Pagamento`)

      const option1 = new TextInputBuilder()
        .setCustomId(`temp`)
        .setLabel(`QUAL O NOVO TEMPO PARA PAGAR? (MINUTOS)`)
        .setPlaceholder(`EX: 10`)
        .setMaxLength(3)
        .setStyle("Short")

      const optionx1 = new ActionRowBuilder().addComponents(option1)

      modal.addComponents(optionx1)
      await interaction.showModal(modal)
    }

    if (customId === "modalTempPay") {
      const temp = interaction.fields.getTextInputValue("temp")

      if (isNaN(temp)) {
        return interaction.reply({
          content: `${Emojis.get("negative")} O tempo para pagamento está inválido, use apenas números.`,
          ephemeral: true,
        })
      }

      if (temp < 3) {
        return interaction.reply({
          content: `${Emojis.get("negative")} O tempo para pagamento não pode ser menos que **3** Minutos`,
          ephemeral: true,
        })
      }

      if (temp > 120) {
        return interaction.reply({
          content: `${Emojis.get("negative")} O tempo para pagamento não pode ser mais que **120** Minutos`,
          ephemeral: true,
        })
      }

      await api.set("tempoPay", temp)
      automaticConfig()
    }

    if (customId === "semiAutoConfig") {
      semiAutoConfig()
    }

    if (customId === "sistemaSemiOnOff") {
      const sistemaSemi = await logs.get("semi.sistema")
      if (sistemaSemi) {
        await logs.set("semi.sistema", false)
      } else {
        await logs.set("semi.sistema", true)
      }
      semiAutoConfig()
    }

    if (customId === "setAgenceSemi") {
      setAgenceSemi()
    }

    if (customId === "editTempPay2") {
      const modal = new ModalBuilder().setCustomId(`modalTempPay2`).setTitle(`Alterar Tempo Pagamento`)

      const option1 = new TextInputBuilder()
        .setCustomId(`temp`)
        .setLabel(`QUAL O NOVO TEMPO PARA PAGAR? (MINUTOS)`)
        .setPlaceholder(`EX: 10`)
        .setMaxLength(3)
        .setStyle("Short")

      const optionx1 = new ActionRowBuilder().addComponents(option1)

      modal.addComponents(optionx1)
      await interaction.showModal(modal)
    }

    if (customId === "modalTempPay2") {
      const temp = interaction.fields.getTextInputValue("temp")

      if (isNaN(temp)) {
        return interaction.reply({
          content: `${Emojis.get("negative")} O tempo para pagamento está inválido, use apenas números.`,
          ephemeral: true,
        })
      }

      if (temp < 3) {
        return interaction.reply({
          content: `${Emojis.get("negative")} O tempo para pagamento não pode ser menos que **3** Minutos`,
          ephemeral: true,
        })
      }

      if (temp > 120) {
        return interaction.reply({
          content: `${Emojis.get("negative")} O tempo para pagamento não pode ser mais que **120** Minutos`,
          ephemeral: true,
        })
      }

      await logs.set("semi.tempoPay", temp)
      semiAutoConfig()
    }

    if (customId === "setConfigSemi") {
      const modal = new ModalBuilder().setCustomId(`modalAgenceSemi`).setTitle(`Agencia Semi Auto`)

      const option1 = new TextInputBuilder()
        .setCustomId(`chave`)
        .setLabel(`QUAL É A SUA CHAVE PIX?`)
        .setPlaceholder(`EX: profissional@gmail.com`)
        .setMaxLength(500)
        .setStyle("Short")

      const option2 = new TextInputBuilder()
        .setCustomId(`tipo`)
        .setLabel(`QUAL O TIPO DA SUA CHAVE PIX?`)
        .setPlaceholder(`EX: Email / Telefone / CPF`)
        .setMaxLength(100)
        .setStyle("Short")

      const optionx1 = new ActionRowBuilder().addComponents(option1)
      const optionx2 = new ActionRowBuilder().addComponents(option2)

      modal.addComponents(optionx1, optionx2)
      await interaction.showModal(modal)
    }

    if (customId === "modalAgenceSemi") {
      const tipo = interaction.fields.getTextInputValue("tipo")
      const chave = interaction.fields.getTextInputValue("chave")

      await logs.set("semi.tipo", tipo)
      await logs.set("semi.chave", chave)
      semiAutoConfig()
    }

    if (customId === "aprovedRoleSemi") {
      interaction.update({
        content: ``,
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder().setCustomId(`selectRoleAprovedSemi`).setPlaceholder(`⚡ Selecionar Cargo`),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`setAgenceSemi`).setEmoji(`1246953097033416805`).setStyle(2),
          ),
        ],
      })
    }

    if (customId === "selectRoleAprovedSemi") {
      const role = interaction.values[0]
      await logs.set("semi.roleAprove", role)
      setAgenceSemi()
    }

    if (customId === "antFraudSet") {
      interaction.update({
        content: ``,
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`selectAntiFraudBanks`)
              .setPlaceholder(`🏦 Bloquear Banco`)
              .addOptions(
                {
                  value: `inter`,
                  label: `Banco: Inter`,
                  emoji: `1217525001171763331`,
                },
                {
                  value: `picpay`,
                  label: `Banco: PicPay`,
                  emoji: `1217525250464550973`,
                },
                {
                  value: `nubank`,
                  label: `Banco: NuBank`,
                  emoji: `1217524985766215691`,
                },
                {
                  value: `99pay`,
                  label: `Banco: 99Pay`,
                  emoji: `1217586613480198254`,
                },
                {
                  value: `pagseguro`,
                  label: `Banco: PagBank`,
                  emoji: `1217524953860280370`,
                },
              )
              .setMaxValues(5),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`liberarTudo`)
              .setLabel(`Liberar Tudo`)
              .setEmoji(`1246953338541441036`)
              .setStyle(4),
            new ButtonBuilder().setCustomId(`automaticConfig`).setEmoji(`1246953097033416805`).setStyle(2),
          ),
        ],
      })
    }

    if (customId === "selectAntiFraudBanks") {
      const options = interaction.values
      await api.set("banksOff", options)
      automaticConfig()
    }

    if (customId === "liberarTudo") {
      await api.set("banksOff", [])
      automaticConfig()
    }

    async function inicio() {
      const sistema = await logs.get("sistema")
      interaction.update({
        content: ``,
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${interaction.user.username} - Gerenciamento Inicial`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(`-# \`👷‍♂️\` Gerenciamento inicial do **/botconfig**.`)
            .addFields(
              { name: `Sistema`, value: `\`${sistema ? "`🟢 Ligado`" : "`🔴 Desligado`"}\``, inline: true },
              { name: `Versão`, value: `\`BETA\``, inline: true },
              { name: `Ping`, value: `\`${client.ws.ping}\``, inline: true },
            )
            .setColor(`#00FFFF`)
            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp(),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`sistemaOnOff`)
              .setLabel(sistema ? "Ligado" : "Desligado")
              .setEmoji(sistema ? "1236021048470933575" : "1236021106662707251")
              .setStyle(sistema ? 3 : 4),
            new ButtonBuilder()
              .setCustomId(`gerenciarApps`)
              .setLabel(`Gerenciar Sistemas`)
              .setEmoji(`1246953215380160593`)
              .setStyle(1),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`channelsRolesEdit`)
              .setLabel(`Canais/Cargos`)
              .setEmoji(`1246953254810816542`)
              .setStyle(1),
            new ButtonBuilder()
              .setCustomId(`definitions`)
              .setLabel(`Configuraçoes`)
              .setEmoji(`1246953268211613747`)
              .setStyle(2),
          ),
        ],
      })
    }

    async function gerenciarApps() {
      interaction.update({
        content: ``,
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${interaction.user.username} - Gerenciando Aplicações`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(`-# \`📡\` Gerenciamento das aplicações e dentre outras.`)
            .addFields({ name: `Alugueis Existentes`, value: `\`x${db.all().length}\`` })
            .setColor(`#00FFFF`)
            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp(),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`createBotAluguel`)
              .setLabel(`Criar Produto`)
              .setEmoji(`1246953350067388487`)
              .setStyle(3),
            new ButtonBuilder()
              .setCustomId(`removeAluguel`)
              .setLabel(`Deletar Produto`)
              .setEmoji(`1246953338541441036`)
              .setStyle(4),
            new ButtonBuilder().setCustomId(`diversesAluguel`).setEmoji(`1302002650631639161`).setStyle(2),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`back`).setEmoji(`1246953097033416805`).setStyle(2),
          ),
        ],
      })
    }

    async function channelsRolesEdit() {
      const renov = await interaction.guild.channels.cache.get(logs.get("renov"))
      const vendas = await interaction.guild.channels.cache.get(logs.get("vendas"))
      const backup = await interaction.guild.channels.cache.get(logs.get("logs_backup"))
      const cLogs = await interaction.guild.channels.cache.get(logs.get("channel_logs"))
      const client = await interaction.guild.roles.cache.get(logs.get("cargo_client"))

      interaction.update({
        content: ``,
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${interaction.user.username} - Gerenciando Canais/Cargos`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(`-# \`🔧\` Gerenciamento dos canais e cargos do sistema.`)
            .addFields(
              {
                name: `📫 Canais`,
                value: `**Logs Sistema:** ${logs.get("channel_logs") ? cLogs : "Não definido."}
                            **Logs Renovação:** ${logs.get("renov") ? renov : "Não definido."}
                            **Logs Vendas:** ${logs.get("vendas") ? vendas : "Não definido."}
                            **Logs Backup:** ${logs.get("logs_backup") ? backup : "Não definido."}`,
              },
              {
                name: `⚡ Cargos`,
                value: `**Cargo Cliente:** ${logs.get("cargo_client") ? client : "Não definido."}`,
              },
            )
            .setColor(`#00FFFF`)
            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp(),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`selectChannelEdit`)
              .setPlaceholder(`📫 Redefinir Canal`)
              .setOptions(
                {
                  value: `logsEdit`,
                  label: `Gerenciar Logs`,
                  emoji: `1246954990015217735`,
                },
                {
                  value: `renovEdit`,
                  label: `Gerenciar Renovações`,
                  emoji: `1246953350067388487`,
                },
                {
                  value: `vendasEdit`,
                  label: `Gerenciar Vendas`,
                  emoji: `1246953442283618334`,
                },
                {
                  value: `backupEdit`,
                  label: `Gerenciar Backup`,
                  emoji: `1246952319241683055`,
                },
              ),
          ),
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`selectRolesEdit`)
              .setPlaceholder(`⚡ Redefinir Cargo`)
              .setOptions({
                value: `clientEdit`,
                label: `Gerenciar Cliente`,
                emoji: `1246955057879187508`,
              }),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`back`).setEmoji(`1246953097033416805`).setStyle(2),
          ),
        ],
      })
    }

    async function diversesAluguel() {
      interaction.update({
        content: ``,
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`gerenciamentDev`)
              .setLabel(`Gerenciamento`)
              .setEmoji(`1302021603915337879`)
              .setStyle(1),
            new ButtonBuilder()
              .setCustomId(`deleteAppUser`)
              .setLabel(`Deletar Aplicação`)
              .setEmoji(`1246953338541441036`)
              .setStyle(4),
          ),
        ],
      })
    }

    async function gerenciamentDev() {
      interaction.update({
        content: ``,
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${interaction.user.username} - Gerenciando Developer Tool`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(`-# \`💻\` Gerenciamento do sistema **Developer Tool**.`)
            .addFields({ name: `Aplicações online em sua squarecloud`, value: `\`x${db2.all().length}\`` })
            .setColor(`#00FFFF`)
            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp(),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`selectGerenciamentDev`)
              .setPlaceholder(`🤖 Selecione uma Aplicaçao`)
              .addOptions(
                {
                  value: `ligarBotGrc`,
                  label: `Ligar App`,
                  emoji: `1295039597956431953`,
                },
                {
                  value: `reiniciarBotGrc`,
                  label: `Reiniciar App`,
                  emoji: `1246953228655132772`,
                },
                {
                  value: `desligarBotGrc`,
                  label: `Desligar App`,
                  emoji: `1295039609926979627`,
                },
                {
                  value: `statusBotGrc`,
                  label: `Status App`,
                  emoji: `1302021690045497424`,
                },
              ),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`consoleBotGrc`).setEmoji(`1302020326900633642`).setStyle(2),
            new ButtonBuilder().setCustomId(`backD`).setEmoji(`1246953097033416805`).setStyle(2),
          ),
        ],
      })
    }

    async function definitions() {
      interaction.update({
        content: `O que deseja realizar?`,
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`apiConfig`)
              .setLabel(`SquareCloud`)
              .setEmoji(`1302018409701052501`)
              .setStyle(2),
            new ButtonBuilder()
              .setCustomId(`moderationConfig`)
              .setLabel(`Moderação`)
              .setEmoji(`1302021690045497424`)
              .setStyle(2)
              .setDisabled(true),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`automationConfig`)
              .setLabel(`Automação`)
              .setEmoji(`1238303687248576544`)
              .setDisabled(true)
              .setStyle(2),
            new ButtonBuilder()
              .setCustomId(`paymentsConfig`)
              .setLabel(`ChaveRecibo`)
              .setEmoji(`1302019361623769281`)
              .setStyle(1),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`back`).setEmoji(`1246953097033416805`).setStyle(2),
          ),
        ],
      })
    }

    async function apiConfig() {
      const square = await api.get("square")

      let data = {
        response: {
          user: { plan: { name: "Not found.", duration: 0, memory: { used: "0", limit: "0" } }, email: "Not found." },
        },
      }
      if (square) {
        try {
          const response = await fetch("https://api.squarecloud.app/v2/users/me", {
            method: "GET",
            headers: {
              Authorization: square,
            },
          })
          data = await response.json()
        } catch (e) {
          console.error("Error fetching SquareCloud API data:", e)
        }
      }

      interaction.update({
        content: ``,
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${interaction.user.username} - Gerenciando Api SquareCloud`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(`-# \`☁\` Gerenciamento do sistema **Api SquareCloud**.`)
            .addFields(
              {
                name: `Plan Info`,
                value: `\`${square ? `📡 ${data.response.user.plan.name}` : "🔴 Not found."}\``,
                inline: true,
              },
              {
                name: `Plan Expiration`,
                value: `${square && data.response.user.plan.duration ? `<t:${Math.floor(data.response.user.plan.duration / 1000)}:f>` : "`🔴 Not found.`"}`,
                inline: true,
              },
              {
                name: `API SquareCloud`,
                value: `${!square ? "```YOU KEY API SQUARECLOUD HERE```" : `\`\`\`${square.slice(0, -40) + "***************************"}\`\`\``}`,
                inline: false,
              },
              {
                name: `Me Email`,
                value: `\`${square ? `📨 ${data.response.user.email}` : "🔴 Not found."}\``,
                inline: true,
              },
              {
                name: `Ram Informations`,
                value: `${square ? `\`💾 ${data.response.user.plan.memory.used}/${data.response.user.plan.memory.limit} Usado(s)\`` : "`🔴 Not found.`"}`,
                inline: true,
              },
            )
            .setColor(`#00FFFF`)
            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp(),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`editApiSquare`)
              .setLabel(`Alterar Key Api`)
              .setEmoji(`1302017892358819871`)
              .setStyle(1),
            new ButtonBuilder().setCustomId(`definitions`).setEmoji(`1246953097033416805`).setStyle(2),
          ),
        ],
      })
    }

    async function paymentsConfig() {
      const sistemaMp = await api.get("sistemaMp")
      const mp = await api.get("mp")
      const sistemaSemi = await logs.get("semi.sistema")
      const chave = await logs.get("semi.chave")

      interaction.update({
        content: ``,
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${interaction.user.username} - Gerenciando ChaveRecibo`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(`-# \`👤\` Gerenciamento do sistema **ChaveRecibo**.`)
            .addFields(
              {
                name: `⚡ Automático`,
                value: `${sistemaMp ? "`(✅ | ON)` **Sistema**" : "`(🔴 | OFF)` **Sistema**"}\n${!mp ? "`(🔎 | NOT FOUND)` **API**" : "`(📡 | RUNNING)` **API**"}`,
                inline: true,
              },
              {
                name: `📋 Semi Auto`,
                value: `${sistemaSemi ? "`(✅ | ON)` **Sistema**" : "`(🔴 | OFF)` **Sistema**"}\n${!chave ? "`(🔎 | NOT FOUND)` **Chave**" : "`(📫 | SETADA)` **Chave**"}`,
                inline: true,
              },
              {
                name: `💳 Cartão Stripe`,
                value: `\`(🔴 | OFF)\` **Sistema**\n\`(🔎 | NOT FOUND)\` **Stripe**`,
                inline: true,
              },
              {
                name: `💱 Bit Coin`,
                value: `\`(🔴 | OFF)\` **Sistema**\n\`(🔎 | NOT FOUND)\` **Configuração**`,
                inline: true,
              },
            )
            .setColor(`#00FFFF`)
            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp(),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`automaticConfig`)
              .setLabel(`Gerenciar Automático`)
              .setEmoji(`1302019699176902717`)
              .setStyle(1),
            new ButtonBuilder()
              .setCustomId(`semiAutoConfig`)
              .setLabel(`Sistema de Semi Auto`)
              .setEmoji(`1302018395851722763`)
              .setStyle(1),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`stripeConfig`)
              .setLabel(`Setar Cartão Stripe`)
              .setEmoji(`1295039474891489301`)
              .setStyle(1)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId(`bitCoinConfig`)
              .setLabel(`Configurar Bit Coin`)
              .setEmoji(`1295039423582441546`)
              .setStyle(1)
              .setDisabled(true),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`definitions`).setEmoji(`1246953097033416805`).setStyle(2),
          ),
        ],
      })
    }

    async function automaticConfig() {
      const sistemaMp = await api.get("sistemaMp")
      const mp = await api.get("mp")
      const tempoPay = await api.get("tempoPay")
      const banksOffArray = (await api.get("banksOff")) || []

      const banksOff = banksOffArray.length > 0 ? banksOffArray.map((bank) => `${bank} `).join("\n") : "Nenhum"

      interaction.update({
        content: ``,
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${interaction.user.username} - Gerenciando Automático`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(
              `-# \`⚡\` Gerenciamento do sistema **Automático**.\n\n-# **Observação:** Na área de automação de pagamento, você vai agilizar o seu processo sem ter que aprovar manualmente um carrinho criado. Use as funções abaixo para setar sua **Creandencia do Access Token** & **Bloquear bancos** que tem índices de fraudes.`,
            )
            .addFields(
              { name: `Sistema`, value: `${sistemaMp ? "`🟢 Online`" : "`🔴 Offline`"}` },
              { name: `Tempo Pagar`, value: `\`${tempoPay} Minuto(s)\`` },
              {
                name: `Crendencias Access Token`,
                value: `${!mp ? "```APP_USR-000000000000000-XXXXXXX-XXXXXXXXX```" : `\`\`\`${mp.slice(0, -33) + "***************************"}\`\`\``}`,
              },
              { name: `Bancos Bloqueados`, value: `\`\`\`${banksOff}\`\`\`` },
            )
            .setColor(`#00FFFF`)
            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp(),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`sistemaMpOnOff`)
              .setLabel(sistemaMp ? "Online" : "Offline")
              .setEmoji(sistemaMp ? "1236021048470933575" : "1236021106662707251")
              .setStyle(sistemaMp ? 3 : 4),
            new ButtonBuilder()
              .setCustomId(`setAccessToken`)
              .setLabel(`Access Token`)
              .setEmoji(`1249371859925864572`)
              .setStyle(1),
            new ButtonBuilder()
              .setCustomId(`editTempPay`)
              .setLabel(`Tempo Pagar`)
              .setEmoji(`1302020565552599040`)
              .setStyle(1),
            new ButtonBuilder()
              .setCustomId(`antFraudSet`)
              .setLabel(`Anti Fraude`)
              .setEmoji(`1302021690045497424`)
              .setStyle(2),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`paymentsConfig`).setEmoji(`1246953097033416805`).setStyle(2),
          ),
        ],
      })
    }

    async function semiAutoConfig() {
      const sistemaSemi = await logs.get("semi.sistema")
      const qrcode = await logs.get("semi.qrcode")
      const tempoPay = await logs.get("semi.tempoPay")

      interaction.update({
        content: ``,
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${interaction.user.username} - Gerenciando Semi Auto`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(
              `-# \`📋\` Gerenciamento do sistema **Semi Auto**.\n\n-# **Observação:** A área de Semi Auto é um sistema útil para quem não tem o mercado pago, esse sistema é preciso aprovar manualmente o pagamento da pessoa que está adquirindo os alugueis da loja/apps. Configire **Tipo/Chave**, **QrCode** & **Cargo Aprovador** logo abaixo.`,
            )
            .addFields(
              { name: `Sistema`, value: `${sistemaSemi ? "`🟢 Online`" : "`🔴 Offline`"}` },
              { name: `Tempo Pagar`, value: `\`${tempoPay} Minuto(s)\`` },
              {
                name: `QrCode`,
                value: `${!qrcode ? `\`🔴 Gerando Automatico caso a chave for em email.\`` : `[Clique aqui para visualizar](<${qrcode}>)`}`,
              },
            )
            .setColor(`#00FFFF`)
            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp(),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`sistemaSemiOnOff`)
              .setLabel(sistemaSemi ? "Online" : "Offline")
              .setEmoji(sistemaSemi ? "1236021048470933575" : "1236021106662707251")
              .setStyle(sistemaSemi ? 3 : 4),
            new ButtonBuilder()
              .setCustomId(`setAgenceSemi`)
              .setLabel(`Setar Agências`)
              .setEmoji(`1302020457276375050`)
              .setStyle(1),
            new ButtonBuilder()
              .setCustomId(`editTempPay2`)
              .setLabel(`Tempo Pagar`)
              .setEmoji(`1302020565552599040`)
              .setStyle(1),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`paymentsConfig`).setEmoji(`1246953097033416805`).setStyle(2),
          ),
        ],
      })
    }

    async function setAgenceSemi() {
      const tipo = await logs.get("semi.tipo")
      const chave = await logs.get("semi.chave")
      const roleAprove = await logs.get("semi.roleAprove")

      const roleMention = roleAprove ? await interaction.guild.roles.cache.get(roleAprove) : null

      interaction.update({
        content: ``,
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${interaction.user.username} - Gerenciando Agências`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setDescription(`-# \`🧪\` Gerenciamento do sistema **Agências**.`)
            .addFields(
              {
                name: `Configuração`,
                value: `${tipo && chave ? `\`${chave} | ${tipo}\`` : `\`🔴 Não configurado.\``}`,
                inline: true,
              },
              {
                name: `Cargo Aprovador`,
                value: `${!roleAprove ? `\`🔴 Não configurado.\`` : `${roleMention}`}`,
                inline: true,
              },
            )
            .setColor(`#00FFFF`)
            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp(),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`setConfigSemi`)
              .setLabel(`Setar Configuração`)
              .setEmoji(`1302019361623769281`)
              .setStyle(1),
            new ButtonBuilder()
              .setCustomId(`aprovedRoleSemi`)
              .setLabel(`Cargo Aprovador`)
              .setEmoji(`1302018377279078581`)
              .setStyle(1),
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`semiAutoConfig`).setEmoji(`1246953097033416805`).setStyle(2),
          ),
        ],
      })
    }

    function link(n) {
      const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/
      return urlRegex.test(n)
    }
  },
}
