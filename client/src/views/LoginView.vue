<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { useSnackbarStore } from '@/stores/snackbar';

const snackbar = useSnackbarStore();
const authStore = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const rememberMe = ref(true);
const loading = ref(false);
const errorMessage = ref('');

const showResetDialog = ref(false);
const resetEmail = ref('');
const resetLoading = ref(false);

const handleLogin = async () => {
    errorMessage.value = '';

    if (!email.value || !password.value) {
        errorMessage.value = "Please fill in all required fields.";
        return;
    }

    loading.value = true;
    try {
        await authStore.login(email.value, password.value, rememberMe.value);
        router.push('/');
    } catch (e) {
        errorMessage.value = "Failed login: " + e.message;
    } finally {
        loading.value = false;
    }
};

const openResetDialog = () => {
    resetEmail.value = email.value; 
    showResetDialog.value = true;
};

const handleResetPassword = async () => {
    if (!resetEmail.value) return;
    
    resetLoading.value = true;
    try {
        await authStore.resetPassword(resetEmail.value);
        snackbar.showInfo("Password reset email sent! Please check your inbox.");
        showResetDialog.value = false;
    } catch (e) {
        snackbar.showError("Error: " + e.message);
    } finally {
        resetLoading.value = false;
    }
};
</script>

<template>
    <v-container class="fill-height bg-grey-lighten-3" fluid>
        <v-row align="center" justify="center">
            <v-col cols="12" sm="8" md="4">
                <v-card class="elevation-12 rounded-lg">
                    <div class="bg-primary pa-4 text-center">
                         <v-icon size="48" color="white">mdi-shield-key</v-icon>
                         <h2 class="text-white text-h5 font-weight-bold mt-2">Welcome Back</h2>
                    </div>
                    
                    <v-card-text class="pt-6">
                        <v-form @submit.prevent="handleLogin">
                            <v-text-field
                                v-model="email"
                                label="Email Address"
                                prepend-inner-icon="mdi-email"
                                type="email"
                                variant="outlined"
                                density="comfortable"
                                color="primary"
                                :error-messages="errorMessage && !email ? 'Field required' : ''"
                            ></v-text-field>

                            <v-text-field
                                v-model="password"
                                label="Password"
                                prepend-inner-icon="mdi-lock"
                                type="password"
                                variant="outlined"
                                density="comfortable"
                                color="primary"
                                class="mt-2"
                                :error-messages="errorMessage && !password ? 'Field required' : ''"
                            ></v-text-field>

                            <div class="d-flex justify-space-between align-center mt-1">
                                <v-checkbox
                                    v-model="rememberMe"
                                    label="Remember me"
                                    color="primary"
                                    hide-details
                                    density="compact"
                                ></v-checkbox>
                                
                                <a 
                                    href="#" 
                                    class="text-caption text-primary text-decoration-none font-weight-bold"
                                    @click.prevent="openResetDialog"
                                >
                                    Forgot Password?
                                </a>
                            </div>

                            <div v-if="errorMessage" class="text-red text-center mt-2 text-body-2 font-weight-medium">
                                <v-icon icon="mdi-alert-circle" size="small" class="mr-1"></v-icon>
                                {{ errorMessage }}
                            </div>

                            <v-btn 
                                block 
                                color="primary" 
                                size="large" 
                                class="mt-6 font-weight-bold" 
                                @click="handleLogin" 
                                :loading="loading"
                                elevation="2"
                            >
                                Login
                            </v-btn>
                        </v-form>

                        <div class="text-center mt-6">
                            <span class="text-grey-darken-1 text-body-2">Don't have an account? </span>
                            <router-link 
                                to="/register" 
                                class="text-primary text-decoration-none font-weight-bold text-body-2"
                            >
                                Register here
                            </router-link>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-dialog v-model="showResetDialog" max-width="400">
            <v-card>
                <v-card-title class="bg-primary text-white">Reset Password</v-card-title>
                <v-card-text class="pt-4">
                    <p class="text-body-2 text-grey-darken-1 mb-4">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <v-text-field
                        v-model="resetEmail"
                        label="Email Address"
                        prepend-inner-icon="mdi-email"
                        variant="outlined"
                        autofocus
                    ></v-text-field>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn variant="text" @click="showResetDialog = false">Cancel</v-btn>
                    <v-btn 
                        color="primary" 
                        @click="handleResetPassword" 
                        :loading="resetLoading"
                        :disabled="!resetEmail"
                    >
                        Send Link
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>