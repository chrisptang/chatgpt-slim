import ChatView from '../views/ChatView.vue'
import DialoguesView from '../views/DialoguesView.vue'
import ConfigView from '../views/ConfigView.vue'
import UsersView from '../views/UsersView.vue'

const routes = [
    { path: '/', component: ChatView, name: 'Home', isActive: true },
    { path: '/dialogues', component: DialoguesView, name: 'Dialogues', isActive: false },
    { path: '/config', component: ConfigView, name: 'Configs', isActive: false },
    { path: '/users', component: UsersView, name: 'Users', isActive: false }
];

export default routes;