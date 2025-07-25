const { Emojis } = require('../databases');  // Verifique se Emojis está correto
const AllEmojis = require('./emojis.json');
const axios = require('axios');
const fs = require('fs');

async function fetchEmojis(client) {
    const response = await axios.get(`https://discord.com/api/v10/applications/${client.user.id}/emojis`, {
        headers: {
            Authorization: `Bot ${client.token}`
        }
    });
    return response.data.items;
}

async function createEmoji(client, name, image) {
    let response;

    try {
        response = await axios.post(`https://discord.com/api/v9/applications/${client.user.id}/emojis`, {
            name: name,
            image: image
        }, {
            headers: {
                Authorization: `Bot ${client.token}`
            }
        });

        const emojiId = response.data.id;
        const isAnimated = response.data.animated || image.endsWith('.gif');
        saveEmojiToDatabase(name, emojiId, isAnimated);
        
        return isAnimated ? `<a:${name}:${emojiId}>` : `<:${name}:${emojiId}>`;
    } catch (error) {
        if (error.response && error.response.data && error.response.data.message === 'You are being rate limited.') {
            const retryAfter = error.response.data.retry_after * 1000;
            await new Promise(resolve => setTimeout(resolve, retryAfter));
            return await createEmoji(client, name, image);
        }
        if (error.response.status === 500) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await createEmoji(client, name, image);
        }

        console.log(`\x1b[31m[Emojis]\x1b[0m Erro ao adicionar o emoji ${name}: ${error.message}`);
        return null;
    }
}

async function GetEmoji(client, emojiName) {
    const emojis = await fetchEmojis(client);

    const existingEmoji = emojis.find(e => e.name === emojiName);
    if (existingEmoji) {
        return existingEmoji.animated ? `<a:${emojiName}:${existingEmoji.id}>` : `<:${emojiName}:${existingEmoji.id}>`;
    }

    const emojiData = AllEmojis.find(e => e.name === emojiName);
    if (emojiData) {
        return await createEmoji(client, emojiData.name, emojiData.image);
    }
    return null;
}

async function saveEmojiToDatabase(emojiName, emojiId, isAnimated) {
    try {
        const emojiMention = isAnimated ? `<a:${emojiName}:${emojiId}>` : `<:${emojiName}:${emojiId}>`;

        let emojiData = {};
        if (fs.existsSync('./databases/emojis.json')) {
            const fileData = fs.readFileSync('./databases/emojis.json');
            emojiData = JSON.parse(fileData);
        }

        emojiData[emojiName] = emojiMention;
        fs.writeFileSync('./databases/emojis.json', JSON.stringify(emojiData, null, 2));

        console.log(`\x1b[32m[Emojis]\x1b[0m Emoji ${emojiName} salvo no arquivo.`);
    } catch (error) {
        console.log(`\x1b[31m[Emojis]\x1b[0m Erro ao salvar o emoji ${emojiName} no banco de dados: ${error.message}`);
    }
}

async function UploadEmojis(client) {
    const emojis = await fetchEmojis(client);
    const existingNames = new Set(emojis.map(e => e.name));

    let EmojisSalvos = {};
    if (fs.existsSync('./databases/emojis.json')) {
        const fileData = fs.readFileSync('./databases/emojis.json');
        EmojisSalvos = JSON.parse(fileData);
    }

    const EmojisSalvosSet = new Set(Object.keys(EmojisSalvos));
    let uploadDB = emojis.filter(emoji => !EmojisSalvosSet.has(emoji.name))
                          .map(emoji => saveEmojiToDatabase(emoji.name, emoji.id, emoji.animated));
    await Promise.all(uploadDB);

    const uploads = AllEmojis
        .filter(emoji => !existingNames.has(emoji.name))
        .map(emoji => createEmoji(client, emoji.name, emoji.image));

    const results = await Promise.all(uploads);
    return results;
}

module.exports = {
    GetEmoji,
    UploadEmojis
};
