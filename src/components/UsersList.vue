<template>
    <div class="config-view">
        <table>
            <thead>
                <tr>
                    <th>Id</th>
                    <th>Name</th>
                    <th>Login Id</th>
                    <th>Is Admin</th>
                    <th>Is Eabled</th>
                    <th>Operate</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="user in user_list" :key="user.id">
                    <td>{{ user.id }}</td>
                    <td>{{ user.name }}</td>
                    <td>{{ user.login }}</td>
                    <td>{{ user.is_admin }}</td>
                    <td>{{ user.enable }}</td>
                    <td> <button class="save-config new-chat-btn" @click="enableUser(user.id, user.enable)">
                            <span v-text="user.enable == 'true' ? 'Disable' : 'Enable'"></span>
                        </button></td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
  
<script>
import api from "@/api";
export default {
    name: 'UserInfo',
    data() {
        return {
            user_list: []
        };
    },
    async created() {
        this.user_list = await api.listUsers();
    },
    methods: {
        async enableUser(id, enable) {
            
        }
    }
};
</script>
<style scoped>
.config-view {
    min-width: 70rem;
}

.config-view ul {
    list-style: none;
}

.config-name {
    display: inline-block;
    min-width: 300px;
    text-align: right;
    padding-right: 20px;
}

.config-value {
    margin-left: 20px;
    padding: 5px 20px;
    margin: 5px 0;
    min-width: 30vw;
}

.save-config {
    display: none;
    margin-left: 20px;
}

.single-conf:hover .save-config,
.add-new-config:hover .save-config {
    display: inline-block;
}
</style>