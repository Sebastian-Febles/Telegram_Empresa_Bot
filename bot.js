const { Telegraf, Markup } = require('telegraf');
const { getUser, updateUser, createUser, resetUser } = require('./database');
const { getAIResponse } = require('./openaiService');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Regex definitions
const PHONE_REGEX = /^\d{10}$/;
const CLABE_REGEX = /^\d{18}$/;

// Middleware to manage/initialize state
bot.use(async (ctx, next) => {
  if (ctx.from) {
    let user = await getUser(ctx.from.id);
    if (!user) {
      await createUser(ctx.from.id);
      user = await getUser(ctx.from.id);
    }
    ctx.session = user;
  }
  return next();
});

// START command
bot.start(async (ctx) => {
  await resetUser(ctx.from.id);
  await ctx.reply("¡Hola! Bienvenid@ al proceso de Onboarding. 🚀\nVamos a registrar tus datos. Para comenzar, ¿cuál es tu nombre completo?");
  await updateUser(ctx.from.id, { state: 'ID_NAME' });
});

// STATUS command
bot.command('status', async (ctx) => {
  const user = await getUser(ctx.from.id);
  const states = [
    { key: 'name', label: 'Nombre', emoji: '👤' },
    { key: 'phone', label: 'Teléfono', emoji: '📞' },
    { key: 'ine_status', label: 'Documento INE', emoji: '🪪' },
    { key: 'contract_status', label: 'Contrato', emoji: '📝' },
    { key: 'bank_name', label: 'Banco', emoji: '🏦' },
    { key: 'clabe', label: 'CLABE', emoji: '💳' }
  ];

  let statusMsg = "📊 *Tu progreso de Onboarding:*\n\n";
  states.forEach(s => {
    const value = user[s.key];
    const isDone = value && value !== 'pending';
    statusMsg += `${isDone ? '✅' : '⏳'} ${s.label}\n`;
  });

  statusMsg += `\nEstado actual: *${user.state}*`;
  await ctx.replyWithMarkdown(statusMsg);
});

// FSM Logic - Message Handler
bot.on('message', async (ctx) => {
  const user = ctx.session;
  const text = ctx.message.text;
  const chatId = ctx.from.id;

  // Global Fallback/IA for text messages that don't match specific buttons or expected formats
  const handleAI = async () => {
    const aiResp = await getAIResponse(text, user.state);
    const reminder = getReminder(user.state);
    await ctx.reply(`${aiResp}\n\n${reminder}`);
  };

  switch (user.state) {
    case 'ID_NAME':
      if (!text) return handleAI();
      await updateUser(chatId, { name: text, state: 'ID_PHONE' });
      await ctx.reply(`Mucho gusto, ${text}. Ahora, por favor ingresa tu número de teléfono (10 dígitos):`);
      break;

    case 'ID_PHONE':
      if (!text || !PHONE_REGEX.test(text)) {
        return ctx.reply("❌ Formato de teléfono inválido. Por favor ingresa 10 dígitos numéricos.");
      }
      await updateUser(chatId, { phone: text, state: 'ID_CONFIRM' });
      await ctx.reply(`¿Confirmas que ${text} es tu teléfono correcto?`, Markup.keyboard([['Sí', 'No']]).oneTime().resize());
      break;

    case 'ID_CONFIRM':
      if (text === 'Sí') {
        await updateUser(chatId, { state: 'DOC_INE' });
        await ctx.reply("Perfecto. Ahora, por favor envía una foto o documento de tu INE:", Markup.removeKeyboard());
      } else if (text === 'No') {
        await updateUser(chatId, { state: 'ID_NAME' });
        await ctx.reply("Entendido. Vamos a intentarlo de nuevo. ¿Cuál es tu nombre completo?");
      } else {
        await handleAI();
      }
      break;

    case 'DOC_INE':
      if (ctx.message.photo || ctx.message.document) {
        await updateUser(chatId, { ine_status: 'uploaded', state: 'CONTRACT' });
        await ctx.reply("Recibido. 📄 Para continuar, ¿aceptas los términos del Contrato?", Markup.keyboard([['Sí', 'No']]).oneTime().resize());
      } else {
        await handleAI();
      }
      break;

    case 'CONTRACT':
      if (text === 'Sí') {
        await updateUser(chatId, { contract_status: 'accepted', state: 'BANK_NAME' });
        await ctx.reply("¡Excelente! Ahora, ¿cuál es el nombre de tu Banco?", Markup.removeKeyboard());
      } else if (text === 'No') {
        await updateUser(chatId, { contract_status: 'pending' });
        await ctx.reply("⚠️ Recuerda que el contrato es necesario para finalizar. Te enviaremos un recordatorio más tarde. Por ahora, ¿cuál es el nombre de tu Banco?");
        await updateUser(chatId, { state: 'BANK_NAME' });
      } else {
        await handleAI();
      }
      break;

    case 'BANK_NAME':
      if (!text) return handleAI();
      await updateUser(chatId, { bank_name: text, state: 'BANK_CLABE' });
      await ctx.reply(`Entendido, banco ${text}. Por último, ingresa tu CLABE interbancaria (18 dígitos):`);
      break;

    case 'BANK_CLABE':
      if (!text || !CLABE_REGEX.test(text)) {
        return ctx.reply("❌ Formato de CLABE inválido. Deben ser 18 dígitos numéricos.");
      }
      await updateUser(chatId, { clabe: text, state: 'COMPLETED' });
      const finalUser = await getUser(chatId);
      await ctx.reply("🎉 ¡Felicidades! Has completado el onboarding.");
      await ctx.replyWithMarkdown(`*Resumen de tus datos:*\n\n👤 *Nombre:* ${finalUser.name}\n📞 *Teléfono:* ${finalUser.phone}\n🏦 *Banco:* ${finalUser.bank_name}\n💳 *CLABE:* ${finalUser.clabe}\n\nRevisaremos tus documentos pronto.`);
      break;

    default:
      await handleAI();
      break;
  }
});

function getReminder(state) {
  const reminders = {
    'ID_NAME': 'Por favor, dime tu nombre para comenzar.',
    'ID_PHONE': 'Necesito tu número de teléfono de 10 dígitos.',
    'ID_CONFIRM': 'Dime "Sí" o "No" para confirmar tu teléfono.',
    'DOC_INE': 'Estoy esperando la foto o PDF de tu INE.',
    'CONTRACT': '¿Aceptas el contrato? Selecciona una opción.',
    'BANK_NAME': '¿En qué banco tienes tu cuenta?',
    'BANK_CLABE': 'Casi terminamos, ingresa tu CLABE de 18 dígitos.'
  };
  return reminders[state] || 'Puedes usar /start para reiniciar el proceso.';
}

module.exports = bot;
