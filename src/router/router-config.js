import ChatView from '../views/ChatView.vue'
import DialoguesView from '../views/DialoguesView.vue'

const routes = [
    { path: '/', component: ChatView, name: 'Home', isActive: false },
    { path: '/dialogues', component: DialoguesView, name: 'Dialogues', isActive: false }
];

export default routes;