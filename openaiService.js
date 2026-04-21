const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getAIResponse = async (userMessage, currentState) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Eres un asistente de onboarding para un bot de Telegram. 
          Tu objetivo es responder dudas breves y luego recordar al usuario que debe continuar con su proceso.
          El estado actual del usuario es: ${currentState}.
          Responde de forma concisa (máximo 2 frases) y sé amable.`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  } catch (error) {
    // Check for 429 Insufficient Quota or Rate Limit
    if (error.status === 429 || error.code === 'insufficient_quota') {
      console.log(`⚠️ [MOCK FALLBACK] Cuota de OpenAI excedida. Generando respuesta simulada para: "${userMessage}"`);
      return getMockResponse(userMessage);
    }

    console.error('Error with OpenAI:', error);
    return "Lo siento, tuve un problema al procesar tu duda. Por favor, continúa con el proceso de onboarding.";
  }
};

/**
 * Sistema de respuestas simuladas (Mock) basado en palabras clave
 */
function getMockResponse(message) {
  const msg = message.toLowerCase();

  if (msg.includes('clabe')) {
    return "La CLABE es tu Clave Bancaria Estandarizada de 18 dígitos. Es necesaria para realizar tus pagos de nómina de forma segura.";
  }
  
  if (msg.includes('ine') || msg.includes('documento') || msg.includes('identificacion')) {
    return "El INE es el documento oficial que necesitamos para validar tu identidad y completar tu expediente legal.";
  }

  if (msg.includes('contrato') || msg.includes('firma')) {
    return "El contrato es el acuerdo legal que formaliza tu relación con nosotros. Es importante que lo leas y aceptes para continuar.";
  }

  if (msg.includes('banco')) {
    return "Necesitamos saber el nombre de tu banco para asegurar que la transferencia de tu CLABE se procese sin errores.";
  }

  if (msg.includes('seguridad') || msg.includes('privacidad') || msg.includes('datos')) {
    return "En el equipo de RH nos tomamos muy en serio tu privacidad. Tus datos están cifrados y solo se usan para fines de contratación.";
  }

  // Respuesta genérica de RH
  return "Gracias por tu mensaje. Como parte del equipo de RH, estoy aquí para guiarte. Por ahora, lo más importante es completar los datos solicitados para tu ingreso.";
}

module.exports = {
  getAIResponse
};
