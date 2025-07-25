const fs = require('fs')

module.exports = {
    run: (client) => {

        client.setMaxListeners(99);

        fs.readdirSync('./Eventos/').forEach(kauan => {
            const arquivosEvent = fs.readdirSync(`./Eventos/${kauan}`).filter(archive => archive.endsWith('.js'))
        for (const arquivo of arquivosEvent) {
            const evento = require(`../Eventos/${kauan}/${arquivo}`);
            if (evento.once) {
                client.once(evento.name, (...args) => evento.run(...args, client));
            } else {
                client.on(evento.name, (...args) => evento.run(...args, client));
            }
        }
    })
  }
}