# 🤖 Bot Manager - Gerenciador com SquareCloud + MercadoPago

Um bot completo para gerenciamento de projetos com integração ao [MercadoPago](https://www.mercadopago.com.br), à [Square Cloud](https://squarecloud.app) e sistema de **recuperação por e-mail**. Automatize deploys, gerencie configurações, crie painéis personalizados e receba pagamentos por PIX com segurança e praticidade.

---

## 🚀 Funcionalidades Principais

### 🛠 `/projects-manager`
- Comando principal do sistema
- Personalização completa do bot
- Escolha do canal de envio do painel de configurações
- Pré-visualização de embed em tempo real
- Alteração de tokens, imagens, cores, texto e mais

### 💳 Integração com MercadoPago
- Geração de cobranças com link + QR Code
- Pagamento identificado com `external_reference`
- Verificação automática a cada 10 segundos
- Atualização de status em tempo real

### ☁️ Deploys com Square Cloud
- Criação de aplicações diretamente do Discord
- Deploy automático após confirmação de pagamento
- Gerenciamento de RAM, CPU, status, logs, domínios e backups

### 📧 Sistema de E-mail (Recuperação de Bots)
- Envio de e-mails automáticos com informações de recuperação
- Sistema de verificação por código para segurança
- Recuperação de dados de bots perdidos ou removidos
- Integração com serviços SMTP configuráveis

---

## ⚙️ Configuração Inicial

1. **Altere o token do bot**
   - Edite o arquivo `config.json`:
  ```json
     {
    "token":"TOKEN DO BOT",
    "owner": "ID DO DONO",
    "channelId": "CANAL DO PAINEL DE CONTROLE DE APLICAÇÕES"
     }
  ```
2. **Em `apis.json`, altere**
```json
{
    "sistemaMp": true,
    "square": "SQUARE CLOUD TOKEN",
    "mp": "MP TOKEN",
    "tempoPay": "10",
    "banksOff": [
    ]
}
```

3. **Canal de configurações**
   - O painel de administração será enviado no canal definido no `config.json`.

---


## ✅ Requisitos

- Node.js 18+
- Conta no Discord Developer Portal
- Conta ativa na Square Cloud
- Conta ativa no MercadoPago (para integração PIX)
- Conta SMTP para envio de e-mails (Gmail, Outlook, etc.)

---

**Feito com 💓 de F$ SysteM Apps para a comunidade da Square Cloud**
