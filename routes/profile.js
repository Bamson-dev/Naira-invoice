const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

router.get('/', profileController.getProfile);
router.post('/', profileController.createOrUpdateProfile);
router.post('/upload-logo', profileController.uploadLogo);

module.exports = router;
