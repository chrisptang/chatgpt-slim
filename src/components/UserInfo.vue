<template>
    <div>
        <a :href="user.html_url" target="_blank">
            <img class="user-info" :src="`${user.avatar_url}&s=80`" />
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
<style>
img.user-info {
    width: 32px;
    object-fit: contain;
    margin-right: 10px;
    display: inline-block;
    border-radius: 50%;
}
</style>