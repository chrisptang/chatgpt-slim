<template>
    <div>
        <ul>
            <li v-for="conf in config_list" :key="conf.config_name" class="single-conf">
                <b class="config-name">{{ conf.config_name }}</b>
                <input type="text" class="config-value" v-model="conf.config_value" />
                <button class="save-config new-chat-btn" @click="update(conf.config_name, conf.config_value)">Save</button>
            </li>
        </ul>
    </div>
</template>
  
<script>
import api from "@/api";
export default {
    name: 'UserInfo',
    data() {
        return {
            config_list: []
        };
    },
    async created() {
        this.config_list = await api.listConfigs();
    },
    methods: {
        async update(name, value) {
            await api.updateConfig(name, value);
            this.config_list = await api.listConfigs();
        }
    }
};
</script>
<style scoped>
.config-name {
    display: inline-block;
    min-width: 200px;
}

.config-value {
    margin-left: 20px;
    padding: 10px 20px;
    margin: 5px 0;
    min-width: 30vw;
}

.save-config {
    display: none;
    margin-left: 20px;
}

.single-conf:hover .save-config {
    display: inline-block;
}
</style>