import { Primate } from '@thewebchimp/primate';
import MainController from '../controllers/main.controller.js';

const router = Primate.getRouter();

router.post('/waha/webhook', MainController.processWebhook);

// Rutas de contactos
router.get('/admin/contacts', MainController.getAllContacts);

// Rutas de bookings (reservas)
router.get('/admin/bookings', MainController.getAllBookings);

// Ruta para descargar reportes en Excel
router.get('/admin/reports/download', MainController.downloadReport);

export { router };
