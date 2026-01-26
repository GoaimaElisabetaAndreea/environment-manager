import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSnackbarStore = defineStore('snackbar', () => {
    const show = ref(false);
    const message = ref('');
    const color = ref('success'); 
    const timeout = ref(3000);

    function showMessage(msg, type = 'success', duration = 3000) {
        message.value = msg;
        color.value = type;
        timeout.value = duration;
        show.value = true;
    }

    function showSuccess(msg) {
        showMessage(msg, 'success');
    }

    function showError(msg) {
        showMessage(msg, 'error', 5000); 
    }

    function showInfo(msg) {
        showMessage(msg, 'info');
    }

    return { show, message, color, timeout, showMessage, showSuccess, showError, showInfo };
});