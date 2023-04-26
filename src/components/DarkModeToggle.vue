<template>
    <div style="display: flex;place-items: center;padding-left: 10px;">
        <a href="#" @click="toggleMode">{{ mode === 'dark' ? 'light' : 'dark' }} mode</a>
    </div>
</template>
  
<script>
export default {
    data() {
        return {
            mode: 'light',
        };
    },
    methods: {
        toggleMode() {
            this.mode = this.mode === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', this.mode);
        },
    },
    mounted() {
        const savedMode = localStorage.getItem('mode');
        if (savedMode) {
            this.mode = savedMode;
            document.documentElement.setAttribute('data-theme', this.mode);
        } else {
            const userPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (userPrefersDark) {
                this.mode = 'dark';
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        }
    },
    watch: {
        mode(newMode) {
            localStorage.setItem('mode', newMode);
        },
    },
};
</script>
  