import WahaService from './services/waha.service.js'; // Asegúrate que la ruta a waha.service.js sea correcta

async function verificarSesionSuperDetallado() {
  const sessionName = 'serconsciente';
  console.log(`🔎 Verificando el estado SÚPER DETALLADO de la sesión: "${sessionName}"...\n`);

  try {
    const sessionInfo = await WahaService.getSession(sessionName);

    // Log completo para cualquier revisión futura (ya lo vimos, pero lo dejamos por si acaso)
    console.log("🐶 Información completa de WAHA sobre la sesión (para referencia):");
    console.log("=================================================================");
    console.dir(sessionInfo, { depth: null, colors: true });
    console.log("=================================================================\n");

    console.log("--- Análisis de los Detalles Clave (extracto del log de arriba) ---");
    console.log(`-> Estado GENERAL reportado por WAHA (sessionInfo.status): "${sessionInfo?.status}"`);
    console.log(`-> Estado del MOTOR INTERNO (sessionInfo.engine.state): "${sessionInfo?.engine?.state}"`);
    console.log("-> Contenido de sessionInfo.me (info del usuario):");
    console.dir(sessionInfo?.me, { depth: null, colors: true });
    console.log("------------------------------------------------------------------\n");


    console.log("--- Resultados de la Verificación (ahora considerando tu caso específico) ---");

    if (sessionInfo && sessionInfo.name === sessionName) {
      console.log(`[✓] Sesión "${sessionName}" encontrada en el servidor WAHA.`);

      const isMePopulated = sessionInfo.me && typeof sessionInfo.me === 'object' && sessionInfo.me.id;
      const isEngineConnected = sessionInfo.engine && sessionInfo.engine.state === 'CONNECTED';

      // Condición 1: El estado general es 'CONNECTED' y tenemos info de usuario
      if (sessionInfo.status === 'CONNECTED' && isMePopulated) {
        console.log(`[✓] Estado general de la sesión: CONNECTED.`);
        console.log(`[✓] Información del usuario ('me') recibida correctamente:`);
        console.log(`    🆔 ID de Usuario: ${sessionInfo.me.id}`);
        if (sessionInfo.me.pushname) {
          console.log(`    📛 Nombre (pushname): ${sessionInfo.me.pushname}`);
        }
        console.log("\n🎉 ¡A huevo, papito! La sesión '" + sessionName + "' está CONNECTED y con datos de usuario. ¡Funcionando a la perfección, modo clásico!");

      // Condición 2: El estado general es 'WORKING', PERO el motor interno está 'CONNECTED' y tenemos info de usuario
      } else if (sessionInfo.status === 'WORKING' && isMePopulated && isEngineConnected) {
        console.log(`[✓] Estado general de la sesión: WORKING.`);
        console.log(`[✓] ¡PERO OJO! Estado del motor interno (engine.state): CONNECTED.`);
        console.log(`[✓] Información del usuario ('me') recibida correctamente:`);
        console.log(`    🆔 ID de Usuario: ${sessionInfo.me.id}`);
        if (sessionInfo.me.pushname) {
          console.log(`    📛 Nombre (pushname): ${sessionInfo.me.pushname}`);
        }
        console.log("\n🎉 ¡A huevo, papito! La sesión '" + sessionName + "' está en 'WORKING', pero con el motor INTERNO CONECTADO y tus datos de usuario presentes. ¡Para tu WAHA, esto significa que está funcionando a la perfección!");

      } else {
        // Si no cumple ninguna de las dos condiciones de "perfecto"
        console.log(`[✗] La sesión NO está en un estado óptimo conocido.`);
        console.log(`   Estado General: "${sessionInfo.status}"`);
        if (!isMePopulated) {
            console.log(`   [ 문제입니다 ] Información del usuario ('me') NO está completa o es inválida. Objeto 'me':`, sessionInfo.me);
        }
        if (!isEngineConnected) { // Si el motor no está conectado, es un problema
            console.log(`   [ 문제입니다 ] El motor interno (engine.state) NO está 'CONNECTED'. Estado actual del motor: "${sessionInfo.engine?.state}"`);
        } else if (sessionInfo.status === 'WORKING' && !isMePopulated) { // WORKING pero sin 'me'
             console.log(`   [ 문제입니다 ] Estado 'WORKING' pero SIN datos de usuario. No está lista.`);
        }

        console.log("\n❌ La sesión '" + sessionName + "' NO cumple todos los criterios para estar 'funcionando a la perfección'. Revisa los detalles de arriba.");
        if (sessionInfo.status === 'SCAN_QR_CODE') {
          console.log("   Adicionalmente: Parece que necesitas escanear el código QR para esta sesión.");
        }
      }
    } else {
      console.log(`[✗] La sesión recuperada no coincide con "${sessionName}" o la respuesta de WAHA es inesperada (revisar el log completo de WAHA arriba).`);
      console.log("\n❌ No se pudo verificar la sesión correctamente.");
    }

  } catch (error) {
    console.error(`\n❌ ¡Valió madres! Error al intentar verificar la sesión "${sessionName}":`);
    if (error.response && error.response.data) {
      console.error("   Mensaje del servidor WAHA:", error.response.data.message || JSON.stringify(error.response.data));
      console.error("   Código de estado HTTP:", error.response.status);
    } else {
      console.error("   Mensaje de error:", error.message);
    }
    console.log("\n🤔 Asegúrate de que el servidor WAHA esté corriendo, que tu API Key sea la correcta (si la usas en WahaService),");
    console.log("   y que la sesión '" + sessionName + "' realmente exista y esté iniciada.");
  }
}

verificarSesionSuperDetallado();
