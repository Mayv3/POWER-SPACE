import express from 'express'
import {
  getEstadoCompetencia,
  updateDecisionJuez,
  startIntento,
  stopIntento
} from '../controllers/jueces.controller.js'

const router = express.Router()

router.get('/', getEstadoCompetencia)
router.put('/:juezId', updateDecisionJuez)
router.post('/start', startIntento)
router.post('/stop', stopIntento)

export default router
