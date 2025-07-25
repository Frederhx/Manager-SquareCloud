const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ApplicationCommandType } = require("discord.js");
const { perms, Emojis } = require("../../databases/index");

module.exports = {
    name: "faq",
    description: "[🤖] Envie a mensagem sobre os termos e faq",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: "0x00000008",
    run: async (client, interaction) => {
        if (interaction.user.id !== ownerID) {
            return interaction.reply({ content: `${Emojis.get('negative')} Você não tem permissão para usar este comando.`, ephemeral: true });
        }

        await interaction.reply({ content: `${Emojis.get('checker')} Mensagem enviada com sucesso!`, ephemeral: true });

        const termosButton = new ButtonBuilder()
            .setCustomId("termos")
            .setLabel("Termos de uso")
            .setStyle(1);

        const faqButton = new ButtonBuilder()
            .setCustomId("faq")
            .setLabel("Faq (Duvidas Frequentes)")
            .setStyle(1);

        const duvidasButton = new ButtonBuilder()
            .setLabel("Duvidas")
            .setStyle(ButtonStyle.Link)
            .setURL("https://discord.com/channels/1353068042380382310/1383679362796228650");

        const row = new ActionRowBuilder().addComponents(termosButton, faqButton, duvidasButton);

        await interaction.channel.send({
            content: "# Sky Apps - Sua fonte Confiável de Bots.\n\n- Na Sky Apps, oferecemos uma variedade de bots Discord de alta qualidade, desde moderação até música e utilidade. Com suporte excepcional e atualizações regulares, estamos aqui para elevar a sua experiência no Discord. Visite nossa loja hoje mesmo e descubra como podemos melhorar o seu servidor!",
            components: [row],
        });
    }
};
