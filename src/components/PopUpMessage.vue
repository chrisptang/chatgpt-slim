<template>
    <div v-if="state.show" class="popup-message">
        <h4>{{ state.message }}</h4>
        <span>... {{ state.countingDown }}s</span>
    </div>
</template>
  
<script>
import { reactive } from 'vue'

export default {
    name: "popUpMessage",
    setup() {
        const state = reactive({
            show: false,
            message: 'just for demo',
            countingDown: 0,
            intervalId: 0
        })

        const showMessage = (message, seconds = 3) => {
            state.message = message;
            state.show = true;
            state.countingDown = seconds;
            setTimeout(() => {
                state.show = false;
                state.message = "";
                window.clearInterval(state.intervalId);
            }, 1000 * seconds)
            state.intervalId = setInterval(() => {
                state.countingDown = Math.max(0, state.countingDown - 1);
            }, 1000);
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
    top: 15%;
    left: 50%;
    transform: translateX(-50%);
    background-color: #fff;
    padding: 10px 30px;
    border-radius: 15px;
    box-shadow: 10px 10px 30px hsla(160, 100%, 30%, 0.8);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: baseline;
    max-width: 35vw;
    min-width: 15vw;
    word-wrap: break-word;
}
</style>