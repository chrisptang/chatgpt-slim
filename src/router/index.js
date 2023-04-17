import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './router-config.js'

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router