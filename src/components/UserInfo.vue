<template>
    <div>
        <a :href="user.html_url" target="_blank">
            <img class="user-avatar" :src="user.avatar_url" />
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
            let user = await api.listUserInfo();
            user.avatar_url = user.avatar_url ? `${user.avatar_url}&s=80` : '';
            this.user = user;
            console.log(this.user)
        } catch (error) {
            console.error(error.message, error);
        }
    },
};
</script>
<style>
img.user-avatar {
    width: 32px;
    object-fit: contain;
    margin-right: 10px;
    display: inline-block;
    border-radius: 50%;
}
</style>