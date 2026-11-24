import { createRouter, createWebHistory } from "vue-router";
import DashboardPage from "../dashboard/DashboardPage.vue";
// Each tool loads only when opened (Phase 5: code-split the routes).
const ThinkPadLayout = () => import("../thinkpad/ThinkPadLayout.vue");
const ThinkPadPage = () => import("../thinkpad/ThinkPadPage.vue");
const FocusLayout = () => import("../focus/FocusLayout.vue");
const FocusRunnerPage = () => import("../focus/FocusRunnerPage.vue");
const WorkflowsPage = () => import("../workflows/WorkflowsPage.vue");

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
