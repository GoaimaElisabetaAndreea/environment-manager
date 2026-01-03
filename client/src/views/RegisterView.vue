<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const errorMessage = ref('');

const authStore = useAuthStore();
const router = useRouter();

const handleRegister = async () => {
    if(password.value != confirmPassword.value){
        errorMessage.value = "Password and confirm password should have the same value";
        return;
    }

    loading.value = true;
    errorMessage.value = '';
    try{
        await authStore.register(email.value, password.value);
        router.push('/dashboard');
    } catch(error){
        if(error.code === 'auth/email-already-in-use'){
            errorMessage.value = "This email is taken";
        } else if(error.code === 'auth/weak-password'){
            errorMessage.value = "Password needs to have at least 6 characters";
        } else {
            errorMessage.value = "Registration failed";
        }
    } finally{
        loading.value = false;
    }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Create an account</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="handleRegister">
              <v-text-field
                v-model="email"
                label="Email"
                prepend-icon="mdi-email"
                type="email"
                required
              ></v-text-field>
              
              <v-text-field
                v-model="password"
                label="Password"
                prepend-icon="mdi-lock"
                type="password"
                required
              ></v-text-field>

              <v-text-field
                v-model="confirmPassword"
                label="Confirm Password"
                prepend-icon="mdi-lock-check"
                type="password"
                required
              ></v-text-field>
              
              <v-alert v-if="errorMessage" type="error" class="mb-3">
                {{ errorMessage }}
              </v-alert>

              <v-btn 
                type="submit" 
                color="primary" 
                block 
                :loading="loading"
              >
                SIGN UP
              </v-btn>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <span class="text-caption mr-2">Do you have an account already?</span>
            <v-btn variant="text" color="primary" to="/login">
              Login
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
