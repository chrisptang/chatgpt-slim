<template>
    <div class="config-view">
        <ul>
            <li v-for="conf in config_list" :key="conf.config_name" class="single-conf">
                <b class="config-name">{{ conf.config_name }}</b>
                <input type="text" class="config-value" v-model="conf.config_value" />
                <button class="save-config new-chat-btn" @click="update(conf.config_name, conf.config_value)">Save</button>
            </li>
        </ul>
        <div class="add-new-config">
            <p>Add new config:</p>
            <p>
                <b class="config-name">Name:</b>
                <input type="text" class="config-value" v-model="conf.new_config_name" />
            </p>
            <p>
                <b class="config-name">Value:</b>
                <input type="text" class="config-value" v-model="conf.new_config_value" />
                <button class="save-config new-chat-btn"
                    @click="create(conf.new_config_name, conf.new_config_value)">Create</button>
            </p>
        </div>
    </div>
</template>
  
<script>
import api from "@/api";
export default {
    name: 'ConfigList',
    data() {
        return {
            config_list: [],
            conf: { new_config_name: null, new_config_value: null }
        };
    },
    async created() {
        this.config_list = await this.listAllConfig();
    },
    methods: {
        async listAllConfig() {
            let list = await api.listConfigs();
            if (list && list.length > 0) {
                list.sort((o1, o2) => { o1.id - o2.id });
                return list;
            }
            return [];
        },
        async update(name, value) {
            await api.updateConfig(name.toUpperCase(), value);
            this.config_list = await this.listAllConfig();
        },
        async create(name, value) {
            await api.updateConfig(name, value);
            this.config_list = await this.listAllConfig();
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