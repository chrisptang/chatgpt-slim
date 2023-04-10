import axios from 'axios';

const client = axios.create({
    baseURL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8081/api',
    json: true
})

export default {
    async execute(method, resource, data) {
        // inject the accessToken for each request
        return client({
            method,
            url: resource,
            data
        }).then(req => {
            return req.data;
        }).catch(err => {
            console.error(err);
        })
    },
    listChats(chat_count = 5) {
        return this.execute('get', `/chats?size=${chat_count}`)
    },
    listChat(id) {
        return this.execute('get', `/chats/${id}`)
    },
    newChat(propmt, refer_previous = false) {
        return this.execute('post', '/newChat', { propmt: propmt, refer_previous: refer_previous });
    },
    listDialogues(size = 5) {
        return this.execute('get', `/dialogues?size=${size}`)
    },
    listDialogue(id) {
        return this.execute('get', `/dialogues/${id}`)
    },
    completeDialogue(data, max_messages = 20) {
        //for existing dialogue: {id:123, messages:[{role:'user', content:'how are you'},{role:'assistant',content:'Hi, Iam ChatGPT!'}]}
        //for new dialogue: {messages:[{role:'user', content:'how are you'}]}
        data.max_messages = max_messages;
        return this.execute('post', '/dialogues', data);
    }
}