import { Primate } from '@thewebchimp/primate';
import MainController from '../controllers/main.controller.js';

const router = Primate.getRouter();


router.post('/waha/webhook', MainController.processWebhook);


export { router };
