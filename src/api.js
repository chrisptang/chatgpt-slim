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
            return req.data
        })
    },
    listChats() {
        return this.execute('get', `/chats`)
    },
    listChat(id) {
        return this.execute('get', `/chats/${id}`)
    },
    newChat(propmt) {
        return this.execute('post', '/newChat', { propmt: propmt });
    }
}