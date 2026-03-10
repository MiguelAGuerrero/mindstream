<script setup>
import { ref, computed, watch } from "vue";
import { useTimer } from "./composables/useTimer";
import { useCycleList } from "@vueuse/core";
import Session from "./views/Session.vue";
import Home from "./views/Home.vue";
import WorkflowBuilder from "./views/WorkflowBuilder.vue";
import { playAudio } from "./utils/audioPool.js";
import { focusAudioEngine } from "./utils/focusAudioEngine.js";

const state = ref("home");
const { pause, resume, reset, value: timerValue } = useTimer(1000);

const defaultSessionConfig = () => ({
  timing: { durationSeconds: 0 },
  loop: false,
  audio: null,
});
const sessionConfig = ref(defaultSessionConfig());

watch(timerValue, () => {
  if (state.value !== "running") return;
  const { timing, loop } = sessionConfig.value;
  if (timing.durationSeconds > 0 && timerValue.value >= timing.durationSeconds) {
    if (loop) {
      go(0);
      reset();
    } else {
      const last = sessions.value[sessions.value.length - 1];
      if (last) last.end = new Date();
      reset();
      focusAudioEngine.stopSession();
      transitionTo("home");
    }
  }
});

// Workflows = templates (id, title, steps). No start/end.
const workflows = ref([
  {
    id: 1,
    title: "Software Iteration",
    steps: [
      { title: "Observe", description: "Observe one thing" },
      { title: "Reflect", description: "Reflect on what is wrong" },
      {
        title: "Plan",
        description: "Identify the root cause and a plan to fix it",
      },
    ],
  },
]);

// Sessions = runs on top of a workflow; track start/end and reference the workflow.
let nextSessionId = 1;
let nextWorkflowId = 2;
const sessions = ref([]);

const selectedWorkflowId = ref(workflows.value[0]?.id ?? null);
const steps = computed(() => {
  const w = workflows.value.find((w) => w.id === selectedWorkflowId.value);
  return w ? w.steps : [];
});
const {
  state: step,
  index: currentStepIndex,
  next,
  prev,
  go,
} = useCycleList(steps);

function handleEnter(e) {
  e.preventDefault();
  if (!e.key || e.key !== "Enter") return;
}

const addStep = () => {
  const w = workflows.value.find((w) => w.id === selectedWorkflowId.value);
  if (w) w.steps.push({ title: "" });
};

const startSession = () => {
  if (steps.value.length === 0) {
    return;
  }
  if (steps.value.some((s) => s.title === "")) {
    alert("Please fill in all steps");
    return;
  }
  const session = {
    id: nextSessionId++,
    workflowId: selectedWorkflowId.value,
    start: new Date(),
    end: null,
  };
  sessions.value = [...sessions.value, session];
  transitionTo("running");
  reset();
  resume();
  go(0);
  const audioCfg = sessionConfig.value.audio;
  focusAudioEngine.setConfig({
    enableBackgroundNoise: audioCfg?.enableBackgroundNoise ?? true,
    enableNudges: audioCfg?.enableNudges ?? true,
    nudgeIntervalMinutes: audioCfg?.nudgeIntervalMinutes ?? 20,
  });
  focusAudioEngine.startSession();
};

const pauseSession = () => {
  pause();
};

const validateSteps = () => {
  if (steps.value.length === 0) {
    return false;
  }
  if (steps.value.some((s) => s.title === "")) {
    return false;
  }
  return true;
};

const transitionTo = (newState) => {
  state.value = newState;
};

// Workflow (template) lookup
function getWorkflowById(workflowId) {
  return workflows.value.find((w) => w.id === workflowId) ?? null;
}

// Session duration (sessions have start/end and reference a workflow)
function getDuration(session) {
  const end = session.end ? new Date(session.end) : new Date();
  return (end.getTime() - new Date(session.start).getTime()) / 1000;
}

function getDurationFormatted(session) {
  const duration = getDuration(session);
  const m = Math.floor(duration / 60);
  return `${m}:${String(Math.floor(duration % 60)).padStart(2, "0")}`;
}

// Session
const timerFormatted = computed(() => {
  const s = timerValue.value;
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
});

function handleStep(stepFn) {
  reset();
  stepFn();
  playAudio("BELL_SFX");
  resume();
}

function handlePreviousStep() {
  handleStep(prev);
}

function handleNextStep() {
  if (currentStepIndex.value >= steps.value.length - 1) {
    if (sessionConfig.value.loop) {
      go(0);
      reset();
      return;
    }
    const last = sessions.value[sessions.value.length - 1];
    if (last) last.end = new Date();
    reset();
    transitionTo("home");
    return;
  }
  handleStep(next);
}

function handleStopSession() {
  const last = sessions.value[sessions.value.length - 1];
  if (last) last.end = new Date();
  reset();
  focusAudioEngine.stopSession();
  transitionTo("home");
}

const removeStep = (stepToRemove) => {
  const w = workflows.value.find((w) => w.id === selectedWorkflowId.value);
  if (w) w.steps = w.steps.filter((s) => s !== stepToRemove);
};

function onStartSession(config) {
  sessionConfig.value = config
    ? {
        timing: {
          durationSeconds: config.timing?.durationSeconds ?? 0,
        },
        loop: !!config.loop,
        audio: config.audio ?? null,
      }
    : defaultSessionConfig();
  startSession();
}

function startSessionWithWorkflow(workflowId) {
  selectedWorkflowId.value = workflowId;
  onStartSession(null);
}

function handleProblemSubmit(problem) {
  const trimmed = problem.trim();
  if (!trimmed) return;
  const existing = workflows.value.find(
    (w) => w.title.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) {
    selectedWorkflowId.value = existing.id;
  } else {
    const newWorkflow = {
      id: nextWorkflowId++,
      title: trimmed,
      steps: [{ title: "" }],
    };
    workflows.value = [...workflows.value, newWorkflow];
    selectedWorkflowId.value = newWorkflow.id;
  }
  transitionTo("creating-steps");
}

</script>

<template>
  <div class="container">
    <Home
      v-if="state === 'home'"
      :suggestions="workflows.map((w) => w.title)"
      @submit="handleProblemSubmit"
    />
    <WorkflowBuilder
      v-if="state === 'creating-steps'"
      :workflows="workflows"
      :sessions="sessions"
      :steps="steps"
      :get-workflow-by-id="getWorkflowById"
      :get-duration-formatted="getDurationFormatted"
      :validate-steps="validateSteps"
      :problem="getWorkflowById(selectedWorkflowId)?.title ?? ''"
      @add-step="addStep"
      @remove-step="removeStep"
      @start-session="onStartSession"
      @start-session-with-workflow="startSessionWithWorkflow"
      @enter="handleEnter"
    />
    <Session
      v-if="state === 'running'"
      :step-position="currentStepIndex + 1"
      :steps-length="steps.length"
      :step-title="step?.title ?? ''"
      :timer-formatted="timerFormatted"
      @prev="handlePreviousStep"
      @next="handleNextStep"
      @stop="handleStopSession"
    />
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  --color-primary: #1a1a1a;
  --color-accent: #7f7f7f;
  --color-text-primary: white;
  --color-text-secondary: #ddd;
  background-color: var(--color-primary);
  border-radius: 1rem;
  padding: 2rem;
}
</style>
