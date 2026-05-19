// Thin Chart.js wrapper. Expects `Chart` to be globally loaded via CDN.
import { onMounted, onBeforeUnmount, watch, ref } from 'vue';

export default {
  name: 'Chart',
  props: {
    type:    { type: String, default: 'line' },
    data:    { type: Object, required: true },
    options: { type: Object, default: () => ({}) },
    height:  { type: Number, default: 220 },
  },
  setup(props) {
    const canvasRef = ref(null);
    let chart = null;

    function build() {
      if (!canvasRef.value) return;
      if (chart) { chart.destroy(); chart = null; }
      // eslint-disable-next-line no-undef
      chart = new Chart(canvasRef.value.getContext('2d'), {
        type: props.type,
        data: props.data,
        options: { responsive: true, maintainAspectRatio: false, ...props.options },
      });
    }

    onMounted(build);
    onBeforeUnmount(() => { if (chart) chart.destroy(); });
    watch(() => [props.type, props.data, props.options], build, { deep: true });

    return { canvasRef };
  },
  template: `
    <div :style="{ height: height + 'px' }"><canvas ref="canvasRef"></canvas></div>
  `,
};
