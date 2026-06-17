import { createRouter, createWebHistory } from "vue-router";
import Home from "../home/Home.vue";
import ThinkPadLayout from "../thinkpad/ThinkPadLayout.vue";
import ThinkPadPage from "../thinkpad/ThinkPadPage.vue";
import FocusLayout from "../focus/FocusLayout.vue";
import FocusRunnerPage from "../focus/FocusRunnerPage.vue";

const routes = [
  {
    path: "/",
    name: "home",
    component: Home,
  },
  {
    path: "/thinkpad",
    component: ThinkPadLayout,
    children: [{ path: "", name: "thinkpad", component: ThinkPadPage }],
  },
  {
    path: "/focus",
    component: FocusLayout,
    children: [{ path: "", name: "focus", component: FocusRunnerPage }],
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
