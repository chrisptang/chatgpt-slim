<template>
    <div v-if="state.show" class="popup-message">
        <h3>{{ state.message }}</h3>
        <i><img src="" /></i>
    </div>
</template>
  
<script>
import { reactive } from 'vue'

export default {
    name: "popUpMessage",
    setup() {
        const state = reactive({
            show: false,
            message: 'just for demo'
        })

        const showMessage = (message, seconds = 3) => {
            console.log("showing message:", message, this)
            state.message = message
            state.show = true
            setTimeout(() => {
                state.show = false;
                state.message = "";
            }, 1000 * seconds)
            console.log(state);
        }

        // expose showMessage function globally
        window.showMessage = showMessage.bind(this)

        return {
            state
        }
    }
}
</script>
  
<style scoped>
.popup-message {
    position: fixed;
    top: 5%;
    left: 50%;
    transform: translateX(-50%);
    background-color: #fff;
    padding: 10px 30px;
    border-radius: 5px;
    box-shadow: 5px 5px 10px hsla(160, 100%, 30%, 0.4);
    z-index: 1000;
    display: flex;
    max-width: 400px;
    word-wrap: break-word;
}
</style>