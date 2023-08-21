<template>
    <div class="user-list-view">
        <table class="table table-striped table-bordered">
            <thead class="thead-light">
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
                    <td>
                        <button :disabled="user.is_admin == 'true'" class="new-chat-btn"
                            @click="enableUser(user.id, user.enable)">
                            <span v-text="user.enable == 'true' ? 'Disable' : 'Enable'"></span>
                        </button>
                        <button :disabled="user.is_admin == 'true'" class="new-chat-btn" @click="setAdAdmin(user.id)">
                            <span >Set as Admin</span>
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
  
<script>
import api from "@/api";
export default {
    name: 'UserListView',
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
.user-list-view {
    min-width: 70vw;
}

.user-list-view .new-chat-btn{
    margin-right: 1vw;
}
</style>