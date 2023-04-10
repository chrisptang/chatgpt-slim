import { createRouter, createWebHistory } from 'vue-router'
import ChatView from '../views/ChatView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'chats',
      component: ChatView
    },
    {
      path: '/dialogues',
      name: 'dialogues',
      component: () => import('../views/DialoguesView.vue')
    }
  ]
})

export default router
