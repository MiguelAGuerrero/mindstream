import { createRouter, createWebHistory } from "vue-router";
import DashboardPage from "../dashboard/DashboardPage.vue";
import ThinkPadLayout from "../thinkpad/ThinkPadLayout.vue";
import ThinkPadPage from "../thinkpad/ThinkPadPage.vue";
import FocusLayout from "../focus/FocusLayout.vue";
import FocusRunnerPage from "../focus/FocusRunnerPage.vue";
import WorkflowsPage from "../workflows/WorkflowsPage.vue";

const routes = [
  {
    path: "/",
    name: "home",
    component: DashboardPage,
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
  {
    path: "/workflows",
    name: "workflows",
    component: WorkflowsPage,
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
