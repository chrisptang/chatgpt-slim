<script setup>
import UserInfo from './components/UserInfo.vue'
import PopUpMessage from './components/PopUpMessage.vue';
import routers from './router/router-config.js';
import DarkModeToggle from './components/DarkModeToggle.vue';

</script>

<template>
  <PopUpMessage />
  <div>
    <div class="header sticky-header">
      <div class="greetings">
        <h1 class="green">{{ "Chat with GPT-3.5" }}</h1>
      </div>
      <div class="header-links">
        <div class="route-item" v-for="route in routers">
          <router-link :key="route.name" :to="route.path" exact-active-class="selected">{{ route.name }}
          </router-link>
        </div>
      </div>
      <div class="user-info">
        <UserInfo />
        <DarkModeToggle />
      </div>
    </div>
    <div class="view-container">
      <router-view></router-view>
    </div>
  </div>
</template>

<style scoped>
.sticky-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
}

.route-item .selected {
  color: var(--color-list-item-selected);
  font-weight: bolder;
}

.view-container {
  margin-top: calc(4.5rem);
  display: flex;
  padding: 0;
  /* min-width: calc(100rem - var(--section-gap) / 4); */
}

.user-info {
  right: calc(var(--section-gap) / 4);
  position: absolute;
  bottom: calc(var(--section-gap) / 20);
  display: flex;
}

.header-links {
  display: flex;
  justify-content: start;
  /* min-width: 240px; */
}

.greetings h1 {
  text-align: center;
  padding-top: 0.5rem;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

.header {
  display: flex;
  align-items: baseline;
  padding: 0 calc(var(--section-gap) / 4);
  background-color: white;
}

@media(prefers-color-scheme: dark) {
  .header {
    background-color: var(--color-background);
  }
}

@media(max-width: 700px) {
  .header {
    flex-direction: column;
    padding-right: 0;
  }

  .header-links {
    width: 100%;
  }

  .header h1 {
    font-size: 1.5rem;
  }
}

@media (min-width: 1024px) {

  

  .greetings h1,
  .greetings h3 {
    text-align: left;
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
