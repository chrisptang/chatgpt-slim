import ChatView from '../views/ChatView.vue'
import DialoguesView from '../views/DialoguesView.vue'
import ConfigView from '../views/ConfigView.vue'

const routes = [
    { path: '/', component: ChatView, name: 'Home', isActive: true },
    { path: '/dialogues', component: DialoguesView, name: 'Dialogues', isActive: false },
    { path: '/config', component: ConfigView, name: 'Configs', isActive: false }
];

export default routes;