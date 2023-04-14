<template>
    <div>
        <a :href="user.html_url" target="_blank">
            <!-- <img style="width: 20px;object-fit: contain;" :src="user.avatar_url" :alt="user.name" /> -->
            <span>Hello, {{ user.login }}</span>
        </a>
    </div>
</template>
  
<script>
import api from "@/api";
export default {
    name: 'UserInfo',
    data() {
        return {
            user: {
                name: "",
                login: "",
                avatar_url: "",
                html_url: ""
            }
        };
    },
    async created() {
        try {
            this.user = await api.listUserInfo();
        } catch (error) {
            console.error(error.message, error);
        }
    },
};
</script>