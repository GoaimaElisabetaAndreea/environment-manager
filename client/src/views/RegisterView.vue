<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');

const handleRegister = async () => {
    errorMessage.value = '';

    if (!email.value || !password.value) {
        errorMessage.value = "Please fill in all required fields.";
        return;
    }

    loading.value = true;
    try {
        await authStore.register(email.value, password.value);
        router.push('/');
    } catch (e) {
        errorMessage.value = "Registration failed: " + e.message;
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <v-container class="fill-height bg-grey-lighten-3" fluid>
        <v-row align="center" justify="center">
            <v-col cols="12" sm="8" md="4">
                <v-card class="elevation-12 rounded-lg">
                    <div class="bg-primary pa-4 text-center">
                         <v-icon size="48" color="white">mdi-account-plus</v-icon>
                         <h2 class="text-white text-h5 font-weight-bold mt-2">Create Account</h2>
                    </div>
                    
                    <v-card-text class="pt-6">
                        <v-form @submit.prevent="handleRegister">
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
                                hint="At least 6 characters"
                                :error-messages="errorMessage && !password ? 'Field required' : ''"
                            ></v-text-field>

                            <div v-if="errorMessage" class="text-red text-center mt-2 text-body-2 font-weight-medium">
                                <v-icon icon="mdi-alert-circle" size="small" class="mr-1"></v-icon>
                                {{ errorMessage }}
                            </div>

                            <v-btn 
                                block 
                                color="primary" 
                                size="large" 
                                class="mt-6 font-weight-bold" 
                                @click="handleRegister" 
                                :loading="loading"
                                elevation="2"
                            >
                                Register
                            </v-btn>
                        </v-form>

                        <div class="text-center mt-6">
                            <span class="text-grey-darken-1 text-body-2">Already have an account? </span>
                            <router-link 
                                to="/login" 
                                class="text-primary text-decoration-none font-weight-bold text-body-2"
                            >
                                Login here
                            </router-link>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>