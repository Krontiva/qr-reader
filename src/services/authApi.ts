import axios, { type AxiosInstance } from 'axios';

// Configuration for Authentication API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_DELIKA_API_BASE_URL;
const XANO_AUTH_TOKEN = import.meta.env.VITE_XANO_AUTH_TOKEN;
const SIGN_IN_ENDPOINT = import.meta.env.VITE_SIGN_IN_ENDPOINT ;
const SEND_OTP_ENDPOINT = import.meta.env.VITE_SEND_OTP_ENDPOINT;
const VERIFY_OTP_ENDPOINT = import.meta.env.VITE_VERIFY_OTP_ENDPOINT ;
const AUTH_ME_ENDPOINT = import.meta.env.VITE_AUTH_ME_ENDPOINT ;

export interface LoginResponse {
  authToken: string;
  delika_onboarding_id: string;
  role?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SendOTPRequest {
  email: string;
}

export interface VerifyOTPResponse {
  otpValidate: string;
}

export interface UserData {
  id: string;
  created_at?: string | number;
  email: string;
  password?: string;
  OTP?: string;
  phoneNumber?: string;
  role?: string;
  [key: string]: any;
}

class AuthApiService {
  private api: AxiosInstance;

  constructor() {
    if (!API_BASE_URL) {
      throw new Error('VITE_API_BASE_URL or VITE_DELIKA_API_BASE_URL is not defined in environment variables');
    }

    if (!XANO_AUTH_TOKEN) {
      throw new Error('VITE_XANO_AUTH_TOKEN is not defined in environment variables');
    }

    // Use proxy in development to avoid CORS issues, direct URL in production
    const isDevelopment = import.meta.env.DEV;
    const baseURL = isDevelopment 
      ? '/api/api:uEBBwbSs'  // Use proxy in dev (will be rewritten to /api:uEBBwbSs)
      : API_BASE_URL;         // Use direct URL in production

    

    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': XANO_AUTH_TOKEN,
      },
    });
  }

  /**
   * Step 1: User Login
   * POST /auth/login
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      if (!SIGN_IN_ENDPOINT) {
        throw new Error('VITE_SIGN_IN_ENDPOINT is not defined in environment variables');
      }


      const response = await this.api.post<LoginResponse>(SIGN_IN_ENDPOINT, credentials);
      return response.data;
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });

      // Provide more specific error messages
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection or CORS settings.');
      }
      
      if (error.response?.status === 405) {
        throw new Error(`Method not allowed: The endpoint ${SIGN_IN_ENDPOINT} may not accept POST requests. Please check the endpoint configuration.`);
      }

      if (error.response?.status === 404) {
        throw new Error(`Endpoint not found: ${SIGN_IN_ENDPOINT}. Please verify the endpoint path in your .env file.`);
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(error.response?.data?.message || 'Invalid credentials. Please check your email and password.');
      }

      throw new Error(error.response?.data?.message || error.message || 'Login failed. Please check your credentials.');
    }
  }

  /**
   * Step 2: Send OTP
   * POST /auth/send-otp
   */
  async sendOTP(email: string): Promise<void> {
    try {
      await this.api.post(SEND_OTP_ENDPOINT, { email });
    } catch (error: any) {
      console.error('Send OTP error:', error);
      throw new Error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    }
  }

  /**
   * Step 3: Verify OTP
   * GET /auth/verify-otp?email=...&otp=...
   */
  async verifyOTP(email: string, otp: string): Promise<VerifyOTPResponse> {
    try {
      const response = await this.api.get<VerifyOTPResponse>(
        `${VERIFY_OTP_ENDPOINT}?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      throw new Error(error.response?.data?.message || 'Invalid OTP code. Please try again.');
    }
  }

  /**
   * Step 4: Get User Profile
   * GET /auth/me
   * Uses user's authToken (not service token)
   */
  async getUserProfile(authToken: string): Promise<UserData> {
    try {
      if (!AUTH_ME_ENDPOINT) {
        throw new Error('VITE_AUTH_ME_ENDPOINT is not defined in environment variables');
      }

      if (!authToken) {
        throw new Error('Auth token is required to fetch user profile');
      }

      const isDevelopment = import.meta.env.DEV;
      const baseURL = isDevelopment 
        ? '/api/api:uEBBwbSs'  // Use proxy in dev
        : API_BASE_URL;         // Use direct URL in production

      const url = `${baseURL}${AUTH_ME_ENDPOINT}`;
      
      console.log('Fetching user profile:', {
        url,
        endpoint: AUTH_ME_ENDPOINT,
        hasToken: !!authToken,
        tokenLength: authToken?.length,
      });

      const response = await axios.get<UserData>(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Xano-Authorization': authToken,
          'X-Xano-Authorization-Only': 'true',
        },
      });
      
      console.log('User profile fetched successfully:', response.data);
      return response.data;
    } catch (error: any) {
      // Provide more specific error messages
      if (error.response?.status === 404) {
        // Suppress 404 errors - endpoint may not exist yet
        const notFoundError = new Error(`Endpoint not found: ${AUTH_ME_ENDPOINT}. This endpoint may not be available yet on the API server.`);
        (notFoundError as any).is404 = true;
        // Don't log 404 errors to console - they're expected if endpoint doesn't exist
        throw notFoundError;
      }

      // Only log non-404 errors
      console.error('Get user profile error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Authentication failed. Please login again.');
      }

      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch user profile.');
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const authToken = localStorage.getItem('authToken');
    return !!authToken;
  }

  /**
   * Get stored auth token
   */
  getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Logout - clear all auth data
   */
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('delikaOnboardingId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    window.dispatchEvent(new Event('authStateChange'));
  }
}

export const authApi = new AuthApiService();

