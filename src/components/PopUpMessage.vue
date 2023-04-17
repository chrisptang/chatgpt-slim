<template>
    <div v-if="show" class="popup-message">
        <h2>{{ message }}</h2>
        <i><img src="" /></i>
    </div>
</template>
  
<script>
import { reactive } from 'vue'

export default {
    setup() {
        const state = reactive({
            show: false,
            message: ''
        })

        const showMessage = (message) => {
            console.log("showing message:", message)
            state.message = message
            state.show = true
            setTimeout(() => {
                state.show = false
            }, 5000)
        }

        // expose showMessage function globally
        window.showMessage = showMessage

        return {
            show: state.show,
            message: state.message
        }
    }
}
</script>
  
<style scoped>
.popup-message {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #fff;
    padding: 10px;
    border-radius: 5px;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
}
</style>