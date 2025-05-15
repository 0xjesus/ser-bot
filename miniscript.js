// verify-schema.js
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function verifySchema() {
  try {
    console.log('🔍 Verificando el esquema de la base de datos...');

    // 1. Intentar consultar la tabla Service (esto debería fallar si la tabla no existe)
    try {
      // Intentamos hacer una consulta raw a la tabla Service
      const result = await prisma.$queryRaw`SHOW TABLES LIKE 'Service'`;
      if (result && result.length > 0) {
        console.log('⚠️ ERROR: La tabla Service todavía existe en la base de datos!');
      } else {
        console.log('✅ La tabla Service no existe en la base de datos.');
      }
    } catch (error) {
      console.log('✅ La tabla Service no existe, o hay un error al intentar consultarla:');
      console.log(error.message);
    }

    // 2. Mostrar todas las tablas disponibles
    const tables = await prisma.$queryRaw`SHOW TABLES`;
    console.log('\n📋 Tablas disponibles en la base de datos:');
    console.table(tables);

    // 3. Leer y mostrar el esquema de Prisma actual
    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    console.log('\n📝 Contenido actual del esquema Prisma:');
    console.log(schemaContent);

    // 4. Verificar el modelo Booking
    console.log('\n🔍 Consultando la estructura del modelo Booking:');
    try {
      // Intentamos obtener un booking (solo para verificar la estructura)
      const booking = await prisma.booking.findFirst({
        select: {
          id: true,
          contactId: true,
          dateTime: true,
          status: true,
          notes: true,
          paymentId: true,
          createdAt: true,
          updatedAt: true
        }
      });

      console.log('Estructura de un Booking:');
      console.log(booking ? Object.keys(booking) : 'No hay bookings disponibles');

      // Para verificar mejor la estructura exacta
      const bookingFields = await prisma.$queryRaw`DESCRIBE Booking`;
      console.log('\nDetalle de campos de la tabla Booking:');
      console.table(bookingFields);

    } catch (error) {
      console.log('Error al consultar Booking:', error.message);
    }

  } catch (error) {
    console.error('Error al verificar el esquema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySchema().then(() => {
  console.log('\n✅ Verificación completada');
});
